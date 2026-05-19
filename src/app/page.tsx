import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import DepartmentCard from "@/components/DepartmentCard";
import MetricsSection from "@/components/MetricsSection";
import RecentAnswers from "@/components/RecentAnswers";
import Footer from "@/components/Footer";
import { departments } from "@/lib/mockData";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0d1117" }}>
      <Navbar />
      <main className="flex-1">
        <HeroSearch />

        <section className="px-6 py-10 max-w-5xl mx-auto w-full">
          <h2 className="text-white text-xl font-semibold mb-6">Browse dashboards by department</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <DepartmentCard key={dept.id} department={dept} />
            ))}
          </div>
        </section>

        <MetricsSection limit={3} />
        <RecentAnswers />
      </main>
      <Footer />
    </div>
  );
}
