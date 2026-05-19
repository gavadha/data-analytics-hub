import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb, initSchema, DB_SCHEMA } from "@/lib/db";
import { isSelectQuery } from "@/lib/sqlGuard";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a data analyst assistant for a fundraising platform analytics hub.
You have access to a SQLite analytics database with this schema:

${DB_SCHEMA}

Key domain knowledge:
- payments.status: 'completed' | 'refunded' | 'failed'
- payments.type: 'one-time' | 'recurring'
- support_tickets.status: 'open' | 'resolved' | 'escalated'
- okrs.status: 'on-track' | 'at-risk' | 'off-track'
- pipeline_runs.status: 'success' | 'failed'
- Refund rate = refunded / (completed + refunded) * 100
- CSAT is rated 1-5
- donors.retention_12mo is a 0-1 decimal (multiply by 100 for %)
- All dates are stored as YYYY-MM-DD text

Given a question in plain English, respond with ONLY a valid SQLite SQL query — no explanation, no markdown, no code fences. Just raw SQL.

Keep queries simple and readable. Always LIMIT results to at most 20 rows unless the user asks for totals/aggregates.`;

const FORMAT_SYSTEM = `You are a concise data analyst. Given a question and the raw SQL results, write a clear 1-3 sentence answer in plain English. Include specific numbers and percentages. Do not mention SQL. Be direct.`;

interface GenieResponse {
  question: string;
  answer: string;
  source: string;
  confidence: "high" | "medium" | "low";
  generatedSql?: string;
}


export async function POST(req: NextRequest) {
  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question } = body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question must be 500 characters or fewer" }, { status: 400 });
  }

  const trimmedQuestion = question.trim();

  // Step 1: Ask Claude to generate SQL
  let generatedSql: string;
  try {
    const sqlResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: trimmedQuestion }],
    });

    generatedSql = (sqlResponse.content[0] as { type: string; text: string }).text.trim();
  } catch (err) {
    console.error("Claude SQL generation error:", err);
    return NextResponse.json({ error: "Failed to generate query" }, { status: 500 });
  }

  // Step 2: Safety check — only allow SELECT statements
  if (!isSelectQuery(generatedSql)) {
    return NextResponse.json({ error: "Only read queries are supported" }, { status: 400 });
  }

  // Step 3: Run the query against SQLite
  let queryResults: unknown[];
  try {
    initSchema();
    const db = getDb();
    queryResults = db.prepare(generatedSql).all();
  } catch (err) {
    console.error("SQLite query error:", err, "\nSQL:", generatedSql);
    return NextResponse.json({ error: "Could not run the generated query against the database" }, { status: 500 });
  }

  // Step 4: Ask Claude to format the results as natural language
  let naturalAnswer: string;
  try {
    const formatResponse = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: FORMAT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Question: ${trimmedQuestion}\n\nSQL results (JSON): ${JSON.stringify(queryResults.slice(0, 20))}`,
        },
      ],
    });

    naturalAnswer = (formatResponse.content[0] as { type: string; text: string }).text.trim();
  } catch (err) {
    console.error("Claude format error:", err);
    naturalAnswer = `Query returned ${queryResults.length} result(s). Raw data: ${JSON.stringify(queryResults.slice(0, 5))}`;
  }

  const response: GenieResponse = {
    question: trimmedQuestion,
    answer: naturalAnswer,
    source: "Analytics Database · Generated SQL",
    confidence: queryResults.length > 0 ? "high" : "medium",
    generatedSql,
  };

  return NextResponse.json(response);
}
