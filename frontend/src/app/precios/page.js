"use client";
import { useState } from "react";
import { Check, Tag, Sparkles, Zap, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import PublicShell from "@/components/PublicShell";

const PLANS = [
  {
    id: "free",
    name: "Free",
    icon: <Tag size={18} />,
    price: { monthly: 0, yearly: 0 },
    blurb: "Para probar la plataforma con un curso piloto.",
    cta: "Empezar gratis",
    highlight: false,
    color: "slate",
    features: [
      "Hasta 30 estudiantes",
      "1 docente",
      "Calificación IA: 5 exámenes/mes",
      "Mensajería con polling",
      "Calendario básico",
    ],
    not: ["Tutor IA ilimitado", "Reportes avanzados", "Soporte prioritario"],
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Sparkles size={18} />,
    price: { monthly: 29, yearly: 24 },
    blurb: "Para docentes que quieren escalar la calificación con IA.",
    cta: "Probar 14 días gratis",
    highlight: true,
    color: "indigo",
    features: [
      "Estudiantes ilimitados",
      "Calificación IA ilimitada",
      "Tutor IA con historial completo",
      "Mensajería en tiempo real (WebSocket)",
      "Calendario avanzado y notificaciones",
      "Exportación a Excel y PDF",
    ],
    not: ["Múltiples docentes en una institución"],
  },
  {
    id: "school",
    name: "Institución",
    icon: <Building2 size={18} />,
    price: { monthly: 99, yearly: 79 },
    blurb: "Para colegios completos, con varios docentes y reportes.",
    cta: "Hablar con ventas",
    highlight: false,
    color: "violet",
    features: [
      "Todo lo de Pro",
      "Docentes ilimitados",
      "Roles y permisos por área",
      "Reportes consolidados de la institución",
      "Soporte prioritario 24/7",
      "Onboarding del equipo incluido",
    ],
    not: [],
  },
];

// Tailwind 4 JIT no detecta clases dinámicas; las listamos explícitamente.
const ACCENT = {
  slate:  { text: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",         border: "border-slate-300 dark:border-slate-600" },
  indigo: { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30",    border: "border-indigo-600" },
  violet: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30",    border: "border-violet-600" },
};
const accent = (c) => ACCENT[c] || ACCENT.indigo;

export default function PreciosPage() {
  const [yearly, setYearly] = useState(false);
  const router = useRouter();

  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* HERO */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <Zap size={14} /> Planes simples
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Paga solo por lo que{" "}
            <span className="text-indigo-600 dark:text-indigo-400">usas</span>.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Precios honestos, sin trucos. Cancela en cualquier momento; tus datos siempre son tuyos.
          </p>

          {/* Toggle mensual / anual */}
          <div className="inline-flex items-center gap-3 mt-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all active:scale-95 ${
                !yearly ? "bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-white" : "text-slate-500"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 ${
                yearly ? "bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-white" : "text-slate-500"
              }`}
            >
              Anual
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">−17%</span>
            </button>
          </div>
        </section>

        {/* PLANS */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLANS.map((p, i) => {
              const a = accent(p.color);
              const price = yearly ? p.price.yearly : p.price.monthly;
              return (
                <article
                  key={p.id}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className={`relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 border-2 transition-all animate-springIn [animation-fill-mode:both] ${
                    p.highlight
                      ? `${a.border} shadow-2xl shadow-indigo-500/20 scale-[1.03] z-10`
                      : "border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-indigo-500/40 animate-badgePop">
                      Más popular
                    </span>
                  )}

                  <div className={`inline-flex p-2.5 rounded-xl ${a.bg} ${a.text} mb-4`}>
                    {p.icon}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{p.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed min-h-[2.5rem]">
                    {p.blurb}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter">
                      ${price}
                    </span>
                    <span className="text-slate-400 text-sm font-bold">
                      /mes{yearly ? " · facturado anual" : ""}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(p.id === "school" ? "/contacto" : "/login")}
                    className={`w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 ${
                      p.highlight
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {p.cta}
                  </button>

                  <ul className="mt-7 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <span className={`mt-0.5 p-0.5 rounded-full ${a.bg}`}>
                          <Check size={13} className={a.text} />
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">{f}</span>
                      </li>
                    ))}
                    {p.not.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400 line-through">
                        <span className="mt-0.5 p-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          <Check size={13} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 mt-10">
            Todos los planes incluyen: hosting, actualizaciones automáticas y respaldos diarios.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
