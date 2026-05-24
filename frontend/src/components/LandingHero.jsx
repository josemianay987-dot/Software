"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Bot,
  BarChart2,
  MessageCircle,
  Loader2,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { api, ApiError } from "@/lib/api";

// Landing de KNOWTIFY — sigue el sistema de diseño v2.1:
// indigo-600 (primario docente), violet-600 (acento estudiante/IA),
// niveles emerald/blue/amber/rose para estados, soporte dark vía .dark.
export default function LandingHero() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind, msg }

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      // Listo para integrarse cuando exista /newsletter en el backend.
      await api.post("/newsletter", { email: email.trim() });
      setFeedback({ kind: "success", msg: "¡Te avisaremos de cada novedad!" });
      setEmail("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setFeedback({ kind: "error", msg: "No se pudo conectar con el servidor." });
      } else if (err instanceof ApiError && err.status === 422) {
        setFeedback({ kind: "warn", msg: "Escribe un correo válido (ej. nombre@correo.com)." });
      } else if (err instanceof ApiError && err.status === 429) {
        setFeedback({ kind: "warn", msg: "Demasiados intentos. Espera un momento." });
      } else {
        setFeedback({
          kind: "error",
          msg: err instanceof ApiError ? err.message : "Ocurrió un error. Intenta de nuevo.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const feedbackStyles = {
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    info:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    warn:    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    error:   "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
  };

  return (
    <PublicShell>
      <div className="animate-fadeIn">
      {/* ===== HERO ===== */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* IZQUIERDA — Hero ilustración + copy */}
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <Sparkles size={14} /> Plataforma educativa con IA
          </span>

          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] text-slate-900 dark:text-white">
            Educación{" "}
            <span className="text-indigo-600 dark:text-indigo-400">moderna</span>,
            calificación{" "}
            <span className="text-violet-600 dark:text-violet-400">inteligente</span>.
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
            KNOWTIFY conecta docentes, estudiantes y tutoría IA en una sola plataforma:
            calificación masiva con visión por IA, mensajería en tiempo real y un
            dashboard claro de desempeño por periodo.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-7 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-[1.02] uppercase tracking-widest"
            >
              Comenzar ahora <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/guia")}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm px-7 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            >
              Más información
            </button>
          </div>

          {/* Mini feature row — usa la paleta de niveles para diferenciar pilares */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
            {[
              { icon: <BarChart2 size={18} />, label: "Notas",      color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
              { icon: <Bot size={18} />,       label: "Tutor IA",   color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
              { icon: <MessageCircle size={18} />, label: "Mensajes", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${f.bg} ${f.color}`}>{f.icon}</div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DERECHA — Newsletter Card */}
        <div className="relative">
          {/* Halo decorativo violeta detrás de la card */}
          <div className="absolute -inset-6 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-transparent rounded-[3rem] blur-2xl pointer-events-none" />

          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 border-4 border-indigo-600 shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/30 animate-springIn">
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/30">
                <Mail size={28} />
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2 tracking-tight">
              Mantente al día
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
              Recibe novedades de KNOWTIFY: nuevas funciones, materiales y guías
              para sacarle el máximo provecho a la plataforma.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 pl-12 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-600 border border-slate-200 dark:border-slate-700 transition-all"
                />
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-[1.01] uppercase tracking-widest text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Suscribirme <ArrowRight size={16} />
                  </>
                )}
              </button>

              {feedback && (
                <div
                  role="status"
                  className={`flex items-start gap-2 px-4 py-3 rounded-2xl border text-sm font-medium animate-fadeIn ${feedbackStyles[feedback.kind]}`}
                >
                  {feedback.kind === "success" ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.msg}</span>
                </div>
              )}
            </form>

            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-6 font-bold uppercase tracking-widest">
              Sin spam · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>
      </div>
    </PublicShell>
  );
}
