import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import type { Department } from "@/lib/mockData";

interface DepartmentCardProps {
  department: Department;
}

export default function DepartmentCard({ department }: DepartmentCardProps) {
  return (
    <Link href={`/department/${department.slug}`}>
      <div
        className="dept-card h-full p-5 rounded-xl border cursor-pointer group"
        style={{
          backgroundColor: "#161c2d",
          borderColor: "rgba(255,255,255,0.06)",
          borderLeftWidth: "2px",
          borderLeftColor: department.accentColor,
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-semibold text-base group-hover:text-indigo-300 transition-colors">
            {department.name}
          </h3>
          <LayoutDashboard className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5 shrink-0" />
        </div>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">{department.description}</p>
        <p className="text-sm font-medium" style={{ color: department.accentColor }}>
          {department.dashboardCount} dashboards
        </p>
      </div>
    </Link>
  );
}
