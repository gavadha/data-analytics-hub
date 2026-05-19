import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { executeTool, AGENT_TOOLS, DEPARTMENT_OKR_MAP } from "@/lib/agentTools";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior data analyst generating a concise weekly digest for an internal analytics portal.

Use the available tools to collect data relevant to the department. Always call query_okrs_by_department. Call other tools based on what's relevant — payments for fundraising-adjacent teams, tickets for customer support, pipelines for data/platform teams.

After collecting all data, write a digest in this exact format:

**Headline:** One sentence capturing the most important thing this week.

**Key Numbers**
- [metric]: [value] ([context if relevant])
- [metric]: [value]
- [metric]: [value]

⚠️ **Watch Out**
- [item that needs attention]
- [item that needs attention]

✓ **Looking Good**
- [positive item]
- [positive item]

Be specific with numbers. Keep total response under 220 words. Do not add any preamble or closing remarks.`;

async function runAgentLoop(department: string, slug: string): Promise<string> {
  const okrDept = DEPARTMENT_OKR_MAP[slug] ?? department;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Generate the weekly digest for the ${department} department. The OKR department name is "${okrDept}". Use 7 days as the lookback window for all time-based queries.`,
    },
  ];

  let response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: AGENT_TOOLS,
    messages,
  });

  // Agentic loop — keep going until Claude stops calling tools
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
      type: "tool_result" as const,
      tool_use_id: block.id,
      content: JSON.stringify(
        executeTool(block.name, block.input as Record<string, unknown>)
      ),
    }));

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages,
    });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return textBlock?.text ?? "Unable to generate digest.";
}

export async function POST(req: NextRequest) {
  let body: { department?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { department, slug } = body;
  if (!department || !slug) {
    return new Response(
      JSON.stringify({ error: "department and slug are required" }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "status", text: "Agent is querying payments, tickets, pipelines, and OKRs..." });

        const digest = await runAgentLoop(department, slug);

        // Stream the digest token by token for a live typing feel
        const words = digest.split(" ");
        for (let i = 0; i < words.length; i++) {
          send({ type: "text", text: (i === 0 ? "" : " ") + words[i] });
          await new Promise((r) => setTimeout(r, 25));
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Digest agent error:", err);
        send({ type: "error", text: "Failed to generate digest. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
