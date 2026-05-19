import Link from "next/link";
import { metrics, categoryColors } from "@/lib/mockData";

export default function MetricsSection({ limit }: { limit?: number }) {
  const displayed = limit ? metrics.slice(0, limit) : metrics;

  return (
    <section className="px-6 py-12 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-semibold">Metrics definitions</h2>
        {limit && (
          <Link href="/metrics" className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
            View all →
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {displayed.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{
              backgroundColor: "#161c2d",
              borderColor: "rgba(255,255,255,0.06)",
              borderLeftWidth: "3px",
              borderLeftColor: "#5b6af0",
            }}
          >
            <div>
              <p className="text-white font-semibold text-sm mb-0.5">{metric.name}</p>
              <p className="text-slate-400 text-sm">
                {metric.definition}{" "}
                <span className="text-slate-500">Source: {metric.source}.</span>
              </p>
            </div>
            <span
              className={`ml-4 shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                categoryColors[metric.category] ?? "bg-slate-800 text-slate-300"
              }`}
            >
              {metric.category}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
