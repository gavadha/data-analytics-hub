/**
 * Run once to create and seed the SQLite database with realistic dummy data.
 * Usage: npx tsx scripts/seed.ts
 */
import { getDb, initSchema } from "../src/lib/db";

const STATES = ["CA", "NY", "TX", "FL", "VT", "MA", "WA", "IL", "CO", "PA", "GA", "OH", "NC", "MI", "NJ"];
const STATE_RETENTION: Record<string, number> = {
  VT: 0.68, MA: 0.61, NY: 0.58, CA: 0.55, WA: 0.54, CO: 0.52,
  IL: 0.49, NJ: 0.48, PA: 0.46, NC: 0.44, MI: 0.43, OH: 0.42, GA: 0.41, FL: 0.39, TX: 0.37,
};
const CAMPAIGNS = [
  "End of Year 2025", "Midterms 2026", "Spring Give", "Emergency Fund", "Recurring Match Drive",
  "Grassroots 100", "ActBlue Express", "Climate Action", "Democracy Fund", "Get Out The Vote",
];
const AGENTS = ["Maya R.", "Jordan T.", "Sam K.", "Alex W.", "Chris P.", "Dana L."];
const CATEGORIES = ["refund", "account", "donation", "technical", "other"];
const PIPELINES = [
  "donations_daily_agg", "donors_dim_refresh", "csat_weekly_rollup",
  "payments_fact_load", "retention_cohort_model", "okr_tracker_sync",
];
const DEPARTMENTS = ["Engineering", "Product", "Data", "Customer Support", "Legal", "Office of Chief of Staff"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
function datetimeString(daysAgo: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString().replace("T", " ").substring(0, 16);
}

function seed() {
  initSchema();
  const db = getDb();

  // Clear existing data
  db.exec("DELETE FROM okrs; DELETE FROM pipeline_runs; DELETE FROM support_tickets; DELETE FROM payments; DELETE FROM donors;");

  // ── Donors (1,200) ──────────────────────────────────────────────────────────
  const insertDonor = db.prepare(`
    INSERT INTO donors (id, state, email, first_gift_date, is_recurring, total_donated, retention_12mo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const donors: Array<{ id: number; state: string; isRecurring: number }> = [];
  const insertManyDonors = db.transaction(() => {
    for (let i = 1; i <= 1200; i++) {
      const state = randomChoice(STATES);
      const isRecurring = Math.random() < 0.35 ? 1 : 0;
      const totalDonated = isRecurring
        ? parseFloat(randomBetween(50, 800).toFixed(2))
        : parseFloat(randomBetween(10, 300).toFixed(2));
      const retention = isRecurring ? (STATE_RETENTION[state] ?? 0.45) + randomBetween(-0.05, 0.05) : null;
      insertDonor.run(i, state, `donor${i}@example.com`, dateString(randomInt(30, 730)), isRecurring, totalDonated, retention);
      donors.push({ id: i, state, isRecurring });
    }
  });
  insertManyDonors();
  console.log("✓ Seeded 1,200 donors");

  // ── Payments (4,800) ─────────────────────────────────────────────────────────
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, donor_id, amount, date, status, type, campaign, state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertManyPayments = db.transaction(() => {
    for (let i = 1; i <= 4800; i++) {
      const donor = randomChoice(donors);
      const isRecurring = donor.isRecurring === 1 && Math.random() < 0.7;
      const amount = isRecurring
        ? parseFloat(randomBetween(10, 50).toFixed(2))
        : parseFloat(randomBetween(5, 500).toFixed(2));

      // Spike on Nov 3, 2025 (election day proxy)
      const daysAgo = Math.random() < 0.08 ? 196 : randomInt(0, 400); // Nov 3 2025 ≈ 196 days before May 18 2026
      const statusRoll = Math.random();
      const status = statusRoll < 0.02 ? "refunded" : statusRoll < 0.025 ? "failed" : "completed";

      insertPayment.run(i, donor.id, amount, dateString(daysAgo), status, isRecurring ? "recurring" : "one-time", randomChoice(CAMPAIGNS), donor.state);
    }
  });
  insertManyPayments();
  console.log("✓ Seeded 4,800 payments");

  // ── Support Tickets (850) ─────────────────────────────────────────────────────
  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (id, status, category, created_at, resolved_at, csat, agent, escalated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertManyTickets = db.transaction(() => {
    for (let i = 1; i <= 850; i++) {
      const daysAgo = randomInt(0, 90);
      const status = Math.random() < 0.08 ? "open" : Math.random() < 0.05 ? "escalated" : "resolved";
      const resolutionHours = randomBetween(0.5, 12);
      const resolvedAt = status === "resolved" ? datetimeString(daysAgo, -resolutionHours) : null;
      const csat = status === "resolved" ? parseFloat(randomBetween(2.5, 5).toFixed(1)) : null;
      const escalated = status === "escalated" ? 1 : 0;
      insertTicket.run(i, status, randomChoice(CATEGORIES), datetimeString(daysAgo), resolvedAt, csat, randomChoice(AGENTS), escalated);
    }
  });
  insertManyTickets();
  console.log("✓ Seeded 850 support tickets");

  // ── Pipeline Runs (420) ───────────────────────────────────────────────────────
  const insertRun = db.prepare(`
    INSERT INTO pipeline_runs (id, pipeline_name, status, duration_seconds, run_date, rows_processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertManyRuns = db.transaction(() => {
    let id = 1;
    for (let day = 90; day >= 0; day--) {
      for (const pipeline of PIPELINES) {
        const failed = pipeline === "donations_daily_agg" && (day === 3 || day === 7 || day === 12);
        insertRun.run(
          id++,
          pipeline,
          failed ? "failed" : "success",
          randomInt(60, 900),
          dateString(day),
          failed ? 0 : randomInt(1000, 80000)
        );
      }
    }
  });
  insertManyRuns();
  console.log(`✓ Seeded ${PIPELINES.length * 91} pipeline runs`);

  // ── OKRs (18) ─────────────────────────────────────────────────────────────────
  const okrData = [
    { dept: "Engineering", obj: "Improve platform reliability", kr: "Achieve 99.9% uptime across all services", progress: 0.88, status: "on-track" },
    { dept: "Engineering", obj: "Improve platform reliability", kr: "Reduce P95 latency below 200ms", progress: 0.62, status: "at-risk" },
    { dept: "Engineering", obj: "Improve platform reliability", kr: "Zero SEV1 incidents in Q2", progress: 0.70, status: "on-track" },
    { dept: "Product", obj: "Grow recurring donor base", kr: "Increase recurring sign-up rate by 15%", progress: 0.45, status: "at-risk" },
    { dept: "Product", obj: "Grow recurring donor base", kr: "Launch upgrade prompt A/B test", progress: 1.0, status: "on-track" },
    { dept: "Product", obj: "Improve mobile conversion", kr: "Raise mobile conversion rate to 22%", progress: 0.87, status: "on-track" },
    { dept: "Data", obj: "Improve data reliability", kr: "Achieve 99% pipeline success rate", progress: 0.92, status: "on-track" },
    { dept: "Data", obj: "Improve data reliability", kr: "Document 100% of core dbt models", progress: 0.55, status: "at-risk" },
    { dept: "Data", obj: "Expand self-serve analytics", kr: "Launch Analytics Hub to all employees", progress: 0.70, status: "on-track" },
    { dept: "Customer Support", obj: "Improve CSAT", kr: "Achieve 4.5 average CSAT score", progress: 0.86, status: "on-track" },
    { dept: "Customer Support", obj: "Improve CSAT", kr: "Reduce first response time to under 2 hours", progress: 0.60, status: "at-risk" },
    { dept: "Customer Support", obj: "Reduce escalations", kr: "Cut escalation rate by 20%", progress: 0.35, status: "off-track" },
    { dept: "Legal", obj: "Maintain compliance", kr: "Zero overdue regulatory filings", progress: 1.0, status: "on-track" },
    { dept: "Legal", obj: "Maintain compliance", kr: "Complete annual SOC 2 audit", progress: 0.75, status: "on-track" },
    { dept: "Office of Chief of Staff", obj: "Operational excellence", kr: "63% of company OKRs on-track by mid-Q2", progress: 0.63, status: "at-risk" },
    { dept: "Office of Chief of Staff", obj: "Operational excellence", kr: "Headcount plan finalized for H2 2026", progress: 0.80, status: "on-track" },
    { dept: "Office of Chief of Staff", obj: "Operational excellence", kr: "Q2 budget variance under 5%", progress: 0.94, status: "on-track" },
    { dept: "Engineering", obj: "Developer productivity", kr: "Reduce CI build time below 8 minutes", progress: 0.25, status: "off-track" },
  ];
  const insertOkr = db.prepare(`
    INSERT INTO okrs (id, department, objective, key_result, progress, quarter, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertManyOkrs = db.transaction(() => {
    okrData.forEach((o, idx) => {
      insertOkr.run(idx + 1, o.dept, o.obj, o.kr, o.progress, "Q2-2026", o.status);
    });
  });
  insertManyOkrs();
  console.log("✓ Seeded 18 OKRs");

  console.log("\n✅ Database seeded successfully at data/analytics.db");
  db.close();
}

seed();
