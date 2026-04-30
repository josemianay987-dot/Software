"use client";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { api, ApiError } from "@/lib/api";

const CONTACT_INFO = [
  {
    icon: <Mail size={20} />,
    title: "Email",
    value: "developers@knowtify.app",
    href: "mailto:hola@knowtify.app",
    color: "indigo",
  },
  {
    icon: <Phone size={20} />,
    title: "Teléfono",
    value: "+57 302 557 6960",
    href: "tel:+573025576960",
    color: "violet",
  },
  {
    icon: <MapPin size={20} />,
    title: "Ubicación",
    value: "Montería, Colombia",
    href: "#",
    color: "emerald",
  },
  {
    icon: <MessageCircle size={20} />,
    title: "Soporte",
    value: "Lun a Vie · 8am – 6pm",
    href: "#",
    color: "blue",
  },
];

const ACCENT = {
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-100 dark:bg-violet-900/30" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-100 dark:bg-blue-900/30" },
};
const accent = (c) => ACCENT[c] || ACCENT.indigo;

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "general", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim() || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      // Listo para integrarse cuando exista /contact en el backend.
      await api.post("/contact", form);
      setFeedback({ kind: "success", msg: "Mensaje enviado. Te respondemos en menos de 24h." });
      setForm({ name: "", email: "", subject: "general", message: "" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setFeedback({ kind: "error", msg: "No se pudo conectar con el servidor." });
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
    warn:    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    error:   "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
  };

  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* HERO */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <MessageCircle size={14} /> Estamos cerca
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Hablemos de tu{" "}
            <span className="text-indigo-600 dark:text-indigo-400">aula</span>.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Sea para una demo, una consulta o un comentario, contesto siempre. Escríbenos
            y te respondemos en menos de 24 horas.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* INFO LATERAL */}
          <aside className="lg:col-span-2 space-y-4">
            {CONTACT_INFO.map((c, i) => {
              const a = accent(c.color);
              return (
                <a
                  key={c.title}
                  href={c.href}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="flex items-start gap-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all animate-slideUp [animation-fill-mode:both]"
                >
                  <div className={`p-3 rounded-2xl ${a.bg} ${a.text}`}>{c.icon}</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {c.title}
                    </p>
                    <p className="font-black text-slate-900 dark:text-white mt-0.5">
                      {c.value}
                    </p>
                  </div>
                </a>
              );
            })}

            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl p-6 mt-2 shadow-xl shadow-indigo-500/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                ¿Eres docente?
              </p>
              <h3 className="text-xl font-black mt-1">Demo personalizada</h3>
              <p className="text-sm text-indigo-100 mt-2">
                Te mostramos KNOWTIFY con tus propios datos en una llamada de 20 minutos.
              </p>
            </div>
          </aside>

          {/* FORMULARIO */}
          <div className="lg:col-span-3">
            <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border-4 border-indigo-600 shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/30 animate-springIn">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                Envíanos un mensaje
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Te respondemos al correo que indiques.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Nombre"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="Tu nombre"
                    required
                    disabled={submitting}
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="tu@correo.com"
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                    Motivo
                  </label>
                  <select
                    value={form.subject}
                    onChange={update("subject")}
                    disabled={submitting}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  >
                    <option value="general">Consulta general</option>
                    <option value="demo">Solicitar demo</option>
                    <option value="ventas">Plan Institución</option>
                    <option value="soporte">Soporte técnico</option>
                    <option value="prensa">Prensa o alianzas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                    Mensaje
                  </label>
                  <textarea
                    value={form.message}
                    onChange={update("message")}
                    rows={6}
                    required
                    disabled={submitting}
                    placeholder="Cuéntanos qué necesitas..."
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.name.trim() || !form.email.trim() || !form.message.trim()}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-[1.01] uppercase tracking-widest text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar mensaje <Send size={16} />
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
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
        {label}
      </label>
      <input
        {...props}
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
      />
    </div>
  );
}
