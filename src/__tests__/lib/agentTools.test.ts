/**
 * @jest-environment node
 */

jest.mock("better-sqlite3", () =>
  jest.fn().mockImplementation(() => ({
    pragma: jest.fn(),
    exec: jest.fn(),
    prepare: jest.fn().mockImplementation((sql: string) => ({
      get: jest.fn().mockReturnValue(
        sql.includes("payments")
          ? { total_transactions: 120, total_amount: 8400.0, avg_gift: 70.0, refund_rate: 1.8, recurring_pct: 34.5 }
          : sql.includes("support_tickets")
          ? { total_tickets: 85, resolved: 78, open: 5, escalated: 2, avg_csat: 4.3, avg_resolution_hours: 4.2 }
          : sql.includes("COUNT") && sql.includes("pipeline")
          ? { total_runs: 42, success_rate: 97.6 }
          : { on_track: 3, at_risk: 1, off_track: 0 }
      ),
      all: jest.fn().mockReturnValue(
        sql.includes("DISTINCT pipeline_name")
          ? [{ pipeline_name: "donations_daily_agg" }]
          : [{ key_result: "Achieve 99.9% uptime", progress: 88, status: "on-track" }]
      ),
    })),
  }))
);

import {
  queryPaymentsSummary,
  queryTicketsSummary,
  queryPipelinesSummary,
  queryOkrsByDepartment,
  executeTool,
  DEPARTMENT_OKR_MAP,
  AGENT_TOOLS,
} from "@/lib/agentTools";

describe("queryPaymentsSummary", () => {
  it("returns a summary with all required fields", () => {
    const result = queryPaymentsSummary(7);
    expect(result).toHaveProperty("total_transactions");
    expect(result).toHaveProperty("total_amount");
    expect(result).toHaveProperty("avg_gift");
    expect(result).toHaveProperty("refund_rate");
    expect(result).toHaveProperty("recurring_pct");
  });

  it("returns numeric values", () => {
    const result = queryPaymentsSummary(7);
    expect(typeof result.total_transactions).toBe("number");
    expect(typeof result.refund_rate).toBe("number");
  });
});

describe("queryTicketsSummary", () => {
  it("returns a summary with all required fields", () => {
    const result = queryTicketsSummary(7);
    expect(result).toHaveProperty("total_tickets");
    expect(result).toHaveProperty("resolved");
    expect(result).toHaveProperty("open");
    expect(result).toHaveProperty("escalated");
    expect(result).toHaveProperty("avg_csat");
    expect(result).toHaveProperty("avg_resolution_hours");
  });
});

describe("queryPipelinesSummary", () => {
  it("returns summary with failed_pipelines array", () => {
    const result = queryPipelinesSummary(7);
    expect(result).toHaveProperty("total_runs");
    expect(result).toHaveProperty("success_rate");
    expect(Array.isArray(result.failed_pipelines)).toBe(true);
  });

  it("includes pipeline names in failed_pipelines", () => {
    const result = queryPipelinesSummary(7);
    expect(result.failed_pipelines).toContain("donations_daily_agg");
  });
});

describe("queryOkrsByDepartment", () => {
  it("returns OKR counts and items", () => {
    const result = queryOkrsByDepartment("Data");
    expect(result.department).toBe("Data");
    expect(result).toHaveProperty("on_track");
    expect(result).toHaveProperty("at_risk");
    expect(result).toHaveProperty("off_track");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("items have key_result, progress, and status", () => {
    const result = queryOkrsByDepartment("Data");
    result.items.forEach((item) => {
      expect(item).toHaveProperty("key_result");
      expect(item).toHaveProperty("progress");
      expect(item).toHaveProperty("status");
    });
  });
});

describe("executeTool", () => {
  it("routes query_payments_summary correctly", () => {
    const result = executeTool("query_payments_summary", { days: 7 });
    expect(result).toHaveProperty("total_transactions");
  });

  it("routes query_tickets_summary correctly", () => {
    const result = executeTool("query_tickets_summary", { days: 7 });
    expect(result).toHaveProperty("total_tickets");
  });

  it("routes query_pipelines_summary correctly", () => {
    const result = executeTool("query_pipelines_summary", { days: 7 });
    expect(result).toHaveProperty("failed_pipelines");
  });

  it("routes query_okrs_by_department correctly", () => {
    const result = executeTool("query_okrs_by_department", { department: "Data" });
    expect(result).toHaveProperty("on_track");
  });

  it("throws for unknown tool", () => {
    expect(() => executeTool("drop_table", { table: "donors" })).toThrow("Unknown tool");
  });
});

describe("DEPARTMENT_OKR_MAP", () => {
  it("maps all 6 department slugs", () => {
    const slugs = ["legal", "customer-support", "office-of-chief-of-staff", "product", "platform", "data"];
    slugs.forEach((slug) => {
      expect(DEPARTMENT_OKR_MAP[slug]).toBeTruthy();
    });
  });
});

describe("AGENT_TOOLS", () => {
  it("defines 4 tools", () => {
    expect(AGENT_TOOLS).toHaveLength(4);
  });

  it("each tool has name, description, and input_schema", () => {
    AGENT_TOOLS.forEach((tool) => {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeTruthy();
    });
  });

  it("tool names match executeTool routing", () => {
    const names = AGENT_TOOLS.map((t) => t.name);
    expect(names).toContain("query_payments_summary");
    expect(names).toContain("query_tickets_summary");
    expect(names).toContain("query_pipelines_summary");
    expect(names).toContain("query_okrs_by_department");
  });
});
