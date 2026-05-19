"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

type Status = "idle" | "loading" | "streaming" | "done" | "error";

// Renders Claude's markdown-lite output: **bold**, ⚠️ lines, ✓ lines, bullets
function DigestLine({ line }: { line: string }) {
  if (!line.trim()) return <div className="h-2" />;

  const isBold = line.startsWith("**") && line.includes(":**");
  const isWarning = line.startsWith("⚠️");
  const isGood = line.startsWith("✓");
  const isBullet = line.startsWith("- ");

  const text = line
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^- /, "");

  if (isBold) {
    return <p className="text-white font-semibold text-sm mt-3 mb-1">{text}</p>;
  }
  if (isWarning) {
    return (
      <p className="text-amber-400 text-sm">
        {line.replace(/\*\*(.*?)\*\*/g, "$1")}
      </p>
    );
  }
  if (isGood) {
    return (
      <p className="text-emerald-400 text-sm">
        {line.replace(/\*\*(.*?)\*\*/g, "$1")}
      </p>
    );
  }
  if (isBullet) {
    return (
      <p className="text-slate-300 text-sm flex gap-2">
        <span className="text-slate-500 shrink-0">·</span>
        {text}
      </p>
    );
  }
  return <p className="text-slate-300 text-sm">{line}</p>;
}

interface WeeklyDigestProps {
  department: string;
  slug: string;
}

export default function WeeklyDigest({ department, slug }: WeeklyDigestProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("");
  const [digest, setDigest] = useState("");

  async function generateDigest() {
    setStatus("loading");
    setDigest("");
    setStatusText("Starting agent...");

    try {
      const res = await fetch("/api/agent/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, slug }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value);
        const lines = raw.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const event = JSON.parse(line.slice(6));

          if (event.type === "status") {
            setStatusText(event.text);
          } else if (event.type === "text") {
            setStatus("streaming");
            setDigest((prev) => prev + event.text);
          } else if (event.type === "done") {
            setStatus("done");
          } else if (event.type === "error") {
            setStatus("error");
            setStatusText(event.text);
          }
        }
      }
    } catch {
      setStatus("error");
      setStatusText("Something went wrong. Please try again.");
    }
  }

  return (
    <div
      className="mb-8 rounded-xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ backgroundColor: "#161c2d", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-white font-semibold text-sm">Weekly Digest</span>
          <span className="text-slate-500 text-xs">· AI agent · Last 7 days</span>
        </div>
        <button
          onClick={generateDigest}
          disabled={status === "loading" || status === "streaming"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #5b6af0, #8b5cf6)", color: "white" }}
        >
          {status === "loading" || status === "streaming" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </>
          ) : status === "done" ? (
            <>
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Generate Digest
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div style={{ backgroundColor: "#0d1117" }}>
        {status === "idle" && (
          <div className="px-5 py-8 text-center">
            <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Generate an AI-synthesized summary of this week&apos;s data for{" "}
              <span className="text-slate-400">{department}</span>.
            </p>
            <p className="text-slate-600 text-xs mt-1">
              The agent queries payments, tickets, pipelines, and OKRs — then synthesizes them into a digest.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="px-5 py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{statusText}</p>
          </div>
        )}

        {(status === "streaming" || status === "done") && (
          <div className="px-5 py-5 space-y-0.5">
            {digest.split("\n").map((line, i) => (
              <DigestLine key={i} line={line} />
            ))}
            {status === "streaming" && (
              <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse align-middle ml-0.5" />
            )}
          </div>
        )}

        {status === "error" && (
          <div className="px-5 py-8 text-center">
            <p className="text-red-400 text-sm">{statusText}</p>
            <button
              onClick={generateDigest}
              className="mt-3 text-xs text-slate-500 hover:text-slate-400 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
