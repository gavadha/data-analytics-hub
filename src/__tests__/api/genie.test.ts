/**
 * @jest-environment node
 */

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(({ system }: { system: unknown }) => {
        const isSchemaCall =
          Array.isArray(system) &&
          (system[0] as { text?: string })?.text?.includes("CREATE TABLE");
        return Promise.resolve({
          content: [
            {
              type: "text",
              text: isSchemaCall
                ? "SELECT COUNT(*) as total_donors FROM donors"
                : "There are 1,200 donors in the database.",
            },
          ],
        });
      }),
    },
  })),
}));

jest.mock("better-sqlite3", () =>
  jest.fn().mockImplementation(() => ({
    pragma: jest.fn(),
    exec: jest.fn(),
    prepare: jest.fn().mockReturnValue({
      all: jest.fn().mockReturnValue([{ total_donors: 1200 }]),
      run: jest.fn(),
    }),
    close: jest.fn(),
  }))
);

import { POST } from "@/app/api/genie/route";
import { NextRequest } from "next/server";

// SQL guard is tested directly — no mocking needed
import { isSelectQuery } from "@/lib/sqlGuard";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/genie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("isSelectQuery — SQL guard", () => {
  it("allows SELECT statements", () => {
    expect(isSelectQuery("SELECT * FROM donors")).toBe(true);
    expect(isSelectQuery("  select count(*) from payments  ")).toBe(true);
    expect(isSelectQuery("SELECT\nid, amount\nFROM payments")).toBe(true);
  });

  it("blocks non-SELECT statements", () => {
    expect(isSelectQuery("DROP TABLE donors;")).toBe(false);
    expect(isSelectQuery("DELETE FROM payments WHERE 1=1;")).toBe(false);
    expect(isSelectQuery("INSERT INTO donors VALUES (1,'CA')")).toBe(false);
    expect(isSelectQuery("UPDATE donors SET state='TX'")).toBe(false);
    expect(isSelectQuery("")).toBe(false);
  });
});

describe("POST /api/genie — input validation", () => {
  it("returns 400 when question is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  it("returns 400 when question is empty string", async () => {
    const res = await POST(makeRequest({ question: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when question exceeds 500 characters", async () => {
    const res = await POST(makeRequest({ question: "a".repeat(501) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/500/);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/genie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("accepts a question at exactly 500 characters", async () => {
    const res = await POST(makeRequest({ question: "a".repeat(500) }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/genie — successful response", () => {
  it("returns a valid response shape", async () => {
    const res = await POST(makeRequest({ question: "How many donors do we have?" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.question).toBe("How many donors do we have?");
    expect(data.answer).toBeTruthy();
    expect(data.source).toBeTruthy();
    expect(["high", "medium", "low"]).toContain(data.confidence);
    expect(data.generatedSql).toBeTruthy();
  });

  it("echoes back the original question", async () => {
    const question = "What is the refund rate this month?";
    const data = await (await POST(makeRequest({ question }))).json();
    expect(data.question).toBe(question);
  });

  it("includes a SELECT query in generatedSql", async () => {
    const data = await (await POST(makeRequest({ question: "How many donors?" }))).json();
    expect(data.generatedSql).toMatch(/SELECT/i);
  });

  it("confidence is high when query returns results", async () => {
    const data = await (await POST(makeRequest({ question: "How many donors?" }))).json();
    expect(data.confidence).toBe("high");
  });
});
