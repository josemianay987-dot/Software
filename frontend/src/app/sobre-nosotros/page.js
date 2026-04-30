"use client";
// lucide-react 1.7.0 no expone iconos de marcas (Linkedin/Github),
// usamos equivalentes neutros: Briefcase (perfil profesional) y Code (repo).
import { Briefcase, Code, Mail, Heart, Target, Sparkles } from "lucide-react";
import PublicShell from "@/components/PublicShell";

// Datos placeholder — el usuario los reemplazará con la info real.
// Las fotos usan pravatar.cc (servicio público de avatares de ejemplo).
const TEAM = [
  {
    name: "Jose",
    role: "Backend & IA",
    bio: "Arquitectura de la API, integración con Gemini Vision y motor de calificación masiva.",
    photo: "https://i.pravatar.cc/400?img=12",
    color: "indigo",
    social: { linkedin: "#", github: "#", email: "jose@example.com" },
  },
  {
    name: "Marinelly",
    role: "Frontend & UX",
    bio: "Diseño de los portales docente y estudiante, sistema de animaciones y experiencia de usuario.",
    photo: "https://i.pravatar.cc/400?img=47",
    color: "violet",
    social: { linkedin: "#", github: "#", email: "marinelly@example.com" },
  },
  {
    name: "Selenis",
    role: "Producto & Pedagogía",
    bio: "Curaduría pedagógica de los flujos, mensajería entre docente y estudiante, calendario académico.",
    photo: "https://i.pravatar.cc/400?img=45",
    color: "emerald",
    social: { linkedin: "#", github: "#", email: "selenis@example.com" },
  },
];

const VALUES = [
  {
    icon: <Target size={22} />,
    title: "Foco docente",
    desc: "Cada decisión de producto se valida con casos reales del aula.",
    color: "indigo",
  },
  {
    icon: <Sparkles size={22} />,
    title: "IA con propósito",
    desc: "Usamos modelos para acelerar tareas mecánicas, no para reemplazar al docente.",
    color: "violet",
  },
  {
    icon: <Heart size={22} />,
    title: "Cercanía al estudiante",
    desc: "Notas claras, feedback útil y un canal directo con el profesor.",
    color: "rose",
  },
];

// Tailwind 4 JIT no detecta clases construidas dinámicamente.
// Listamos las combinaciones explícitamente.
const ACCENT = {
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-100 dark:bg-indigo-900/30",   ring: "from-indigo-400 to-indigo-600 shadow-indigo-500/30" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-100 dark:bg-violet-900/30",   ring: "from-violet-400 to-violet-600 shadow-violet-500/30" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", ring: "from-emerald-400 to-emerald-600 shadow-emerald-500/30" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-100 dark:bg-blue-900/30",       ring: "from-blue-400 to-blue-600 shadow-blue-500/30" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-100 dark:bg-amber-900/30",     ring: "from-amber-400 to-amber-600 shadow-amber-500/30" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-100 dark:bg-rose-900/30",       ring: "from-rose-400 to-rose-600 shadow-rose-500/30" },
};
const accent = (c) => ACCENT[c] || ACCENT.indigo;

export default function SobreNosotrosPage() {
  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* ===== HERO ===== */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <Heart size={14} /> Quiénes somos
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Un equipo pequeño con una idea{" "}
            <span className="text-indigo-600 dark:text-indigo-400">grande</span>.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            KNOWTIFY nació para devolverle al docente las horas que se pierden calificando
            exámenes y para darle al estudiante una visión clara, en tiempo real, de su
            progreso. Somos tres personas convencidas de que la educación merece mejores
            herramientas.
          </p>
        </section>

        {/* ===== TEAM ===== */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-16">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              El equipo
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Conoce a quien construye KNOWTIFY
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map((m, i) => {
              const c = accent(m.color);
              return (
                <article
                  key={m.name}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all animate-springIn [animation-fill-mode:both]"
                >
                  {/* Foto con anillo del color del integrante */}
                  <div className="flex justify-center mb-5">
                    <div className={`p-1.5 rounded-full bg-gradient-to-br shadow-lg ${c.ring}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.photo}
                        alt={m.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {m.name}
                    </h3>
                    <p className={`text-xs font-black uppercase tracking-widest mt-1 ${c.text}`}>
                      {m.role}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                      {m.bio}
                    </p>
                  </div>

                  <div className="flex justify-center gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <a href={m.social.linkedin} aria-label="LinkedIn" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 transition-all active:scale-95">
                      <Briefcase size={15} />
                    </a>
                    <a href={m.social.github} aria-label="GitHub" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 transition-all active:scale-95">
                      <Code size={15} />
                    </a>
                    <a href={`mailto:${m.social.email}`} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 transition-all active:scale-95">
                      <Mail size={15} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ===== VALUES ===== */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Nuestros valores
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              En qué creemos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VALUES.map((v, i) => {
              const c = accent(v.color);
              return (
                <div
                  key={v.title}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-slideUp [animation-fill-mode:both]"
                >
                  <div className={`inline-flex p-3 rounded-2xl ${c.bg} ${c.text} mb-4`}>
                    {v.icon}
                  </div>
                  <h3 className="font-black text-lg mb-1.5">{v.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
