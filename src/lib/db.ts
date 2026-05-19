import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "analytics.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export const DB_SCHEMA = `
-- donors: one row per unique donor
CREATE TABLE IF NOT EXISTS donors (
  id          INTEGER PRIMARY KEY,
  state       TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  first_gift_date TEXT NOT NULL,   -- YYYY-MM-DD
  is_recurring    INTEGER NOT NULL DEFAULT 0, -- 1 = active recurring pledge
  total_donated   REAL    NOT NULL DEFAULT 0,
  retention_12mo  REAL              -- retention rate 0-1, nullable for new donors
);

-- payments: individual transactions
CREATE TABLE IF NOT EXISTS payments (
  id        INTEGER PRIMARY KEY,
  donor_id  INTEGER NOT NULL REFERENCES donors(id),
  amount    REAL    NOT NULL,
  date      TEXT    NOT NULL,       -- YYYY-MM-DD
  status    TEXT    NOT NULL,       -- 'completed' | 'refunded' | 'failed'
  type      TEXT    NOT NULL,       -- 'one-time' | 'recurring'
  campaign  TEXT    NOT NULL,
  state     TEXT    NOT NULL
);

-- support_tickets: customer support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id          INTEGER PRIMARY KEY,
  status      TEXT NOT NULL,    -- 'open' | 'resolved' | 'escalated'
  category    TEXT NOT NULL,    -- 'refund' | 'account' | 'donation' | 'technical' | 'other'
  created_at  TEXT NOT NULL,    -- YYYY-MM-DD HH:MM
  resolved_at TEXT,             -- nullable if still open
  csat        REAL,             -- 1-5, nullable
  agent       TEXT NOT NULL,
  escalated   INTEGER NOT NULL DEFAULT 0
);

-- pipeline_runs: dbt / Airflow pipeline execution log
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id               INTEGER PRIMARY KEY,
  pipeline_name    TEXT NOT NULL,
  status           TEXT NOT NULL,  -- 'success' | 'failed'
  duration_seconds INTEGER NOT NULL,
  run_date         TEXT NOT NULL,  -- YYYY-MM-DD
  rows_processed   INTEGER NOT NULL
);

-- okrs: company OKR tracking
CREATE TABLE IF NOT EXISTS okrs (
  id          INTEGER PRIMARY KEY,
  department  TEXT NOT NULL,
  objective   TEXT NOT NULL,
  key_result  TEXT NOT NULL,
  progress    REAL NOT NULL,  -- 0.0 to 1.0
  quarter     TEXT NOT NULL,  -- e.g. 'Q2-2026'
  status      TEXT NOT NULL   -- 'on-track' | 'at-risk' | 'off-track'
);
`.trim();

export function initSchema(): void {
  const db = getDb();
  db.exec(DB_SCHEMA);
}
