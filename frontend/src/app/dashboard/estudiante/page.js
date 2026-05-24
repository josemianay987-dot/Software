"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import {
  GraduationCap,
  BookOpen,
  LogOut,
  BarChart2,
  Star,
  TrendingUp,
  Award,
  Loader2,
  MessageCircle,
  ChevronRight,
  Bot,
  CalendarDays,
  Clock,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import HelpTip from "@/components/HelpTip";

// recharts (~120KB) solo cuando hay notas que graficar
const EvolutionChart = dynamic(() => import("@/components/EvolutionChart"), { ssr: false, loading: () => null });

const levelColor = (l) =>
  l === "SUPERIOR" ? "bg-emerald-500"
  : l === "ALTO"   ? "bg-blue-500"
  : l === "BÁSICO" ? "bg-amber-500"
  : "bg-rose-500";

const levelGlow = (l) =>
  l === "SUPERIOR" ? "shadow-emerald-500/20"
  : l === "ALTO"   ? "shadow-blue-500/20"
  : l === "BÁSICO" ? "shadow-amber-500/20"
  : "shadow-rose-500/20";

export default function EstudianteDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [events, setEvents] = useState([]); // #10 próximos eventos
  const wsRef = useRef(null);
  const docIdRef = useRef(null);

  useEffect(() => {
    const session = localStorage.getItem("mocavi_session");
    const studentRaw = localStorage.getItem("mocavi_student");
    const token = localStorage.getItem("mocavi_token");
    if (session !== "student" || !studentRaw || !token) {
      router.push("/login");
      return;
    }
    const { document_id } = JSON.parse(studentRaw);
    docIdRef.current = document_id;
    const ctrl = new AbortController();
    api.get(`/student/dashboard`, { signal: ctrl.signal })
      .then((d) => {
        setData(d); setIsLoading(false);
        // #10 — cargar próximos eventos de su grado/grupo
        const g = d?.student?.grade, gr = d?.student?.grupo;
        const qs = new URLSearchParams({ days: "30" });
        if (g) qs.set("grade", g);
        if (gr) qs.set("grupo", gr);
        api.get(`/events/upcoming?${qs}`, { signal: ctrl.signal })
          .then((ev) => setEvents(Array.isArray(ev) ? ev : []))
          .catch(() => {});
      })
      .catch((e) => { if (e?.name !== "AbortError") router.push("/login"); });
    return () => ctrl.abort();
  }, [router]);

  // Auto-logout si la API responde 401 (token expirado/manipulado)
  useEffect(() => {
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("mocavi:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mocavi:unauthorized", onUnauthorized);
  }, [router]);

  const fetchUnread = useCallback(async (signal) => {
    const docId = docIdRef.current;
    if (!docId) return;
    try {
      const d = await api.get(
        `/messages/unread-count?user_id=${encodeURIComponent(docId)}`,
        { signal },
      );
      setUnreadMsgs(d.count);
    } catch (_) {}
  }, []);

  // Polling + WebSocket. Antes 8s; con WebSocket activo basta cada 30s.
  useEffect(() => {
    if (!data) return;
    const token = localStorage.getItem("mocavi_token");
    if (!token) return;

    const ctrl = new AbortController();
    fetchUnread(ctrl.signal);
    const interval = setInterval(() => fetchUnread(ctrl.signal), 30000);

    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL.replace("http", "ws")}/ws/${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = () => { fetchUnread(ctrl.signal); };
    ws.onerror = () => {};

    return () => {
      clearInterval(interval);
      ctrl.abort();
      ws.close();
    };
  }, [data, fetchUnread]);

  const handleLogout = () => {
    localStorage.removeItem("mocavi_session");
    localStorage.removeItem("mocavi_student");
    localStorage.removeItem("mocavi_token");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-violet-500 animate-spin" size={40} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
          Cargando tus notas...
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { student, grades } = data;
  const graded = grades.filter((g) => g.final_period_score != null);
  const avg =
    graded.length > 0
      ? (graded.reduce((a, g) => a + g.final_period_score, 0) / graded.length).toFixed(2)
      : null;
  const bestGrade = graded.length > 0 ? Math.max(...graded.map((g) => g.final_period_score)) : null;
  const latestLevel = graded.length > 0 ? graded[graded.length - 1].performance_level : null;

  // #6 — datos para la gráfica de evolución
  const chartData = graded.map((g) => ({ label: `P${g.period_id}`, nota: g.final_period_score }));

  // #10 — colores por tipo de evento
  const evTypeColor = {
    evaluacion: "bg-rose-500", actividad: "bg-amber-500", evento: "bg-indigo-500", otro: "bg-slate-400",
  };
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-3 rounded-2xl shadow-lg shadow-violet-500/30">
              <GraduationCap size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                KNOWTIFY
                <HelpTip variant="info" side="bottom" title="¿Cómo me muevo aquí?" text="Arriba ves tu promedio y nivel. Abajo, tus periodos con el detalle de cada examen. Con los botones flotantes hablas con el Tutor IA o con tu docente." />
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                Portal Estudiante
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-rose-400 text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>

        {/* Student hero card */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 mb-6 shadow-2xl shadow-violet-500/20">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <p className="text-violet-300 text-xs font-bold uppercase tracking-widest mb-1">
                Bienvenido
              </p>
              <h2 className="text-3xl font-black text-white leading-tight">{student.full_name}</h2>
              <p className="text-violet-300 text-sm mt-1">Documento: {student.document_id}</p>
              {student.email && (
                <p className="text-violet-300 text-sm">{student.email}</p>
              )}
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-violet-300 text-xs font-bold uppercase tracking-widest mb-1 inline-flex items-center gap-1.5 sm:justify-end">
                Promedio General
                <HelpTip tone="white" side="right" text="Es el promedio de todas tus notas finales calificadas. La etiqueta de color indica tu nivel actual de desempeño." />
              </p>
              <p className="text-6xl font-black text-white leading-none">{avg ?? "—"}</p>
              {latestLevel && (
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-black text-white ${levelColor(latestLevel)}`}>
                  {latestLevel}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
            {[
              { icon: <BarChart2 size={18} />, value: grades.length, label: "Periodos" },
              { icon: <Star size={18} />,     value: bestGrade ?? "—", label: "Mejor Nota" },
              { icon: <TrendingUp size={18} />, value: graded.length, label: "Calificados" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="flex justify-center text-violet-200 mb-1">{icon}</div>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-violet-300 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* #6 Evolución + #10 Próximos eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Gráfica de evolución */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
              <h3 className="text-slate-800 dark:text-white font-black text-sm uppercase tracking-widest">
                Evolución de tu promedio
              </h3>
              <HelpTip text="Tu nota final en cada periodo. La línea naranja punteada marca el 3.0 (aprobación)." />
            </div>
            {chartData.length > 0 ? (
              <EvolutionChart data={chartData} />
            ) : (
              <p className="text-slate-400 text-sm py-10 text-center">Aún no hay periodos calificados para graficar.</p>
            )}
          </div>

          {/* Próximos eventos */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <CalendarDays size={16} className="text-indigo-500" />
              <h3 className="text-slate-800 dark:text-white font-black text-sm uppercase tracking-widest">
                Próximos eventos
              </h3>
              <HelpTip text="Evaluaciones y actividades que tu docente programó para tu grado y grupo." />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-64">
              {events.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-10 font-bold">Sin eventos próximos</p>
              )}
              {events.map((ev) => {
                const d = new Date(ev.event_date + "T00:00:00");
                const daysLeft = Math.round((d - today0) / 86400000);
                return (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${evTypeColor[ev.event_type] || evTypeColor.otro}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{ev.title}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : `En ${daysLeft} días`}
                        {" · "}{d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grade cards */}
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-violet-500 dark:text-violet-400" />
          <h3 className="text-slate-800 dark:text-white font-black text-sm uppercase tracking-widest">
            Historial de Periodos
          </h3>
          <HelpTip text="Cada tarjeta es un periodo. Pulsa sobre ella para ver el detalle de tus exámenes, el feedback de la IA y en qué fallaste." />
        </div>

        {grades.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <BookOpen size={44} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm">
              Aún no hay notas registradas para tu cuenta.
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Consulta con tu docente para más información.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {grades.map((g, i) => (
              <div
                key={i}
                onClick={() => router.push(`/dashboard/estudiante/periodo/${g.period_id}`)}
                style={{ animationDelay: `${i * 80}ms` }}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all animate-slideUp opacity-0 [animation-fill-mode:both] ${g.performance_level ? levelGlow(g.performance_level) : ""}`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl">
                      <BarChart2 size={18} className="text-violet-500 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-white font-black text-sm">Periodo {g.period_id}</p>
                      {g.updated_at && (
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          {new Date(g.updated_at).toLocaleDateString("es-CO", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  {g.performance_level ? (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${levelColor(g.performance_level)}`}>
                      {g.performance_level}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black text-slate-500 bg-slate-200 dark:bg-slate-700">
                      PENDIENTE
                    </span>
                  )}
                </div>

                {/* Final score big */}
                <div className="text-center my-4">
                  <p className="text-7xl font-black text-slate-900 dark:text-white leading-none">
                    {g.final_period_score != null ? g.final_period_score : "—"}
                  </p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                    Nota Final del Periodo
                  </p>
                </div>

                {/* Saber / Hacer / Ser */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {[
                    ["Saber", g.score_saber],
                    ["Hacer", g.score_hacer],
                    ["Ser",   g.score_ser],
                  ].map(([label, val]) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
                        {val != null ? val : "—"}
                      </p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botones flotantes */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          <button
            onClick={() => router.push("/dashboard/estudiante/chat")}
            title="Tutor IA: resuelve dudas de cualquier materia, 24/7"
            style={{ animationDelay: "120ms" }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-xl shadow-violet-500/30 transition-all active:scale-95 hover:scale-105 animate-slideUp [animation-fill-mode:both]"
          >
            <Bot size={18} /> Tutor IA
          </button>
          <button
            onClick={() => { setUnreadMsgs(0); router.push("/dashboard/estudiante/mensajes"); }}
            title="Mensajes: conversa en privado con tu docente"
            style={{ animationDelay: "200ms" }}
            className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-105 animate-slideUp [animation-fill-mode:both]"
          >
            <MessageCircle size={18} /> Mensajes
            {unreadMsgs > 0 && (
              <span key={unreadMsgs} className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg animate-badgePop animate-bounce">
                {unreadMsgs > 9 ? "9+" : unreadMsgs}
              </span>
            )}
          </button>
        </div>

        <p className="mt-10 text-center text-slate-400 dark:text-slate-700 text-[10px] font-bold uppercase tracking-[0.2em]">
          KNOWTIFY v2.0 • Jose - Selenis - Marinelly Dev Studio © 2026
        </p>
      </div>
    </div>
  );
}
