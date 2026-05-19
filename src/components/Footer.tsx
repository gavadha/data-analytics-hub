export default function Footer() {
  return (
    <footer className="border-t py-8 text-center" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <p className="text-slate-500 text-sm">
        Data Analytics Hub · Built by the Data &amp; Analytics Team
      </p>
      <p className="text-slate-600 text-xs mt-1">
        Questions? Slack{" "}
        <span className="text-indigo-400">#data-questions</span>
        {" · "}
        <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors">
          Request a new dashboard →
        </span>
      </p>
    </footer>
  );
}
