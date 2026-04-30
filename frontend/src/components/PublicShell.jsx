"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// Cascarón compartido por las páginas públicas (nav + footer).
// Mantiene la paleta v2.1: indigo primario, slate-100/800 superficies,
// dark via .dark, botón primario con escala/active.
const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/cursos", label: "Cursos" },
  { href: "/precios", label: "Precios" },
  { href: "/guia", label: "Guía" },
  { href: "/contacto", label: "Contacto" },
];

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* ===== NAV ===== */}
      <nav className="max-w-7xl w-full mx-auto flex items-center justify-between px-6 md:px-10 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap size={22} />
          </div>
          <span className="text-xl font-black tracking-tighter">KNOWTIFY</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative transition-colors ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push("/login")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-6 py-2.5 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 hover:scale-[1.02]"
          >
            Iniciar sesión
          </button>
        </div>
      </nav>

      {/* ===== CONTENT ===== */}
      <main className="flex-1">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="max-w-7xl w-full mx-auto px-6 md:px-10 py-10 border-t border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <GraduationCap size={16} />
            </div>
            <span className="font-black tracking-tight">KNOWTIFY</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {NAV_LINKS.slice(1).map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 text-center md:text-right">
            v2.1 · Jose · Selenis · Marinelly Dev Studio © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
