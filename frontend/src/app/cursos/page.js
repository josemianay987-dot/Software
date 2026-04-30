"use client";
import { useState } from "react";
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Languages,
  Palette,
  Atom,
  Clock,
  Users,
  Star,
  ArrowRight,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";

const FILTERS = [
  { id: "all",    label: "Todos" },
  { id: "stem",   label: "Ciencias" },
  { id: "human",  label: "Humanidades" },
  { id: "lang",   label: "Idiomas" },
  { id: "art",    label: "Artes" },
];

const COURSES = [
  {
    cat: "stem",
    icon: <Calculator size={22} />,
    title: "Matemáticas",
    desc: "Álgebra, geometría, cálculo y estadística con calificación IA.",
    students: 1280,
    rating: 4.9,
    hours: 96,
    level: "Todos los grados",
    color: "indigo",
  },
  {
    cat: "stem",
    icon: <FlaskConical size={22} />,
    title: "Química",
    desc: "Tabla periódica, reacciones, estequiometría y laboratorio.",
    students: 540,
    rating: 4.7,
    hours: 64,
    level: "10° y 11°",
    color: "emerald",
  },
  {
    cat: "stem",
    icon: <Atom size={22} />,
    title: "Física",
    desc: "Mecánica, ondas, electromagnetismo y prácticas guiadas.",
    students: 410,
    rating: 4.8,
    hours: 72,
    level: "10° y 11°",
    color: "blue",
  },
  {
    cat: "human",
    icon: <Globe2 size={22} />,
    title: "Historia & Geografía",
    desc: "Pensamiento crítico sobre procesos históricos y territoriales.",
    students: 720,
    rating: 4.6,
    hours: 48,
    level: "6° a 11°",
    color: "amber",
  },
  {
    cat: "lang",
    icon: <Languages size={22} />,
    title: "Inglés",
    desc: "Niveles A1–B2 con tutor IA conversacional integrado.",
    students: 1620,
    rating: 4.9,
    hours: 120,
    level: "A1 → B2",
    color: "violet",
  },
  {
    cat: "art",
    icon: <Palette size={22} />,
    title: "Arte y Expresión",
    desc: "Composición, color y proyectos creativos con feedback docente.",
    students: 290,
    rating: 4.7,
    hours: 36,
    level: "Todos los grados",
    color: "rose",
  },
];

// Tailwind 4 JIT no detecta clases dinámicas; las listamos explícitamente.
const ACCENT = {
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-100 dark:bg-violet-900/30" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-100 dark:bg-blue-900/30" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-100 dark:bg-amber-900/30" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-100 dark:bg-rose-900/30" },
};
const accent = (c) => ACCENT[c] || ACCENT.indigo;

export default function CursosPage() {
  const [filter, setFilter] = useState("all");
  const visible = COURSES.filter((c) => filter === "all" || c.cat === filter);

  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* HERO */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <BookOpen size={14} /> Catálogo
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Aprende a tu{" "}
            <span className="text-indigo-600 dark:text-indigo-400">ritmo</span>
            , con apoyo{" "}
            <span className="text-violet-600 dark:text-violet-400">inteligente</span>.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Materias completas con planes de estudio progresivos, calificación automática
            de exámenes y un tutor IA disponible 24/7.
          </p>
        </section>

        {/* FILTROS */}
        <section className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 ${
                  filter === f.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* GRID */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((c, i) => {
              const a = accent(c.color);
              return (
                <article
                  key={c.title}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="group bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all animate-slideUp [animation-fill-mode:both] cursor-pointer"
                >
                  <div className={`inline-flex p-3.5 rounded-2xl ${a.bg} ${a.text} mb-5`}>
                    {c.icon}
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{c.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {c.desc}
                  </p>

                  {/* meta */}
                  <div className="flex flex-wrap gap-3 mt-5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {c.students.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {c.hours} h
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Star size={12} fill="currentColor" /> {c.rating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {c.level}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-sm font-black ${a.text} group-hover:translate-x-1 transition-transform`}>
                      Ver curso <ArrowRight size={14} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {visible.length === 0 && (
            <p className="text-center text-slate-400 text-sm font-bold mt-10">
              No hay cursos en esta categoría todavía.
            </p>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
