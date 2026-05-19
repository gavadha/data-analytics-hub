"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Dashboards" },
    { href: "/metrics", label: "Metrics" },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-white/5"
      style={{ backgroundColor: "rgba(13, 17, 23, 0.92)", backdropFilter: "blur(12px)" }}>
      <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #5b6af0, #8b5cf6)" }}>
          AB
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">Data Analytics Hub</span>
      </Link>

      <div className="flex items-center gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="ml-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, #5b6af0, #06b6d4)" }}>
          GA
        </div>
      </div>
    </nav>
  );
}
