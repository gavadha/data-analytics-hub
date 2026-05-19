import Navbar from "@/components/Navbar";
import MetricsSection from "@/components/MetricsSection";
import Footer from "@/components/Footer";

export default function MetricsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0d1117" }}>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto w-full px-6 pt-12 pb-4">
          <h1 className="text-3xl font-bold text-white mb-2">Metrics Definitions</h1>
          <p className="text-slate-400">
            Canonical definitions for all key metrics used across dashboards and reports.
          </p>
        </div>
        <MetricsSection />
      </main>
      <Footer />
    </div>
  );
}
