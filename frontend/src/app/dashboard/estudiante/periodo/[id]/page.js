"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, Lightbulb, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api";

function parseInline(str, baseKey = 0) {
  const parts = [];
  let key = baseKey;
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex)
      parts.push(<span key={key++}>{str.slice(lastIndex, match.index)}</span>);
    if (match[1] !== undefined)
      parts.push(<strong key={key++} className="font-bold">{match[1]}</strong>);
    else
      parts.push(<em key={key++} className="italic">{match[2]}</em>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < str.length)
    parts.push(<span key={key++}>{str.slice(lastIndex)}</span>);
  return parts.length ? parts : [<span key={key}>{str}</span>];
}

function MarkdownText({ text, className = "" }) {
  const lines = (text || "").split("\n");
  const elements = [];
  lines.forEach((line, i) => {
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^\d+/)[0];
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="shrink-0 font-bold">{num}.</span>
          <span>{parseInline(line.replace(/^\d+\.\s/, ""), i * 100)}</span>
        </div>
      );
    } else if (/^\s*[\*\-]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="shrink-0">•</span>
          <span>{parseInline(line.replace(/^\s*[\*\-]\s/, ""), i * 100)}</span>
        </div>
      );
    } else {
      elements.push(<p key={i} className="my-0.5 leading-relaxed">{parseInline(line, i * 100)}</p>);
    }
  });
  return <div className={`text-sm ${className}`}>{elements}</div>;
}

const levelColor = (l) =>
  l === "SUPERIOR" ? "bg-emerald-500" : l === "ALTO" ? "bg-blue-500"
  : l === "BÁSICO" ? "bg-amber-500" : "bg-rose-500";

export default function PeriodoDetalle() {
  const router = useRouter();
  const { id: periodId } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("mocavi_student");
    const token = localStorage.getItem("mocavi_token");
    if (!raw || !token) { router.push("/login"); return; }
    const student = JSON.parse(raw);
    setStudentId(student.id);
    const ctrl = new AbortController();
    api.get(`/students/${student.id}/exam-results?period_id=${periodId}`, { signal: ctrl.signal })
      .then(d => { setResults(Array.isArray(d) ? d : []); setLoading(false); })
      .catch((e) => { if (e?.name !== "AbortError") setLoading(false); });
    return () => ctrl.abort();
  }, [periodId, router]);

  // Auto-logout si la API responde 401
  useEffect(() => {
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("mocavi:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mocavi:unauthorized", onUnauthorized);
  }, [router]);

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="animate-spin text-violet-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
            <ArrowLeft size={18} /> Volver
          </button>
          <ThemeToggle />
        </div>

        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Periodo {periodId}</h1>
        <p className="text-slate-400 text-sm mb-8">Resultados detallados por examen</p>

        {results.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <BookOpen size={44} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm">No hay exámenes calificados para este periodo aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r, idx) => {
              const answers = Array.isArray(r.answers) ? r.answers : [];
              const wrong = answers.filter(a => !a.is_correct);
              const correct = answers.filter(a => a.is_correct);
              const suggestions = (() => {
                try { return JSON.parse(r.ai_suggestions || "[]"); } catch { return []; }
              })();
              const isOpen = expanded === r.id;

              return (
                <div key={r.id} style={{ animationDelay: `${idx * 90}ms` }} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden animate-slideUp [animation-fill-mode:both]">
                  {/* Summary row */}
                  <button onClick={() => toggle(r.id)} className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-slate-800 dark:text-white">{r.score ?? "—"}</div>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Nota del examen</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold"><CheckCircle2 size={12} /> {correct.length} correctas</span>
                          <span className="flex items-center gap-1 text-xs text-rose-500 font-bold"><XCircle size={12} /> {wrong.length} incorrectas</span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-700 pt-5 space-y-5 animate-slideUp">
                      {/* Feedback IA */}
                      {r.ai_feedback && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
                          <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Feedback IA</p>
                          <MarkdownText text={r.ai_feedback} className="text-indigo-800 dark:text-indigo-200" />
                        </div>
                      )}

                      {/* Sugerencias */}
                      {suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><Lightbulb size={12} /> Sugerencias de estudio</p>
                          <ul className="space-y-2">
                            {suggestions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <span className="w-5 h-5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i+1}</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Preguntas incorrectas */}
                      {wrong.length > 0 && (
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><XCircle size={12} className="text-rose-400" /> Preguntas incorrectas</p>
                          <div className="space-y-2">
                            {wrong.map((a) => (
                              <div key={a.q} className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">P{a.q}</span>
                                  <span className="text-xs text-rose-600 dark:text-rose-400">Tu respuesta: <strong>{a.selected}</strong> · Correcta: <strong>{a.correct}</strong></span>
                                </div>
                                {a.why_wrong && <MarkdownText text={a.why_wrong} className="text-rose-700 dark:text-rose-300 mt-1" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
