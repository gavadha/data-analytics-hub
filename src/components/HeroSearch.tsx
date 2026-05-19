"use client";

import { useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";

interface GenieAnswer {
  question: string;
  answer: string;
  source: string;
}

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenieAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/genie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!res.ok) throw new Error("Failed to get answer");

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-20 px-6 text-center"
      style={{ background: "linear-gradient(180deg, #0d1117 0%, #111827 100%)" }}>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
        Your data, answered instantly
      </h1>
      <p className="text-slate-400 text-lg mb-10">
        Ask a question in plain English — no SQL, no tickets, no waiting.
      </p>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-slate-500 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "What is our refund rate for recurring donors in Q1 2026?"'
            className="search-input w-full pl-12 pr-14 py-4 rounded-xl text-white placeholder-slate-500 text-sm outline-none border transition-all"
            style={{
              backgroundColor: "#1a2035",
              borderColor: "rgba(99, 102, 241, 0.3)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #5b6af0, #8b5cf6)" }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </form>

      {result && (
        <div className="max-w-2xl mx-auto mt-6 text-left p-5 rounded-xl border"
          style={{ backgroundColor: "#161c2d", borderColor: "rgba(91, 106, 240, 0.3)" }}>
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Answer</p>
          <p className="text-white font-medium mb-2">{result.answer}</p>
          <p className="text-slate-500 text-xs">
            Source:{" "}
            <span className="text-indigo-400">{result.source}</span>
          </p>
        </div>
      )}

      {error && (
        <p className="max-w-2xl mx-auto mt-4 text-red-400 text-sm">{error}</p>
      )}
    </section>
  );
}
