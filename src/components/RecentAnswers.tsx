import { recentAnswers } from "@/lib/mockData";
import { Bot } from "lucide-react";

export default function RecentAnswers() {
  return (
    <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
      <h2 className="text-white text-xl font-semibold mb-6">Recent answers from the hub</h2>
      <div className="space-y-3">
        {recentAnswers.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 rounded-xl border"
            style={{ backgroundColor: "#161c2d", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg, #5b6af0, #8b5cf6)" }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <p className="text-white text-sm font-semibold">Q: {item.question}</p>
                <span className="text-slate-500 text-xs shrink-0 mt-0.5">{item.timeAgo}</span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {item.answer}{" "}
                <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">→</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
