import { getDb, initSchema } from "./db";

export interface PaymentsSummary {
  total_transactions: number;
  total_amount: number;
  avg_gift: number;
  refund_rate: number;
  recurring_pct: number;
}

export interface TicketsSummary {
  total_tickets: number;
  resolved: number;
  open: number;
  escalated: number;
  avg_csat: number;
  avg_resolution_hours: number;
}

export interface PipelinesSummary {
  total_runs: number;
  success_rate: number;
  failed_pipelines: string[];
}

export interface OkrsSummary {
  department: string;
  on_track: number;
  at_risk: number;
  off_track: number;
  items: Array<{ key_result: string; progress: number; status: string }>;
}

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export function queryPaymentsSummary(days: number): PaymentsSummary {
  initSchema();
  const db = getDb();
  const since = daysAgoDate(days);
  return db.prepare(`
    SELECT
      COUNT(*) as total_transactions,
      ROUND(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END), 2) as total_amount,
      ROUND(AVG(CASE WHEN status='completed' THEN amount END), 2) as avg_gift,
      ROUND(100.0 * SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) /
        NULLIF(SUM(CASE WHEN status IN ('completed','refunded') THEN 1 ELSE 0 END), 0), 2) as refund_rate,
      ROUND(100.0 * SUM(CASE WHEN type='recurring' THEN 1 ELSE 0 END) / COUNT(*), 2) as recurring_pct
    FROM payments WHERE date >= ?
  `).get(since) as PaymentsSummary;
}

export function queryTicketsSummary(days: number): TicketsSummary {
  initSchema();
  const db = getDb();
  const since = daysAgoDate(days);
  return db.prepare(`
    SELECT
      COUNT(*) as total_tickets,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status='escalated' THEN 1 ELSE 0 END) as escalated,
      ROUND(AVG(CASE WHEN csat IS NOT NULL THEN csat END), 2) as avg_csat,
      ROUND(AVG(CASE WHEN resolved_at IS NOT NULL
        THEN (julianday(resolved_at) - julianday(created_at)) * 24 END), 2) as avg_resolution_hours
    FROM support_tickets WHERE created_at >= ?
  `).get(since) as TicketsSummary;
}

export function queryPipelinesSummary(days: number): PipelinesSummary {
  initSchema();
  const db = getDb();
  const since = daysAgoDate(days);

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_runs,
      ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
    FROM pipeline_runs WHERE run_date >= ?
  `).get(since) as { total_runs: number; success_rate: number };

  const failures = db.prepare(`
    SELECT DISTINCT pipeline_name FROM pipeline_runs
    WHERE run_date >= ? AND status = 'failed'
  `).all(since) as { pipeline_name: string }[];

  return { ...summary, failed_pipelines: failures.map((f) => f.pipeline_name) };
}

export function queryOkrsByDepartment(department: string): OkrsSummary {
  initSchema();
  const db = getDb();

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status='on-track' THEN 1 ELSE 0 END) as on_track,
      SUM(CASE WHEN status='at-risk' THEN 1 ELSE 0 END) as at_risk,
      SUM(CASE WHEN status='off-track' THEN 1 ELSE 0 END) as off_track
    FROM okrs WHERE department = ?
  `).get(department) as { on_track: number; at_risk: number; off_track: number };

  const items = db.prepare(`
    SELECT key_result, ROUND(progress * 100) as progress, status
    FROM okrs WHERE department = ? ORDER BY status DESC
  `).all(department) as Array<{ key_result: string; progress: number; status: string }>;

  return { department, ...counts, items };
}

export function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "query_payments_summary":
      return queryPaymentsSummary(input.days as number);
    case "query_tickets_summary":
      return queryTicketsSummary(input.days as number);
    case "query_pipelines_summary":
      return queryPipelinesSummary(input.days as number);
    case "query_okrs_by_department":
      return queryOkrsByDepartment(input.department as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Maps department slugs to OKR department names in the DB
export const DEPARTMENT_OKR_MAP: Record<string, string> = {
  legal: "Legal",
  "customer-support": "Customer Support",
  "office-of-chief-of-staff": "Office of Chief of Staff",
  product: "Product",
  platform: "Engineering",
  data: "Data",
};

export const AGENT_TOOLS = [
  {
    name: "query_payments_summary",
    description:
      "Get a summary of donation/payment activity for the last N days. Returns total transactions, total revenue, average gift size, refund rate, and recurring percentage.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "number", description: "Number of days to look back (use 7 for weekly digest)" },
      },
      required: ["days"],
    },
  },
  {
    name: "query_tickets_summary",
    description:
      "Get a summary of customer support ticket activity for the last N days. Returns volume, resolution rate, escalations, CSAT score, and average resolution time.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "number", description: "Number of days to look back (use 7 for weekly digest)" },
      },
      required: ["days"],
    },
  },
  {
    name: "query_pipelines_summary",
    description:
      "Get a summary of data pipeline health for the last N days. Returns total runs, success rate, and names of any failed pipelines.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: { type: "number", description: "Number of days to look back (use 7 for weekly digest)" },
      },
      required: ["days"],
    },
  },
  {
    name: "query_okrs_by_department",
    description:
      "Get OKR status for a specific department. Returns on-track, at-risk, and off-track counts with key result details.",
    input_schema: {
      type: "object" as const,
      properties: {
        department: {
          type: "string",
          description: "Department name exactly as stored (e.g. 'Data', 'Product', 'Customer Support', 'Engineering', 'Legal', 'Office of Chief of Staff')",
        },
      },
      required: ["department"],
    },
  },
];
