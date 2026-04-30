"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  User,
  BookOpen,
  Users,
  UploadCloud,
  FileSpreadsheet,
  Save,
  Pencil,
  Trash2,
  Bot,
  MessageCircle,
  Bell,
  CalendarDays,
  CalendarPlus,
  BarChart2,
  TrendingUp,
  Star,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Download,
  ChevronRight,
} from "lucide-react";
import PublicShell from "@/components/PublicShell";

// Tailwind 4 JIT-safe: usamos lookups con strings literales
const ACCENT = {
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-100 dark:bg-indigo-900/30",   ring: "ring-indigo-500/30" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-100 dark:bg-violet-900/30",   ring: "ring-violet-500/30" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", ring: "ring-emerald-500/30" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-100 dark:bg-blue-900/30",       ring: "ring-blue-500/30" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-100 dark:bg-amber-900/30",     ring: "ring-amber-500/30" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-100 dark:bg-rose-900/30",       ring: "ring-rose-500/30" },
};
const accent = (c) => ACCENT[c] || ACCENT.indigo;

// ===== Datos de la guía =====
const TEACHER_FEATURES = [
  {
    icon: <Lock size={20} />,
    title: "Iniciar sesión como docente",
    color: "indigo",
    steps: [
      'Entra a "Iniciar sesión" desde el menú superior.',
      'Asegúrate de que esté seleccionada la pestaña "Docente".',
      "Escribe tu usuario y contraseña asignada.",
      'Pulsa "Entrar al sistema". El JWT se guarda en el navegador y dura 24 horas; al expirar, vuelve a iniciar sesión.',
    ],
  },
  {
    icon: <BookOpen size={20} />,
    title: "Seleccionar grado, grupo y periodo",
    color: "violet",
    steps: [
      'En la pestaña "Notas", usa los selectores de "Clase Activa".',
      "Cambia entre periodos 1 a 4 según lo que estés calificando.",
      'La selección se recuerda entre sesiones (queda guardada en tu navegador).',
    ],
  },
  {
    icon: <Users size={20} />,
    title: "Inscribir estudiantes (uno a uno)",
    color: "indigo",
    steps: [
      'Pulsa "Inscribir Individual".',
      "Completa nombre, número de documento y correo (opcional).",
      'Click "Guardar". El estudiante se asocia automáticamente al grado y grupo activos.',
      'No se puede inscribir dos veces el mismo documento; el sistema lo bloquea.',
    ],
  },
  {
    icon: <FileSpreadsheet size={20} />,
    title: "Importar estudiantes desde Excel/CSV",
    color: "emerald",
    steps: [
      'Pulsa "Importar Excel".',
      "Selecciona un archivo .xlsx o .csv con columnas de nombre, documento y opcionalmente correo.",
      'KNOWTIFY detecta los nombres de las columnas automáticamente (ej. "cédula", "nro", "email").',
      "Al terminar verás cuántos estudiantes fueron creados y cuántos omitidos por estar duplicados.",
      'Tamaño máximo 10 MB. Hasta 10 importaciones por minuto.',
    ],
  },
  {
    icon: <Save size={20} />,
    title: "Calificar manualmente (Saber, Hacer, Ser)",
    color: "blue",
    steps: [
      "En la tabla de estudiantes, escribe los valores de Saber, Hacer y Ser (escala 1.0 a 5.0).",
      'Pulsa el ícono guardar (azul) en la fila correspondiente.',
      "El sistema calcula la nota final como promedio y asigna el nivel: SUPERIOR (≥4.6), ALTO (≥4.0), BÁSICO (≥3.0) o BAJO.",
      "Si guardas otra vez para el mismo estudiante y periodo, se actualiza la nota anterior.",
    ],
  },
  {
    icon: <UploadCloud size={20} />,
    title: "Calificador masivo con IA (Gemini Vision)",
    color: "violet",
    steps: [
      'En el panel "Calificador Masivo IA", elige la materia.',
      "Sube una imagen o PDF con los exámenes del grupo (≤ 20 MB).",
      'Pulsa "Iniciar IA": el sistema identifica nombres, respuestas, calcula notas y genera feedback por estudiante.',
      "Verás los resultados en una tabla con estadísticas por pregunta y un gráfico de errores.",
      "Puedes editar manualmente cualquier nota o nombre antes de exportar.",
      'Exporta a Excel o PDF desde los botones del modal. Hasta 12 análisis por minuto.',
    ],
  },
  {
    icon: <BarChart2 size={20} />,
    title: "Ver estadísticas del grupo",
    color: "blue",
    steps: [
      "El dashboard superior muestra total de estudiantes, promedio del grupo y estudiantes en riesgo (nivel BAJO).",
      "El modal del calificador IA incluye un gráfico de % de error por pregunta y resalta las preguntas más difíciles.",
      "Útil para detectar temas que necesitas reforzar con todo el grupo.",
    ],
  },
  {
    icon: <CalendarDays size={20} />,
    title: "Calendario de eventos",
    color: "indigo",
    steps: [
      'Cambia a la pestaña "Calendario" en la parte superior.',
      'Pulsa "Nuevo Evento" o haz click en cualquier día.',
      "Define título, fecha, tipo (Evaluación, Actividad, Evento, Otro) y descripción.",
      "Los eventos se asocian al grado y grupo activos.",
      'En el panel lateral aparecen los próximos 7 días y todos los eventos del mes.',
    ],
  },
  {
    icon: <Bell size={20} />,
    title: "Notificaciones de la campana",
    color: "rose",
    steps: [
      'El ícono de campana muestra mensajes sin leer y eventos próximos.',
      "El badge rojo indica cantidad de pendientes.",
      'Haz click para ver el resumen y saltar al calendario o a los mensajes directamente.',
    ],
  },
  {
    icon: <MessageCircle size={20} />,
    title: "Mensajería con estudiantes",
    color: "indigo",
    steps: [
      'Pulsa el botón flotante "Mensajes" abajo a la derecha.',
      "Verás todas las conversaciones con su último mensaje y conteo de no leídos.",
      "Click en una conversación para abrir el hilo; al abrirla se marcan como leídos automáticamente.",
      "Escribe tu respuesta y envía con Enter o el botón.",
      'Los mensajes llegan en tiempo real al estudiante por WebSocket; si no está conectado, los recibe la próxima vez que abra la app.',
    ],
  },
  {
    icon: <Trash2 size={20} />,
    title: "Eliminar un estudiante",
    color: "rose",
    steps: [
      "En la fila del estudiante, pulsa el ícono rojo de papelera.",
      "Confirma la acción.",
      'Se eliminan también sus notas asociadas. Acción irreversible.',
    ],
  },
  {
    icon: <Download size={20} />,
    title: "Exportar resultados del calificador IA",
    color: "emerald",
    steps: [
      "Cuando termine un análisis IA, en el modal de resultados encontrarás dos botones.",
      '"Exportar Excel" descarga un CSV con nombre, nota y nivel.',
      '"Exportar PDF" abre una vista imprimible con tabla lista para impresión o guardado como PDF.',
    ],
  },
];

const STUDENT_FEATURES = [
  {
    icon: <Lock size={20} />,
    title: "Iniciar sesión como estudiante",
    color: "violet",
    steps: [
      'Entra a "Iniciar sesión" desde el menú superior.',
      'Selecciona la pestaña "Estudiante".',
      "Ingresa tu número de documento (no necesitas contraseña).",
      'Pulsa "Ver mis Notas" para acceder al portal.',
    ],
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Ver tu promedio general",
    color: "violet",
    steps: [
      "En la parte superior aparece tu nombre, documento y correo.",
      "El número grande es tu promedio general en escala 1.0 a 5.0.",
      "El nivel actual (SUPERIOR/ALTO/BÁSICO/BAJO) se muestra como una etiqueta de color al lado.",
      "Las tres estadísticas inferiores: cantidad de periodos, mejor nota y total calificados.",
    ],
  },
  {
    icon: <BarChart2 size={20} />,
    title: "Consultar tus notas por periodo",
    color: "indigo",
    steps: [
      'En "Historial de Periodos" verás una tarjeta por cada periodo evaluado.',
      "La tarjeta muestra: nota final, nivel de desempeño y desglose por dimensión (Saber, Hacer, Ser).",
      'Click en cualquier tarjeta para abrir el detalle de ese periodo.',
    ],
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: "Ver detalle de exámenes y aciertos",
    color: "emerald",
    steps: [
      "Dentro del periodo verás cada examen calificado por la IA.",
      "Cada examen muestra tu nota, cantidad de correctas e incorrectas.",
      'Click en el examen para expandir el detalle completo.',
      "Verás feedback personalizado generado por IA sobre tu desempeño.",
      "Lista de sugerencias de estudio concretas adaptadas a tus errores.",
      "Para cada pregunta incorrecta: tu respuesta, la correcta y una explicación de por qué fallaste.",
    ],
  },
  {
    icon: <Bot size={20} />,
    title: "Tutor IA conversacional",
    color: "violet",
    steps: [
      'Pulsa el botón flotante "Tutor IA" abajo a la derecha.',
      "Escribe tu pregunta sobre cualquier tema académico.",
      "El tutor responde con explicaciones, ejemplos y formato enriquecido (negritas, listas).",
      "Puedes hacer preguntas de seguimiento; el tutor recuerda los últimos 6 intercambios.",
      "Disponible 24/7. Hasta 20 mensajes por minuto.",
    ],
  },
  {
    icon: <MessageCircle size={20} />,
    title: "Mensajería con tu docente",
    color: "indigo",
    steps: [
      'Pulsa el botón flotante "Mensajes".',
      "Escribe tu mensaje en el cuadro inferior.",
      "Tu docente lo recibe en tiempo real; si está conectado, le llega al instante.",
      "El badge rojo del botón te avisa cuando hay respuestas nuevas.",
      "Las conversaciones se ordenan por fecha; los días se marcan como Hoy / Ayer / fecha exacta.",
    ],
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Aprovechar el feedback de la IA",
    color: "amber",
    steps: [
      "Después de cada examen calificado por IA, revisa la sección de Feedback.",
      "Las sugerencias están priorizadas según los temas donde más fallaste.",
      "Combínalas con preguntas al Tutor IA para reforzar antes del siguiente examen.",
    ],
  },
  {
    icon: <Star size={20} />,
    title: "Niveles de desempeño",
    color: "emerald",
    steps: [
      "SUPERIOR (verde): nota ≥ 4.6 — excelente dominio del periodo.",
      "ALTO (azul): nota ≥ 4.0 — buen rendimiento, sigue así.",
      "BÁSICO (amarillo): nota ≥ 3.0 — aprobado, hay margen para mejorar.",
      "BAJO (rojo): nota < 3.0 — atención, conviene reforzar y hablar con tu docente.",
    ],
  },
];

export default function GuiaPage() {
  const router = useRouter();
  const [audience, setAudience] = useState("teacher"); // teacher | student
  const isTeacher = audience === "teacher";
  const features = isTeacher ? TEACHER_FEATURES : STUDENT_FEATURES;
  const themeColor = isTeacher ? "indigo" : "violet";

  return (
    <PublicShell>
      <div className="animate-fadeIn">
        {/* HERO */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            <Sparkles size={14} /> Guía de uso
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mt-6">
            Cómo usar{" "}
            <span className="text-indigo-600 dark:text-indigo-400">KNOWTIFY</span>{" "}
            paso a paso.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Recorre todas las funcionalidades de la plataforma, organizadas por
            tipo de usuario. Cambia entre la guía del docente y la del estudiante
            con un click.
          </p>

          {/* Toggle docente / estudiante (mismo patrón que Mensual/Anual) */}
          <div className="inline-flex items-center gap-2 mt-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setAudience("teacher")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isTeacher
                  ? "bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <GraduationCap size={16} /> Docente
            </button>
            <button
              onClick={() => setAudience("student")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
                !isTeacher
                  ? "bg-white dark:bg-slate-700 shadow-md text-violet-600 dark:text-violet-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <User size={16} /> Estudiante
            </button>
          </div>
        </section>

        {/* MINI-INDICE — números rápidos */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 mb-10">
          <div
            key={audience}
            className={`bg-gradient-to-br ${
              isTeacher
                ? "from-indigo-600 to-violet-600"
                : "from-violet-600 to-indigo-600"
            } rounded-3xl px-8 py-7 text-white shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/40 animate-springIn flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">
                {isTeacher ? "Portal Docente" : "Portal Estudiante"}
              </p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                {features.length} funcionalidades disponibles
              </h2>
              <p className="text-sm text-white/80 mt-1.5 max-w-xl">
                {isTeacher
                  ? "Gestiona tu clase de extremo a extremo: notas, exámenes, IA, calendario y mensajería."
                  : "Consulta tu progreso, recibe feedback IA, conversa con tu docente y resuelve dudas con el Tutor IA."}
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="shrink-0 inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 active:scale-95 hover:scale-[1.02] font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl uppercase tracking-widest transition-all"
            >
              Probar ahora <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* GRID DE FEATURES */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-12">
          <div key={audience} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => {
              const a = accent(f.color);
              return (
                <article
                  key={f.title}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all animate-slideUp [animation-fill-mode:both]"
                >
                  <header className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-2xl ${a.bg} ${a.text} shrink-0`}>
                      {f.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Paso {i + 1}
                      </span>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                        {f.title}
                      </h3>
                    </div>
                  </header>

                  <ol className="space-y-2.5 pl-1">
                    {f.steps.map((s, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                      >
                        <span className={`shrink-0 w-5 h-5 rounded-full ${a.bg} ${a.text} flex items-center justify-center text-[10px] font-black mt-0.5`}>
                          {idx + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-20">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border-4 border-indigo-600 shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/30 text-center animate-springIn">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
              ¿Listo para empezar?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto">
              Inicia sesión con tus credenciales y aplica todo lo que acabas de
              aprender.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-7 py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-[1.02] uppercase tracking-widest"
              >
                Iniciar sesión <ArrowRight size={16} />
              </button>
              <button
                onClick={() => router.push("/contacto")}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm px-7 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
              >
                Solicitar demo
              </button>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
