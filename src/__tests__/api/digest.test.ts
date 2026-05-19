/**
 * @jest-environment node
 */

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        stop_reason: "end_turn",
        content: [
          {
            type: "text",
            text: "**Headline:** Strong week for Data with 97.6% pipeline success rate.\n\n**Key Numbers**\n- Pipeline success rate: 97.6%\n- OKRs on track: 3/4",
          },
        ],
      }),
    },
  })),
}));

jest.mock("@/lib/agentTools", () => ({
  executeTool: jest.fn().mockReturnValue({ on_track: 3, at_risk: 1, off_track: 0, items: [] }),
  AGENT_TOOLS: [
    { name: "query_okrs_by_department", description: "test", input_schema: { type: "object", properties: { department: { type: "string" } }, required: ["department"] } },
  ],
  DEPARTMENT_OKR_MAP: { data: "Data" },
}));

import { POST } from "@/app/api/agent/digest/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/agent/digest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function collectStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    output += decoder.decode(value);
  }
  return output;
}

describe("POST /api/agent/digest — input validation", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/agent/digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when department is missing", async () => {
    const res = await POST(makeRequest({ slug: "data" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makeRequest({ department: "Data" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when both fields are missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/agent/digest — streaming response", () => {
  it("returns a text/event-stream response", async () => {
    const res = await POST(makeRequest({ department: "Data", slug: "data" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("streams SSE events including status, text, and done", async () => {
    const res = await POST(makeRequest({ department: "Data", slug: "data" }));
    const output = await collectStream(res);

    const events = output
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice(6)));

    const types = events.map((e) => e.type);
    expect(types).toContain("status");
    expect(types).toContain("text");
    expect(types).toContain("done");
  });

  it("text events contain non-empty text", async () => {
    const res = await POST(makeRequest({ department: "Data", slug: "data" }));
    const output = await collectStream(res);

    const textEvents = output
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice(6)))
      .filter((e) => e.type === "text");

    const fullText = textEvents.map((e) => e.text).join("");
    expect(fullText.length).toBeGreaterThan(10);
  });
});
