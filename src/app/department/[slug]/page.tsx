import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WeeklyDigest from "@/components/WeeklyDigest";
import { departments, dashboardsByDepartment } from "@/lib/mockData";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return departments.map((d) => ({ slug: d.slug }));
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  const department = departments.find((d) => d.slug === slug);
  const dashboards = dashboardsByDepartment[slug];

  if (!department || !dashboards) notFound();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0d1117" }}>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all departments
        </Link>

        <div className="mb-8 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: department.accentColor }} />
            <h1 className="text-3xl font-bold text-white">{department.name}</h1>
          </div>
          <p className="text-slate-400 ml-4">{department.description}</p>
          <p className="ml-4 mt-2 text-sm" style={{ color: department.accentColor }}>
            {department.dashboardCount} dashboards available
          </p>
        </div>

        <WeeklyDigest department={department.name} slug={slug} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboards.map((dash) => (
            <div
              key={dash.id}
              className="p-5 rounded-xl border group flex flex-col justify-between"
              style={{
                backgroundColor: "#161c2d",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div>
                <h3 className="text-white font-semibold text-base mb-2 group-hover:text-indigo-300 transition-colors">
                  {dash.name}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{dash.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {dash.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: "rgba(91,106,240,0.15)",
                        color: "#818cf8",
                        border: "1px solid rgba(91,106,240,0.25)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {dash.owner}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dash.lastUpdated}
                  </span>
                </div>
                <a
                  href={dash.lookerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #5b6af0, #8b5cf6)", color: "white" }}
                >
                  View in Looker
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
