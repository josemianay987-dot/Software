"use client";
import PublicShell from "@/components/PublicShell";
import ExplainerAnimation from "@/components/ExplainerAnimation";
import LottiePlayer from "@/components/LottiePlayer";
import { Sparkles, Bot, MessageCircle, BarChart2, FileText, Calendar } from "lucide-react";

// /demo — Página dedicada con el "explainer" estilizado.
// Útil para enviar el link a colegios, embeber en YouTube descripción
// o grabarla con OBS para campañas.
export default function DemoPage() {
  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14 text-center">
          <span className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <Sparkles size={14} /> Demo animada
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Mira KNOWTIFY{" "}
            <span className="text-indigo-600 dark:text-indigo-400">en acción</span>.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-5">
            En 14 segundos te mostramos las 4 funciones que cambian la rutina del docente:
            calificación IA, notas en tiempo real, feedback automático y mensajería.
          </p>
        </section>

        {/* Animación principal */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-16">
          <ExplainerAnimation />
        </section>

        {/* Cards de soporte: lo que pasa "detrás" de la animación */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: <FileText size={20} />, color: "indigo",
                title: "Sube cualquier examen",
                body: "PDF, JPG o PNG. Hasta 30 estudiantes en un solo upload. Tamaño máximo 20 MB." },
              { icon: <BarChart2 size={20} />, color: "blue",
                title: "Notas y niveles automáticos",
                body: "El sistema calcula Saber/Hacer/Ser, promedio y nivel SUPERIOR/ALTO/BÁSICO/BAJO." },
              { icon: <Bot size={20} />, color: "violet",
                title: "Feedback personalizado IA",
                body: "Cada estudiante recibe explicaciones de lo que falló y un plan de estudio adaptado." },
              { icon: <MessageCircle size={20} />, color: "emerald",
                title: "Mensajería tiempo real",
                body: "Conversación directa por WebSocket entre docente y estudiante; sin esperar refresh." },
            ].map((c) => {
              const palette = {
                indigo:  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                blue:    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                violet:  "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
                emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              }[c.color];
              return (
                <article key={c.title} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className={`inline-flex p-3 rounded-2xl mb-4 ${palette}`}>{c.icon}</div>
                  <h3 className="text-lg font-black tracking-tight">{c.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{c.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA + nota de cómo grabar */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-24">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-[2.5rem] p-10 text-center shadow-2xl shadow-indigo-500/30">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">¿Quieres usar esta demo en tu campaña?</h2>
            <p className="text-indigo-100 mt-3 max-w-xl mx-auto text-sm">
              Grábala con OBS Studio (1080p, 60 fps), añade voz con edge-tts gratis y tendrás un video
              de campaña sin captura de pantalla real.
            </p>
            <a href="https://obsproject.com/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-sm px-7 py-4 rounded-2xl shadow-xl mt-6 active:scale-95 hover:scale-[1.02] transition-all uppercase tracking-widest">
              Descargar OBS Studio
            </a>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
