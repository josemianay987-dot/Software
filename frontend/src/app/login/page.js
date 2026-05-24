"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ThemeToggle from "@/components/ThemeToggle";
import HelpTip from "@/components/HelpTip";
import { api, ApiError } from "@/lib/api";
import {
  GraduationCap,
  Save,
  User,
  CheckCircle,
  Plus,
  X,
  Trash2,
  Users,
  TrendingUp,
  AlertTriangle,
  Lock,
  Loader2,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Pencil,
  Download,
  ChevronDown,
  BookOpen,
  MessageCircle,
  Bell,
  BarChart2,
  FlaskConical,
  Send,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
// Recharts es ~120KB; se carga bajo demanda al abrir el modal de estadísticas.
const ExamErrorChart = dynamic(
  () => import("@/components/ExamErrorChart"),
  { ssr: false, loading: () => null },
);

const SUBJECTS = [
  "Matemáticas",
  "Física",
  "Química",
  "Biología",
  "Historia",
  "Geografía",
  "Español",
  "Inglés",
  "Filosofía",
  "Arte",
  "Educación Física",
];

const GRADES = [
  { value: "1", label: "1° Primaria" },
  { value: "2", label: "2° Primaria" },
  { value: "3", label: "3° Primaria" },
  { value: "4", label: "4° Primaria" },
  { value: "5", label: "5° Primaria" },
  { value: "6", label: "6° Secundaria" },
  { value: "7", label: "7° Secundaria" },
  { value: "8", label: "8° Secundaria" },
  { value: "9", label: "9° Secundaria" },
  { value: "10", label: "10° Media" },
  { value: "11", label: "11° Bachillerato" },
];
const SECTIONS = ["1", "2", "3", "4", "5", "6"];
const PERIODS = [
  { value: "1", label: "1° Periodo" },
  { value: "2", label: "2° Periodo" },
  { value: "3", label: "3° Periodo" },
  { value: "4", label: "4° Periodo" },
];

export default function GradeTable() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginRole, setLoginRole] = useState("teacher");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [students, setStudents] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("11");
  const [selectedGrupo, setSelectedGrupo] = useState("1");
  const [selectedPeriodo, setSelectedPeriodo] = useState("1");
  const [isAdding, setIsAdding] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    document_id: "",
    email: "",
  });

  // --- NUEVOS ESTADOS PARA CALIFICACIÓN MASIVA ---
  const [examFile, setExamFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValues, setEditValues] = useState({ full_name: "", score: "" });
  const [aiError, setAiError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("Matemáticas");
  // --- MODO CALIFICADOR: "ia" (Gemini) | "omr" (lector de burbujas) ---
  const [graderMode, setGraderMode] = useState("omr");
  const [omrNumQ, setOmrNumQ] = useState(25);
  const [omrKey, setOmrKey] = useState({}); // { 1:"A", 2:"C", ... }
  const [downloadingSheet, setDownloadingSheet] = useState(false);
  // #2 — guardar notas del OMR como calificación
  const [lastEngine, setLastEngine] = useState(null); // "ia" | "omr"
  const [omrAssign, setOmrAssign] = useState({});      // { idxHoja: student_id }
  const [omrDimension, setOmrDimension] = useState("saber");
  const [omrPeriod, setOmrPeriod] = useState("1");     // periodo donde se guarda el examen OMR
  const [savingOmr, setSavingOmr] = useState(false);
  // #27 — cambio de contraseña del docente
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { ok, text }
  // #13 — generador de exámenes con IA
  const [genTopic, setGenTopic] = useState("");
  const [genQuestions, setGenQuestions] = useState(10);
  const [genDifficulty, setGenDifficulty] = useState("media");
  const [generatingExam, setGeneratingExam] = useState(false);
  const [generatedExam, setGeneratedExam] = useState(null);
  const [genError, setGenError] = useState(null);
  const [examStats, setExamStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showInbox, setShowInbox] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeConvName, setActiveConvName] = useState("");
  const [convMessages, setConvMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isClosingInbox, setIsClosingInbox] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- CALENDARIO ---
  const [activeTab, setActiveTab] = useState("notas"); // "notas" | "calendario"
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_type: "evento",
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  useEffect(() => {
    const sessionActive = localStorage.getItem("mocavi_session");
    if (sessionActive === "teacher") {
      setIsAuthenticated(true);
      const savedGrade = localStorage.getItem("mocavi_grade");
      const savedGrupo = localStorage.getItem("mocavi_grupo");
      const savedPeriodo = localStorage.getItem("mocavi_periodo");
      if (savedGrade) setSelectedGrade(savedGrade);
      if (savedGrupo) setSelectedGrupo(savedGrupo);
      if (savedPeriodo) setSelectedPeriodo(savedPeriodo);
    } else if (sessionActive === "student") {
      router.push("/dashboard/estudiante");
    }
    setTimeout(() => setIsLoading(false), 400);
  }, [router]);

  const handleGradeChange = (val) => {
    setSelectedGrade(val);
    localStorage.setItem("mocavi_grade", val);
  };

  const handleGrupoChange = (val) => {
    setSelectedGrupo(val);
    localStorage.setItem("mocavi_grupo", val);
  };

  const handlePeriodoChange = (val) => {
    setSelectedPeriodo(val);
    localStorage.setItem("mocavi_periodo", val);
  };

  const closeAiModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowAiModal(false);
      setShowStats(false);
      setExamStats(null);
      setEditingIdx(null);
      setIsClosingModal(false);
    }, 220);
  };

  const closeInbox = () => {
    setIsClosingInbox(true);
    setTimeout(() => {
      setShowInbox(false);
      setActiveConv(null);
      setIsClosingInbox(false);
    }, 260);
  };

  const getCurrentUserId = () => {
    const user = localStorage.getItem("mocavi_user");
    return user ? JSON.parse(user).id || JSON.parse(user).username : null;
  };

  const fetchExamStats = useCallback(async (examId) => {
    try {
      const data = await api.get(`/exams/${examId}/stats`);
      setExamStats(data);
      setShowStats(true);
    } catch (_) {}
  }, []);

  const fetchUnread = useCallback(async (signal) => {
    const session = localStorage.getItem("mocavi_session");
    if (session !== "teacher") return;
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      const d = await api.get(
        `/messages/unread-count?user_id=${encodeURIComponent(userId)}`,
        { signal },
      );
      setUnreadCount(d.count);
    } catch (e) {
      if (e?.name !== "AbortError") console.error("Error fetching unread:", e);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      const data = await api.get(
        `/messages/conversations?teacher_id=${encodeURIComponent(userId)}`,
      );
      setConversations(data || []);
    } catch (e) {
      console.error("Error fetching conversations:", e);
    }
  }, []);

  const openConversation = async (otherId) => {
    const userId = getCurrentUserId();
    if (!userId) return;
    setActiveConv(otherId);
    try {
      const data = await api.get(
        `/messages/?user_id=${encodeURIComponent(userId)}&other_id=${encodeURIComponent(otherId)}`,
      );
      setConvMessages(data || []);
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeConv) return;
    const userId = getCurrentUserId();
    if (!userId) return;
    try {
      await api.post("/messages/", {
        sender_type: "teacher",
        sender_id: userId,
        receiver_type: "student",
        receiver_id: activeConv,
        content: replyText,
        media_type: "text",
      });
      setReplyText("");
      openConversation(activeConv);
    } catch (e) {
      console.error("Error sending message:", e);
      alert("Error al enviar mensaje");
    }
  };

  // --- CALENDAR LOGIC ---
  const fetchCalendarEvents = useCallback(async (month, year, signal) => {
    try {
      const params = new URLSearchParams({ month: month + 1, year });
      const data = await api.get(`/events/?${params}`, { signal });
      setCalendarEvents(data || []);
    } catch (e) {
      if (e?.name !== "AbortError") {/* ignored */}
    }
  }, []);

  const fetchUpcoming = useCallback(async (signal) => {
    try {
      const data = await api.get(`/events/upcoming?days=7`, { signal });
      setUpcomingEvents(data || []);
    } catch (e) {
      if (e?.name !== "AbortError") {/* ignored */}
    }
  }, []);

  const openNewEvent = (dateStr = "") => {
    setEditingEvent(null);
    setEventForm({
      title: "",
      description: "",
      event_date: dateStr,
      event_type: "evento",
    });
    setShowEventModal(true);
  };

  const openEditEvent = (ev) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      description: ev.description || "",
      event_date: ev.event_date,
      event_type: ev.event_type,
    });
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.event_date) return;
    setSavingEvent(true);
    try {
      const body = { ...eventForm, grade: selectedGrade, grupo: selectedGrupo };
      if (editingEvent) await api.put(`/events/${editingEvent.id}`, body);
      else await api.post(`/events/`, body);
      setShowEventModal(false);
      fetchCalendarEvents(calendarMonth, calendarYear);
      fetchUpcoming();
    } catch (_) {}
    setSavingEvent(false);
  };

  const deleteEvent = async (id) => {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await api.del(`/events/${id}`);
    } catch (_) {}
    fetchCalendarEvents(calendarMonth, calendarYear);
    fetchUpcoming();
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const ctrl = new AbortController();
    fetchCalendarEvents(calendarMonth, calendarYear, ctrl.signal);
    return () => ctrl.abort();
  }, [isAuthenticated, calendarMonth, calendarYear, fetchCalendarEvents]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ctrl = new AbortController();
    fetchUpcoming(ctrl.signal);
    const interval = setInterval(() => fetchUpcoming(ctrl.signal), 5 * 60 * 1000);
    return () => { clearInterval(interval); ctrl.abort(); };
  }, [isAuthenticated, fetchUpcoming]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ctrl = new AbortController();
    fetchUnread(ctrl.signal);
    // Antes 10s; con WebSocket activo basta como respaldo cada 30s.
    const interval = setInterval(() => fetchUnread(ctrl.signal), 30000);
    return () => { clearInterval(interval); ctrl.abort(); };
  }, [isAuthenticated, fetchUnread]);

  // Auto-logout si cualquier llamada API recibe 401 (token expirado/manipulado)
  useEffect(() => {
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      setStudents([]);
    };
    window.addEventListener("mocavi:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mocavi:unauthorized", onUnauthorized);
  }, []);

  const fetchData = useCallback(async (signal) => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams({ grade: selectedGrade, grupo: selectedGrupo });
      const gradeParams = new URLSearchParams({ period_id: selectedPeriodo });
      const [studentsData, gradesData] = await Promise.all([
        api.get(`/students/?${params}`, { signal }),
        api.get(`/grades/?${gradeParams}`, { signal }),
      ]);
      if (Array.isArray(studentsData)) {
        // Indexar calificaciones para evitar O(N²) en find()
        const gradeIdx = new Map(
          (Array.isArray(gradesData) ? gradesData : []).map((g) => [g.enrollment_id, g]),
        );
        const merged = studentsData.map((s) => {
          const g = gradeIdx.get(s.id);
          return {
            ...s,
            name: s.full_name,
            saber: g ? g.score_saber : 1.0,
            hacer: g ? g.score_hacer : 1.0,
            ser:   g ? g.score_ser   : 1.0,
            final: g ? g.final_period_score : null,
            level: g ? g.performance_level : null,
          };
        });
        setStudents(merged);
      }
    } catch (e) {
      if (e?.name !== "AbortError") console.error("Error cargando datos");
    }
  }, [isAuthenticated, selectedGrade, selectedGrupo, selectedPeriodo]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchData]);

  // --- FUNCIÓN PARA CARGA MASIVA DE EXÁMENES ---
  const handleBulkUpload = async () => {
    if (!examFile) return;
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("file", examFile);
    formData.append("answer_key", JSON.stringify({}));
    formData.append("subject", selectedSubject);
    formData.append("grade", selectedGrade);
    formData.append("grupo", selectedGrupo);
    if (selectedPeriodo) formData.append("period_id", selectedPeriodo);

    try {
      const data = await api.postForm(`/upload-exams`, formData);
      setAiError(null);
      setLastEngine("ia");
      setAiResults(data.analisis);
      setShowAiModal(true);
      setExamFile(null);
      if (data.exam_id) {
        setTimeout(() => fetchExamStats(data.exam_id), 1200);
      }
    } catch (e) {
      const raw = (e instanceof ApiError ? e.message : "") || "Error desconocido";
      const is503 = raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand");
      setAiError(
        e instanceof ApiError && e.status === 0
          ? "No se pudo conectar con el servidor. Verifica que el backend esté activo."
          : is503
            ? "El modelo de IA está saturado en este momento. Vuelve a intentarlo en unos segundos."
            : `Error: ${raw}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // === OMR: descargar plantilla de hoja de respuestas (PDF) ===
  const downloadAnswerSheet = async () => {
    setDownloadingSheet(true);
    try {
      const blob = await api.getBlob(`/answer-sheet?questions=${omrNumQ}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hoja-respuestas-${omrNumQ}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setAiError("No se pudo descargar la plantilla. ¿Backend activo?");
    } finally {
      setDownloadingSheet(false);
    }
  };

  // === OMR: marcar la clave de respuestas correcta por pregunta ===
  const setKeyAnswer = (q, letter) =>
    setOmrKey((prev) => ({ ...prev, [q]: prev[q] === letter ? undefined : letter }));

  // === OMR: subir hojas y calificar localmente (rápido) ===
  const handleOmrUpload = async () => {
    if (!examFile) return;
    const answered = Object.values(omrKey).filter(Boolean).length;
    if (answered < omrNumQ) {
      setAiError(`Completa la clave de respuestas: faltan ${omrNumQ - answered} de ${omrNumQ} preguntas.`);
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    const formData = new FormData();
    formData.append("file", examFile);
    formData.append("answer_key", JSON.stringify(omrKey));
    formData.append("subject", selectedSubject);
    formData.append("grade", selectedGrade);
    formData.append("grupo", selectedGrupo);
    if (omrPeriod) formData.append("period_id", omrPeriod);
    try {
      const data = await api.postForm(`/upload-exams-omr`, formData);
      // Adaptar al formato que usa el modal de resultados
      const mapped = (data.analisis || []).map((r, i) => ({
        full_name: r.full_name || `Hoja ${r.page || i + 1}`,
        score: r.score,
        level: r.level,
        correct: r.correct,
        total: r.total,
        aligned: r.aligned,
        answers: r.answers,
        student_id: r.student_id,    // estudiante identificado automáticamente por su nombre
        identified: !!r.student_id,  // ¿lo reconoció?
      }));
      setAiResults(mapped);
      setLastEngine("omr");
      // Prellenar las asignaciones con los estudiantes ya identificados por su nombre
      const autoAssign = {};
      mapped.forEach((r, i) => { if (r.student_id) autoAssign[i] = r.student_id; });
      setOmrAssign(autoAssign);

      // Estadísticas por pregunta calculadas localmente (sin llamada extra)
      const totalStud = mapped.length;
      if (totalStud > 0) {
        const errorsPerQ = {};
        for (let q = 1; q <= omrNumQ; q++) errorsPerQ[q] = 0;
        mapped.forEach((r) =>
          (r.answers || []).forEach((a) => {
            if (!a.is_correct && errorsPerQ[a.q] !== undefined) errorsPerQ[a.q]++;
          }),
        );
        const stats = Object.entries(errorsPerQ).map(([q, errs]) => ({
          question: Number(q),
          errors: errs,
          error_rate: Math.round((errs / totalStud) * 1000) / 10,
        }));
        const hardest = [...stats].filter((s) => s.errors > 0).sort((a, b) => b.errors - a.errors).slice(0, 5);
        setExamStats({ subject: selectedSubject, total_students: totalStud, stats, hardest_questions: hardest });
        setShowStats(false);
      }

      setShowAiModal(true);
      setExamFile(null);
    } catch (e) {
      setAiError(
        e instanceof ApiError && e.status === 0
          ? "No se pudo conectar con el servidor."
          : `Error: ${e instanceof ApiError ? e.message : "desconocido"}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const endpoint = loginRole === "student" ? "/login/student" : "/login/teacher";
      const body = loginRole === "student"
        ? { document_id: credentials.username }
        : { username: credentials.username, password: credentials.password };

      const data = await api.post(endpoint, body);
      localStorage.setItem("mocavi_token", data.access_token);
      localStorage.setItem("mocavi_session", data.role);
      if (data.role === "student") {
        localStorage.setItem("mocavi_student", JSON.stringify(data.user));
        router.push("/dashboard/estudiante");
      } else {
        localStorage.setItem("mocavi_user", JSON.stringify(data.user));
        setIsAuthenticated(true);
      }
    } catch (e) {
      alert(e instanceof ApiError ? (e.message || "Acceso denegado") : "Error de conexión");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("mocavi_session");
    localStorage.removeItem("mocavi_student");
    localStorage.removeItem("mocavi_user");
    localStorage.removeItem("mocavi_token");
    setIsAuthenticated(false);
    setStudents([]);
    // Al cerrar sesión volvemos al portal de logins (no al landing público)
    router.push("/login");
  };

  const totalStudents = students.length;
  const gradedStudents = students.filter((s) => s.final !== null);
  const averageGroup =
    gradedStudents.length > 0
      ? (
          gradedStudents.reduce((acc, s) => acc + s.final, 0) /
          gradedStudents.length
        ).toFixed(2)
      : "0.00";
  const studentsAtRisk = students.filter((s) => s.level === "BAJO").length;

  const deleteStudent = async (id) => {
    if (!confirm("¿Eliminar estudiante?")) return;
    try {
      await api.del(`/students/${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (_) {}
  };

  const getLevel = (score) =>
    score >= 4.6
      ? "SUPERIOR"
      : score >= 4.0
        ? "ALTO"
        : score >= 3.0
          ? "B\u00c1SICO"
          : "BAJO";

  const exportCsv = () => {
    const header = "Nombre,Nota,Desempe\u00f1o\n";
    const rows = aiResults
      .map((r) => `"${r.full_name}",${r.score},"${r.level}"`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultados_ia.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = aiResults
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${r.full_name}</td><td style="text-align:center">${r.score}</td><td>${r.level}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resultados IA</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}h2{color:#1e293b;margin-bottom:4px}
      p{color:#94a3b8;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse}
      th{background:#f1f5f9;padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:11px;text-transform:uppercase}
      td{padding:9px 10px;border-bottom:1px solid #f1f5f9}</style></head>
      <body><h2>Resultados Calificador IA</h2>
      <p>Generado el ${new Date().toLocaleDateString("es-CO")} &middot; ${aiResults.length} alumno(s)</p>
      <table><thead><tr><th>#</th><th>Nombre</th><th>Nota</th><th>Desempe\u00f1o</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("grade", selectedGrade);
    formData.append("grupo", selectedGrupo);
    try {
      const data = await api.postForm(`/students/bulk`, formData);
      const msg = `✅ Importación completada:\n• ${data.created} estudiante(s) inscrito(s)${
        data.skipped > 0
          ? `\n• ${data.skipped} omitido(s) (duplicados o datos vacíos)`
          : ""
      }`;
      alert(msg);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? `Error al importar: ${err.message}` : "Error de conexión al importar el archivo.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const created = await api.post(`/students/`, {
        ...newStudent,
        grade: selectedGrade,
        grupo: selectedGrupo,
      });
      setStudents((prev) => [
        ...prev,
        {
          ...created,
          name: created.full_name,
          saber: 1.0, hacer: 1.0, ser: 1.0,
          final: null, level: null,
        },
      ]);
      setNewStudent({ full_name: "", document_id: "", email: "" });
      setIsAdding(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Error al crear estudiante");
    }
  };

  const updateStudentScore = (id, field, value) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [field]: parseFloat(value) || 1.0 } : s,
      ),
    );
  };

  const saveGrade = async (student) => {
    try {
      const data = await api.post(`/grades/`, {
        score_saber: student.saber,
        score_hacer: student.hacer,
        score_ser: student.ser,
        enrollment_id: student.id,
        assignment_id: student.id,
        period_id: parseInt(selectedPeriodo),
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, final: data.final_period_score, level: data.performance_level }
            : s,
        ),
      );
    } catch (err) {
      alert(err instanceof ApiError ? `Error al guardar: ${err.message}` : "Error al guardar");
    }
  };

  // === #11 Exportar notas ===
  const claseLabel = `${GRADES.find((g) => g.value === selectedGrade)?.label || selectedGrade} · Grupo ${selectedGrupo} · ${PERIODS.find((p) => p.value === selectedPeriodo)?.label || ""}`;

  const exportNotasCsv = () => {
    const header = "Estudiante,Saber,Hacer,Ser,Final,Desempeño\n";
    const rows = students
      .map((s) => `"${s.name}",${s.saber},${s.hacer},${s.ser},${s.final ?? ""},"${s.level ?? "PENDIENTE"}"`)
      .join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notas_${selectedGrade}-${selectedGrupo}_P${selectedPeriodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotasPdf = () => {
    const rows = students
      .map(
        (s, i) =>
          `<tr><td>${i + 1}</td><td>${s.name}</td><td style="text-align:center">${s.saber}</td><td style="text-align:center">${s.hacer}</td><td style="text-align:center">${s.ser}</td><td style="text-align:center"><b>${s.final ?? "—"}</b></td><td>${s.level ?? "PENDIENTE"}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Notas ${claseLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
      h2{margin-bottom:2px}p{color:#64748b;font-size:13px;margin:0 0 18px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#eef2ff;color:#3730a3;text-align:left;padding:9px;border-bottom:2px solid #c7d2fe;font-size:11px;text-transform:uppercase}
      td{padding:8px 9px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even) td{background:#f8fafc}</style></head>
      <body><h2>KNOWTIFY · Reporte de notas</h2>
      <p>${claseLabel} &middot; Generado el ${new Date().toLocaleDateString("es-CO")} &middot; ${students.length} estudiante(s)</p>
      <table><thead><tr><th>#</th><th>Estudiante</th><th>Saber</th><th>Hacer</th><th>Ser</th><th>Final</th><th>Desempeño</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // === #27 Cambiar contraseña ===
  const changePassword = async () => {
    setPwMsg(null);
    if (pwForm.next.length < 8) { setPwMsg({ ok: false, text: "La nueva contraseña debe tener al menos 8 caracteres." }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: "La confirmación no coincide." }); return; }
    setPwSaving(true);
    try {
      await api.post("/change-password", { current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg({ ok: true, text: "Contraseña actualizada correctamente." });
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setShowPwModal(false), 1200);
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña." });
    } finally {
      setPwSaving(false);
    }
  };

  // === #13 Generar examen con IA ===
  const generateExam = async () => {
    if (!genTopic.trim() || generatingExam) return;
    setGeneratingExam(true);
    setGenError(null);
    setGeneratedExam(null);
    try {
      const data = await api.post("/ai/generate-exam", {
        topic: genTopic.trim(),
        subject: selectedSubject,
        questions: Number(genQuestions),
        difficulty: genDifficulty,
      });
      setGeneratedExam(data);
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "No se pudo generar el examen");
    } finally {
      setGeneratingExam(false);
    }
  };

  // Usar la clave del examen generado en el calificador OMR
  const useGeneratedKey = () => {
    if (!generatedExam?.answer_key) return;
    const key = generatedExam.answer_key;
    const n = Object.keys(key).length;
    setOmrNumQ(n);
    setOmrKey(key);
    setGraderMode("omr");
    alert(`Clave de ${n} respuestas cargada en el Lector OMR. Descarga la hoja y aplícala.`);
  };

  // Imprimir el examen generado (enunciados, sin la clave)
  const printGeneratedExam = () => {
    if (!generatedExam) return;
    const qs = (generatedExam.questions || [])
      .map(
        (q) =>
          `<div class="q"><p class="qt"><b>${q.q}.</b> ${q.text}</p>${Object.entries(q.options || {})
            .map(([k, v]) => `<p class="opt">${k}) ${v}</p>`)
            .join("")}</div>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${generatedExam.title}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b;max-width:760px;margin:auto}
      h2{margin-bottom:2px}.sub{color:#64748b;font-size:13px;margin:0 0 8px}
      .line{margin:14px 0 22px;font-size:13px;color:#475569}
      .q{margin-bottom:16px}.qt{font-weight:bold;margin:0 0 6px}.opt{margin:2px 0 2px 18px}</style></head>
      <body><h2>${generatedExam.title}</h2>
      <p class="sub">${generatedExam.subject} · ${(generatedExam.questions || []).length} preguntas</p>
      <p class="line">Nombre: _______________________________   Documento: ____________   Fecha: __________</p>
      ${qs}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // === #2 Guardar las notas del OMR como calificación del periodo ===
  const saveOmrGrades = async () => {
    const items = aiResults
      .map((r, i) => ({ student_id: omrAssign[i], score: r.score }))
      .filter((it) => it.student_id); // solo hojas asignadas a un estudiante
    if (items.length === 0) {
      alert("Asigna al menos una hoja a un estudiante (columna 'Estudiante').");
      return;
    }
    setSavingOmr(true);
    try {
      const res = await api.post("/grades/apply-omr", {
        period_id: parseInt(omrPeriod),
        dimension: omrDimension,
        items,
      });
      alert(`✅ ${res.saved} nota(s) guardada(s) en ${omrDimension.toUpperCase()} del periodo ${omrPeriod}.`);
      fetchData(); // refrescar la tabla de notas
    } catch (err) {
      alert(err instanceof ApiError ? `Error: ${err.message}` : "No se pudieron guardar las notas");
    } finally {
      setSavingOmr(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-indigo-600 dark:text-indigo-400 animate-spin" size={40} />
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">
            Sincronizando KNOWTIFY...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isStudent = loginRole === "student";
    const accent = isStudent ? "violet" : "indigo";
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md animate-springIn">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-95"
              title="Volver al inicio"
            >
              <ArrowLeft size={14} /> Volver al inicio
            </button>
            <ThemeToggle />
          </div>

          {/* Role Tabs con indicador deslizante */}
          <div className="relative flex bg-slate-200 dark:bg-slate-800 rounded-2xl p-1.5 mb-6 gap-1.5">
            {/* Pill deslizante */}
            <span
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]"
              style={{ left: isStudent ? "calc(50% + 3px)" : "6px" }}
            />
            {[
              {
                role: "teacher",
                label: "Docente",
                icon: <GraduationCap size={16} />,
              },
              {
                role: "student",
                label: "Estudiante",
                icon: <User size={16} />,
              },
            ].map(({ role, label, icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => setLoginRole(role)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                  loginRole === role
                    ? "text-slate-900 dark:text-white scale-[1.02]"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 scale-100"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Form re-anima al cambiar de rol */}
          <form
            key={loginRole}
            onSubmit={handleLogin}
            className={`bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border-b-8 animate-springIn transition-all duration-500 ${
              isStudent ? "border-violet-600" : "border-indigo-600"
            }`}
          >
            <div className="flex justify-center mb-8">
              <div
                className={`p-5 rounded-3xl text-white shadow-lg transition-all duration-500 ${
                  isStudent
                    ? "bg-violet-600 shadow-violet-200"
                    : "bg-indigo-600 shadow-indigo-200"
                }`}
              >
                <GraduationCap size={48} />
              </div>
            </div>
            <h2 className="text-3xl font-black text-center text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">
              KNOWTIFY
            </h2>
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm font-bold mb-10 tracking-widest uppercase transition-all duration-300">
              {isStudent ? "Portal del Estudiante" : "Portal del Docente"}
            </p>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={isStudent ? "Número de Documento" : "Usuario"}
                  required
                  className="w-full p-4 pl-12 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                />
                <User
                  className="absolute left-4 top-4 text-slate-400"
                  size={20}
                />
              </div>

              {/* Campo contraseña con transición suave */}
              <div
                className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.34,1.2,0.64,1)] ${
                  !isStudent
                    ? "max-h-24 opacity-100 translate-y-0"
                    : "max-h-0 opacity-0 -translate-y-2"
                }`}
              >
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required={!isStudent}
                    className="w-full p-4 pl-12 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.target.value,
                      })
                    }
                  />
                  <Lock
                    className="absolute left-4 top-4 text-slate-400"
                    size={20}
                  />
                </div>
              </div>

              {/* Hint estudiante con fade */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  isStudent ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-xs text-slate-400 text-center">
                  Ingresa tu número de documento para acceder a tus notas.
                </p>
              </div>

              {/* Botón con spinner */}
              <button
                disabled={isLoggingIn}
                className={`w-full flex items-center justify-center gap-3 text-white font-black py-5 rounded-2xl shadow-xl transition-all duration-300 active:scale-95 hover:scale-[1.02] hover:shadow-2xl uppercase tracking-widest mt-4 disabled:opacity-70 disabled:cursor-not-allowed ${
                  isStudent
                    ? "bg-violet-600 hover:bg-violet-700 shadow-violet-500/30"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verificando…
                  </>
                ) : isStudent ? (
                  "Ver mis Notas"
                ) : (
                  "Entrar al Sistema"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto animate-slideUp">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-t-2xl border-b border-slate-200 dark:border-slate-700 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-lg text-white">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                KNOWTIFY
                <HelpTip variant="info" side="bottom" title="¿Cómo me muevo aquí?" text="Arriba ves las tarjetas de resumen (estudiantes, promedio, riesgo). Usa las pestañas Notas, Calificar y Calendario para cambiar de sección. Elige la clase activa (grado, grupo y periodo) antes de trabajar. Abajo a la derecha tienes los Mensajes." />
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Grado {selectedGrade}-{selectedGrupo} •{" "}
                {PERIODS.find((p) => p.value === selectedPeriodo)?.label ?? ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Campana — notificaciones de próximos eventos */}
            <div className="relative">
              <button
                onClick={() => setShowBellDropdown((v) => !v)}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Bell
                  size={18}
                  className="text-slate-500 dark:text-slate-400"
                />
                {(unreadCount > 0 || upcomingEvents.length > 0) && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-badgePop shadow-lg">
                    {unreadCount + upcomingEvents.length > 9
                      ? "9+"
                      : unreadCount + upcomingEvents.length}
                  </span>
                )}
              </button>
              {showBellDropdown && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-springIn">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-black text-sm text-slate-800 dark:text-white">
                      Notificaciones
                    </span>
                    <button
                      onClick={() => setShowBellDropdown(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {upcomingEvents.length === 0 && unreadCount === 0 && (
                      <p className="text-center text-slate-400 text-xs py-8 font-bold">
                        Sin notificaciones pendientes
                      </p>
                    )}
                    {unreadCount > 0 && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center shrink-0">
                          <MessageCircle
                            size={15}
                            className="text-indigo-600"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Mensajes sin leer
                          </p>
                          <p className="text-xs text-slate-400">
                            {unreadCount} mensaje{unreadCount > 1 ? "s" : ""}{" "}
                            nuevo{unreadCount > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {upcomingEvents.map((ev) => {
                      const typeColors = {
                        evaluacion:
                          "bg-rose-100 dark:bg-rose-900/40 text-rose-600",
                        actividad:
                          "bg-amber-100 dark:bg-amber-900/40 text-amber-600",
                        evento:
                          "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600",
                        otro: "bg-slate-100 dark:bg-slate-800 text-slate-500",
                      };
                      const color =
                        typeColors[ev.event_type] || typeColors.otro;
                      const daysLeft = Math.round(
                        (new Date(ev.event_date) -
                          new Date(new Date().toDateString())) /
                          86400000,
                      );
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}
                          >
                            <CalendarDays size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                              {ev.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {daysLeft === 0
                                ? "Hoy"
                                : daysLeft === 1
                                  ? "Mañana"
                                  : `En ${daysLeft} días`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {upcomingEvents.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setActiveTab("calendario");
                          setShowBellDropdown(false);
                        }}
                        className="w-full text-center text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Ver calendario completo →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <ThemeToggle />
            <button
              onClick={() => { setPwMsg(null); setPwForm({ current: "", next: "", confirm: "" }); setShowPwModal(true); }}
              title="Cambiar contraseña"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Lock size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-600 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* ===== MODAL CAMBIAR CONTRASEÑA (#27) ===== */}
        {showPwModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-overlayIn"
            onClick={() => setShowPwModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm animate-springIn"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Lock size={16} className="text-indigo-500" /> Cambiar contraseña
                </h3>
                <button onClick={() => setShowPwModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <input type="password" placeholder="Contraseña actual" value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="password" placeholder="Nueva contraseña (mín. 8)" value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="password" placeholder="Confirmar nueva contraseña" value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && changePassword()}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                {pwMsg && (
                  <p className={`text-sm font-bold ${pwMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>{pwMsg.text}</p>
                )}
              </div>
              <div className="px-6 pb-5 flex gap-3">
                <button onClick={() => setShowPwModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-black text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancelar
                </button>
                <button onClick={changePassword} disabled={pwSaving || !pwForm.current || !pwForm.next}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-sm transition-colors flex items-center justify-center gap-2">
                  {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard — solo visible en la pestaña Notas (aparece/desaparece suave) */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeTab === "notas"
              ? "max-h-[480px] opacity-100 mt-8 mb-8"
              : "max-h-0 opacity-0 mt-8 mb-0 pointer-events-none"
          }`}
        >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-3 rounded-xl text-indigo-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                Estudiantes
              </p>
              <h3 className="text-2xl font-black">{totalStudents}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                Promedio
              </p>
              <h3 className="text-2xl font-black">{averageGroup}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${studentsAtRisk > 0 ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                Riesgo
                <HelpTip text="Estudiantes con desempeño BAJO (nota final menor a 3.0) en el periodo seleccionado. Conviene reforzar con ellos." />
              </p>
              <h3 className="text-2xl font-black">{studentsAtRisk}</h3>
            </div>
          </div>
        </div>
        </div>

        {/* ===== TABS ===== */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: "notas", label: "Notas", icon: <BookOpen size={15} />, help: "Registra y consulta las calificaciones de cada estudiante por periodo." },
            { id: "calificar", label: "Calificar", icon: <FlaskConical size={15} />, help: "Califica exámenes en lote: lector OMR de burbujas (rápido) o análisis con IA." },
            { id: "calendario", label: "Calendario", icon: <CalendarDays size={15} />, help: "Programa evaluaciones, actividades y eventos. Verás recordatorios de los próximos 7 días." },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "calendario" && upcomingEvents.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 ml-1">
                  {upcomingEvents.length}
                </span>
              )}
              <HelpTip text={tab.help} tone={activeTab === tab.id ? "white" : "slate"} side="right" />
            </button>
          ))}
        </div>

        {(activeTab === "notas" || activeTab === "calificar") && (
          <div key="tab-notas" className="view-enter">
            {/* --- SELECTOR DE GRADO Y SECCIÓN (común a Notas y Calificar) --- */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 mb-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-xl text-violet-600 dark:text-violet-400">
                  <BookOpen size={18} />
                </div>
                <span className="font-black text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Clase Activa
                </span>
                <HelpTip text="Elige el grado, grupo y periodo sobre los que vas a trabajar. Todo lo que hagas en Notas y Calificar se aplica a esta clase." side="right" />
              </div>

              <div className="flex flex-wrap items-end gap-4 flex-1">
                {/* Grado */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Grado
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGrade}
                      onChange={(e) => handleGradeChange(e.target.value)}
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-4 pr-9 py-2.5 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                    >
                      {GRADES.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Grupo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Grupo
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGrupo}
                      onChange={(e) => handleGrupoChange(e.target.value)}
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-4 pr-9 py-2.5 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>
                          Grupo {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Periodo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">
                    Periodo
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPeriodo}
                      onChange={(e) => handlePeriodoChange(e.target.value)}
                      className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl pl-4 pr-9 py-2.5 font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Badge activo */}
                <div className="ml-auto">
                  <div className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-md shadow-violet-500/20 tracking-wide">
                    {GRADES.find((g) => g.value === selectedGrade)?.label} ·
                    Grupo {selectedGrupo} ·{" "}
                    {PERIODS.find((p) => p.value === selectedPeriodo)?.label}
                  </div>
                </div>
              </div>
            </div>

            {/* ====== PESTAÑA CALIFICAR: panel del calificador masivo ====== */}
            {activeTab === "calificar" && (
            <div className="mb-8 p-8 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20 dark:shadow-indigo-900/40 ring-1 ring-indigo-500/20 dark:ring-indigo-400/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <UploadCloud size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                    <FileText size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">
                    Calificador Masivo
                  </h2>
                </div>

                {/* Toggle de modo: OMR (rápido) / IA (Gemini) */}
                <div className="inline-flex bg-white/10 backdrop-blur rounded-2xl p-1 mb-5 gap-1">
                  <button
                    onClick={() => { setGraderMode("omr"); setAiError(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      graderMode === "omr" ? "bg-white text-indigo-700 shadow" : "text-white/80 hover:text-white"
                    }`}
                  >
                    ⚡ Lector OMR
                  </button>
                  <button
                    onClick={() => { setGraderMode("ia"); setAiError(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      graderMode === "ia" ? "bg-white text-indigo-700 shadow" : "text-white/80 hover:text-white"
                    }`}
                  >
                    🤖 IA Gemini
                  </button>
                </div>

                <p className="text-indigo-100 text-sm mb-6 max-w-md font-medium">
                  {graderMode === "omr"
                    ? "Lee las burbujas A/B/C/D al instante y reconoce el nombre escrito en cada hoja para asignarla sola al estudiante de la clase. Descarga la hoja, marca la clave y sube las hojas escaneadas o fotografiadas."
                    : "La IA identifica nombres, respuestas y notas automáticamente. Útil para exámenes escritos a mano o sin formato fijo."}
                </p>

                {/* Selector de materia (común) */}
                <div className="mb-5">
                  <label className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest block mb-2">
                    Materia del Examen
                  </label>
                  <div className="relative inline-block">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="appearance-none bg-white/15 backdrop-blur border border-white/20 text-white font-bold text-sm pl-4 pr-9 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} className="text-slate-800">
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-white/70 pointer-events-none" />
                  </div>
                </div>

                {/* === Controles exclusivos del modo OMR === */}
                {graderMode === "omr" && (
                  <div className="mb-5 bg-white/10 backdrop-blur rounded-2xl p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest block mb-1.5">
                          N° de preguntas
                        </label>
                        <input
                          type="number" min={1} max={30} value={omrNumQ}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                            setOmrNumQ(n);
                            // limpiar claves fuera de rango
                            setOmrKey((prev) => {
                              const next = {};
                              for (let q = 1; q <= n; q++) if (prev[q]) next[q] = prev[q];
                              return next;
                            });
                          }}
                          className="w-24 bg-white/15 border border-white/20 text-white font-bold text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-white/40"
                        />
                      </div>
                      <div>
                        <label className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                          Guardar en periodo
                          <HelpTip text="El examen calificado se guardará en este periodo y aparecerá en el detalle de notas del estudiante." />
                        </label>
                        <select
                          value={omrPeriod}
                          onChange={(e) => setOmrPeriod(e.target.value)}
                          className="bg-white/15 border border-white/20 text-white font-bold text-sm px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-slate-900"
                        >
                          {PERIODS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={downloadAnswerSheet}
                        disabled={downloadingSheet}
                        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        {downloadingSheet ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Descargar hoja
                      </button>
                      <span className="text-indigo-200 text-[11px]">
                        Clave marcada: {Object.values(omrKey).filter(Boolean).length}/{omrNumQ}
                      </span>
                    </div>

                    {/* Editor de clave de respuestas */}
                    <div>
                      <label className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest block mb-2">
                        Clave de respuestas correctas
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
                        {Array.from({ length: omrNumQ }).map((_, i) => {
                          const q = i + 1;
                          return (
                            <div key={q} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5">
                              <span className="text-white/70 text-[11px] font-black w-5 text-right">{q}</span>
                              <div className="flex gap-1">
                                {["A", "B", "C", "D"].map((L) => (
                                  <button
                                    key={L}
                                    onClick={() => setKeyAnswer(q, L)}
                                    className={`w-6 h-6 rounded-md text-[11px] font-black transition-all ${
                                      omrKey[q] === L
                                        ? "bg-emerald-400 text-emerald-950 scale-105"
                                        : "bg-white/15 text-white/80 hover:bg-white/30"
                                    }`}
                                  >
                                    {L}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="file"
                    id="examUpload"
                    className="hidden"
                    onChange={(e) => setExamFile(e.target.files[0])}
                    accept=".pdf,image/*"
                  />
                  <label
                    htmlFor="examUpload"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2","ring-emerald-300"); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("ring-2","ring-emerald-300")}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("ring-2","ring-emerald-300"); const f=e.dataTransfer?.files?.[0]; if(f) setExamFile(f); }}
                    className="flex-1 flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/20 border-dashed rounded-2xl py-4 px-6 cursor-pointer transition-all active:scale-95 group/label"
                  >
                    <UploadCloud className="text-indigo-200 group-hover/label:text-white transition-colors" />
                    <span className="font-bold text-sm truncate">
                      {examFile ? examFile.name : (graderMode === "omr" ? "Subir hojas escaneadas / foto..." : "Seleccionar exámenes...")}
                    </span>
                  </label>

                  <button
                    onClick={() => {
                      setAiError(null);
                      graderMode === "omr" ? handleOmrUpload() : handleBulkUpload();
                    }}
                    disabled={!examFile || isAnalyzing}
                    className="flex-[0.5] bg-emerald-500 hover:bg-emerald-400 disabled:bg-indigo-800 disabled:text-indigo-400 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        {graderMode === "omr" ? "Leyendo..." : "Analizando..."}
                      </>
                    ) : (
                      graderMode === "omr" ? "Calificar hojas" : "Iniciar IA"
                    )}
                  </button>
                </div>

                {/* Error inline */}
                {aiError && (
                  <div className="mt-4 flex items-start gap-3 bg-rose-500/20 border border-rose-400/40 text-rose-200 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                    <button
                      onClick={() => setAiError(null)}
                      className="ml-auto shrink-0 opacity-60 hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ====== GENERADOR DE EXÁMENES CON IA (#13) ====== */}
            {activeTab === "calificar" && (
            <div className="mb-8 bg-white dark:bg-slate-900 rounded-[2rem] p-7 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 p-2.5 rounded-xl">
                  <FlaskConical size={22} />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">
                  Generar examen con IA
                </h2>
                <HelpTip text="Describe el tema y la IA crea un examen de opción múltiple con su clave de respuestas. Imprímelo y luego usa la clave en el Lector OMR para calificarlo." />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                Materia: <strong>{selectedSubject}</strong> (cámbiala en el panel de arriba).
                Genera las preguntas, imprímelas y reutiliza la clave en el calificador OMR.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="Tema (ej. ecuaciones de primer grado)"
                  className="md:col-span-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
                <div className="relative">
                  <input
                    type="number" min={5} max={30} value={genQuestions}
                    onChange={(e) => setGenQuestions(Math.max(5, Math.min(30, parseInt(e.target.value) || 5)))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="N° preguntas"
                  />
                </div>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="facil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <button
                onClick={generateExam}
                disabled={generatingExam || !genTopic.trim()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-violet-500/30 transition-all active:scale-95 uppercase text-xs tracking-widest"
              >
                {generatingExam ? <><Loader2 size={16} className="animate-spin" /> Generando...</> : <><FlaskConical size={16} /> Generar examen</>}
              </button>

              {genError && (
                <div className="mt-4 flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle size={16} /> {genError}
                </div>
              )}

              {generatedExam?.questions?.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-500" /> {generatedExam.title}
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={printGeneratedExam}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest">
                        <FileText size={14} /> Imprimir
                      </button>
                      <button onClick={useGeneratedKey}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest">
                        <Save size={14} /> Usar clave en OMR
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {generatedExam.questions.map((q) => (
                      <div key={q.q} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
                          <span className="text-violet-500">{q.q}.</span> {q.text}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                          {Object.entries(q.options || {}).map(([k, v]) => (
                            <span key={k} className={`px-2.5 py-1 rounded-lg ${
                              k === q.correct
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "text-slate-600 dark:text-slate-300"
                            }`}>
                              <strong>{k})</strong> {v}{k === q.correct && " ✓"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
            {/* ====== fin PESTAÑA CALIFICAR ====== */}

            {/* ====== PESTAÑA NOTAS: inscribir + tabla ====== */}
            {activeTab === "notas" && (<>
            {/* Registro Individual */}
            <div className="my-6">
              {!isAdding ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsAdding(true)}
                    className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <Plus size={20} /> Inscribir Individual
                  </button>
                  <input
                    type="file"
                    id="excelUpload"
                    className="hidden"
                    accept=".xlsx,.csv"
                    onChange={handleBulkImport}
                  />
                  <label
                    htmlFor="excelUpload"
                    className={`flex items-center gap-2 font-bold py-3 px-6 rounded-xl shadow-sm border transition-all cursor-pointer active:scale-95 ${
                      isImporting
                        ? "bg-emerald-50 text-emerald-400 border-emerald-200 pointer-events-none"
                        : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />{" "}
                        Importando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={20} /> Importar Excel
                      </>
                    )}
                  </label>
                  <HelpTip text="Sube un .xlsx o .csv con columnas de nombre, documento y (opcional) correo. KNOWTIFY detecta las columnas automáticamente e inscribe a todos en la clase activa." side="right" />
                </div>
              ) : (
                <form
                  onSubmit={handleAddStudent}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-emerald-500 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
                >
                  <input
                    placeholder="Nombre"
                    className="p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg outline-none"
                    value={newStudent.full_name}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        full_name: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    placeholder="Documento"
                    className="p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg outline-none"
                    value={newStudent.document_id}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        document_id: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    className="p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg outline-none"
                    value={newStudent.email}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, email: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white font-bold rounded-lg py-2"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Barra de acciones de la tabla: exportar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                Calificaciones
                <HelpTip text="Edita Saber/Hacer/Ser y guarda con el botón de cada fila. Exporta el listado a Excel o PDF con los botones de la derecha." />
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportNotasCsv}
                  disabled={students.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  onClick={exportNotasPdf}
                  disabled={students.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>

            {/* Tabla (sin overflow-hidden para no recortar los tooltips de ayuda) */}
            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 text-xs font-bold uppercase">
                    <th className="p-4 rounded-tl-2xl">Estudiante</th>
                    <th className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 justify-center">Saber
                        <HelpTip text="Dimensión cognitiva: dominio de conceptos y conocimientos (escala 1.0 a 5.0)." /></span>
                    </th>
                    <th className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 justify-center">Hacer
                        <HelpTip text="Dimensión procedimental: aplicación práctica y resolución (escala 1.0 a 5.0)." /></span>
                    </th>
                    <th className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 justify-center">Ser
                        <HelpTip text="Dimensión actitudinal: responsabilidad, participación y valores (escala 1.0 a 5.0)." /></span>
                    </th>
                    <th className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 justify-center">Final
                        <HelpTip text="Promedio automático de Saber, Hacer y Ser. Se guarda al pulsar el botón guardar de la fila." /></span>
                    </th>
                    <th className="p-4">
                      <span className="inline-flex items-center gap-1">Desempeño
                        <HelpTip text="SUPERIOR ≥ 4.6 · ALTO ≥ 4.0 · BÁSICO ≥ 3.0 · BAJO < 3.0" /></span>
                    </th>
                    <th className="p-4 text-center rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {s.name}
                          </span>
                        </div>
                      </td>
                      {["saber", "hacer", "ser"].map((field) => (
                        <td key={field} className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={s[field]}
                            onChange={(e) =>
                              updateStudentScore(s.id, field, e.target.value)
                            }
                            className="w-16 p-2 bg-slate-100 dark:bg-slate-800 rounded border-none text-center font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                      ))}
                      <td className="p-4 text-center font-black text-xl text-indigo-600">
                        {s.final || "--"}
                      </td>
                      <td className="p-4">
                        {s.level ? (
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${s.level === "SUPERIOR" ? "bg-emerald-500" : s.level === "ALTO" ? "bg-blue-500" : s.level === "BÁSICO" ? "bg-amber-500" : "bg-rose-500"}`}
                          >
                            {s.level}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px] italic font-medium">
                            PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => saveGrade(s)}
                            className="p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => deleteStudent(s.id)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              KNOWTIFY v2.0 • Jose - Selenis - Marinelly Dev Studio © 2026
            </p>
            </>)}
            {/* ====== fin PESTAÑA NOTAS ====== */}

            {/* ══════════════════════════════════════════════════════════
             PANEL COMBINADO: Estadísticas (izq) + Resultados IA (der)
             (modales — disponibles desde cualquier pestaña)
        ══════════════════════════════════════════════════════════ */}
            {showAiModal && (
              <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-auto ${isClosingModal ? "overlay-exit" : "animate-overlayIn"}`}
              >
                <div
                  className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-[1200px] flex flex-col max-h-[92vh] ${isClosingModal ? "modal-exit" : "animate-springIn"}`}
                >
                  {/* ── Barra superior compartida ── */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <BarChart2 size={20} className="text-indigo-500" />
                          Análisis del Examen
                          {examStats && (
                            <span className="text-slate-400 font-normal text-sm">
                              — {examStats.subject}
                            </span>
                          )}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {aiResults.length} alumno(s) detectado(s)
                          {examStats && (
                            <>
                              {" "}
                              &nbsp;·&nbsp; {examStats.total_students}{" "}
                              evaluado(s)
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={closeAiModal}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* ── Cuerpo: dos columnas ── */}
                  <div className="flex flex-1 min-h-0 divide-x divide-slate-200 dark:divide-slate-700">
                    {/* ── COLUMNA IZQUIERDA — Estadísticas ── */}
                    <div className="w-[46%] shrink-0 flex flex-col overflow-y-auto p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        % de error por pregunta
                      </p>

                      {!examStats ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                          <Loader2
                            className="animate-spin text-indigo-400"
                            size={32}
                          />
                          <p className="text-xs text-slate-400">
                            Calculando estadísticas…
                          </p>
                        </div>
                      ) : (
                        <>
                          <ExamErrorChart stats={examStats.stats} height={220} />

                          {examStats.hardest_questions.length > 0 && (
                            <div className="mt-5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                ⚠️ Preguntas difíciles
                              </p>
                              <div className="space-y-2">
                                {examStats.hardest_questions.map((q) => (
                                  <div
                                    key={q.question}
                                    className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2"
                                  >
                                    <span className="bg-amber-500 text-white text-[10px] font-black rounded-lg px-2 py-0.5 shrink-0">
                                      P{q.question}
                                    </span>
                                    <span className="text-xs text-amber-800 dark:text-amber-200">
                                      {q.error_rate}% error — Reforzar con el
                                      grupo
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* ── COLUMNA DERECHA — Tabla resultados ── */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="overflow-y-auto flex-1 p-5">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-bold uppercase">
                              <th className="p-3 rounded-l-lg">#</th>
                              <th className="p-3">Nombre</th>
                              <th className="p-3 text-center">Nota</th>
                              <th className="p-3 text-center">Desempeño</th>
                              <th className="p-3 text-center rounded-r-lg">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {aiResults.map((r, i) => {
                              const previewLevel =
                                editingIdx === i
                                  ? getLevel(parseFloat(editValues.score) || 1)
                                  : r.level;
                              const levelCls =
                                previewLevel === "SUPERIOR"
                                  ? "bg-emerald-500"
                                  : previewLevel === "ALTO"
                                    ? "bg-blue-500"
                                    : previewLevel === "BÁSICO"
                                      ? "bg-amber-500"
                                      : "bg-rose-500";
                              return (
                                <tr
                                  key={i}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                  <td className="p-3 text-slate-400 text-sm">
                                    {i + 1}
                                  </td>
                                  <td className="p-3">
                                    {lastEngine === "omr" ? (
                                      r.identified ? (
                                        // Identificado automáticamente por el nombre escrito en la hoja
                                        <div className="flex items-center gap-2">
                                          <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{r.full_name}</p>
                                            <p className="text-[10px] text-slate-400">Por nombre · auto</p>
                                          </div>
                                        </div>
                                      ) : (
                                        // No reconocido: el docente asigna manualmente (respaldo)
                                        <div>
                                          <select
                                            value={omrAssign[i] || ""}
                                            onChange={(e) =>
                                              setOmrAssign((prev) => ({ ...prev, [i]: e.target.value }))
                                            }
                                            className="w-full px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                          >
                                            <option value="">— Hoja {r.full_name?.replace?.("Hoja ", "") || i + 1}: asignar —</option>
                                            {students.map((s) => (
                                              <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                          </select>
                                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                            Nombre no reconocido · asígnalo a mano
                                          </p>
                                        </div>
                                      )
                                    ) : editingIdx === i ? (
                                      <input
                                        className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                        value={editValues.full_name}
                                        onChange={(e) =>
                                          setEditValues({
                                            ...editValues,
                                            full_name: e.target.value,
                                          })
                                        }
                                      />
                                    ) : (
                                      <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {r.full_name}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {editingIdx === i ? (
                                      <input
                                        type="number"
                                        min="1.0"
                                        max="5.0"
                                        step="0.1"
                                        className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg outline-none text-center font-bold focus:ring-2 focus:ring-indigo-500"
                                        value={editValues.score}
                                        onChange={(e) =>
                                          setEditValues({
                                            ...editValues,
                                            score: e.target.value,
                                          })
                                        }
                                      />
                                    ) : (
                                      <span className="font-black text-lg text-indigo-600">
                                        {r.score}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-black text-white ${levelCls}`}
                                    >
                                      {previewLevel}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {editingIdx === i ? (
                                      <button
                                        onClick={() => {
                                          const s = Math.max(
                                            1.0,
                                            Math.min(
                                              5.0,
                                              parseFloat(editValues.score) ||
                                                1.0,
                                            ),
                                          );
                                          setAiResults((prev) =>
                                            prev.map((item, idx) =>
                                              idx === i
                                                ? {
                                                    ...item,
                                                    full_name:
                                                      editValues.full_name,
                                                    score: s,
                                                    level: getLevel(s),
                                                  }
                                                : item,
                                            ),
                                          );
                                          setEditingIdx(null);
                                        }}
                                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
                                      >
                                        Guardar
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingIdx(i);
                                          setEditValues({
                                            full_name: r.full_name,
                                            score: String(r.score),
                                          });
                                        }}
                                        className="flex items-center gap-1 mx-auto px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all"
                                      >
                                        <Pencil size={12} /> Corregir
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer: guardar como notas (OMR) + exportar */}
                      <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        {lastEngine === "omr" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                              Guardar nota en
                              <HelpTip side="top" text="Los estudiantes se identifican solos por el nombre escrito en la hoja (✓ verde). Solo asigna manualmente los que aparezcan en amarillo. Elige la dimensión; el examen se guarda en el periodo seleccionado en los controles del lector OMR." />
                            </span>
                            <select
                              value={omrDimension}
                              onChange={(e) => setOmrDimension(e.target.value)}
                              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="saber">Saber</option>
                              <option value="hacer">Hacer</option>
                              <option value="ser">Ser</option>
                            </select>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1.5 rounded-lg">
                              {PERIODS.find((p) => p.value === omrPeriod)?.label ?? `Periodo ${omrPeriod}`}
                            </span>
                            <button
                              onClick={saveOmrGrades}
                              disabled={savingOmr}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                            >
                              {savingOmr ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                              Guardar como notas
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Los resultados no se sincronizan con la tabla principal.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={exportCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95"
                          >
                            <Download size={15} /> Exportar Excel
                          </button>
                          <button
                            onClick={exportPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                          >
                            <FileText size={15} /> Exportar PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* fin grid */}
                </div>
              </div>
            )}

            {/* Stats standalone (acceso desde historial) */}
            {showStats && !showAiModal && examStats && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-overlayIn">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-springIn">
                  <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <BarChart2 size={20} className="text-indigo-500" />{" "}
                      Estadísticas — {examStats.subject}
                    </h2>
                    <button
                      onClick={() => setShowStats(false)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={18} className="text-slate-500" />
                    </button>
                  </div>
                  <div className="p-5 overflow-y-auto flex-1">
                    <ExamErrorChart stats={examStats.stats} height={240} />
                    {examStats.hardest_questions.length > 0 && (
                      <div className="mt-5 space-y-2">
                        {examStats.hardest_questions.map((q) => (
                          <div
                            key={q.question}
                            className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2"
                          >
                            <span className="bg-amber-500 text-white text-[10px] font-black rounded-lg px-2 py-0.5 shrink-0">
                              P{q.question}
                            </span>
                            <span className="text-xs text-amber-800 dark:text-amber-200">
                              {q.error_rate}% error — Reforzar con el grupo
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SECCIÓN CALENDARIO ===== */}
        {activeTab === "calendario" &&
          (() => {
            const MONTH_NAMES = [
              "Enero",
              "Febrero",
              "Marzo",
              "Abril",
              "Mayo",
              "Junio",
              "Julio",
              "Agosto",
              "Septiembre",
              "Octubre",
              "Noviembre",
              "Diciembre",
            ];
            const TYPE_META = {
              evaluacion: {
                label: "Evaluación",
                bg: "bg-rose-500",
                border: "border-rose-500",
                light:
                  "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
                text: "text-rose-700 dark:text-rose-300",
              },
              actividad: {
                label: "Actividad",
                bg: "bg-amber-500",
                border: "border-amber-500",
                light:
                  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                text: "text-amber-700 dark:text-amber-300",
              },
              evento: {
                label: "Evento",
                bg: "bg-indigo-500",
                border: "border-indigo-500",
                light:
                  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
                text: "text-indigo-700 dark:text-indigo-300",
              },
              otro: {
                label: "Otro",
                bg: "bg-slate-400",
                border: "border-slate-400",
                light:
                  "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                text: "text-slate-600 dark:text-slate-300",
              },
            };
            const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
            const daysInMonth = new Date(
              calendarYear,
              calendarMonth + 1,
              0,
            ).getDate();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const pad = (n) => String(n).padStart(2, "0");
            const eventsMap = {};
            calendarEvents.forEach((ev) => {
              (eventsMap[ev.event_date] = eventsMap[ev.event_date] || []).push(
                ev,
              );
            });

            return (
              <div key="tab-calendario" className="view-enter">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* === CALENDARIO MENSUAL === */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
                    {/* Nav con gradiente */}
                    <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-indigo-600 to-violet-600">
                      <button
                        onClick={() => {
                          if (calendarMonth === 0) {
                            setCalendarMonth(11);
                            setCalendarYear((y) => y - 1);
                          } else setCalendarMonth((m) => m - 1);
                        }}
                        className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 transition-all text-white"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div
                        key={`mh-${calendarMonth}-${calendarYear}`}
                        className="text-center animate-popIn"
                      >
                        <span className="font-black text-white text-lg tracking-wide">
                          {MONTH_NAMES[calendarMonth]}
                        </span>
                        <span className="text-indigo-200 font-bold text-sm ml-2">
                          {calendarYear}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (calendarMonth === 11) {
                            setCalendarMonth(0);
                            setCalendarYear((y) => y + 1);
                          } else setCalendarMonth((m) => m + 1);
                        }}
                        className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 transition-all text-white"
                      >
                        <ChevronRightIcon size={18} />
                      </button>
                    </div>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 text-center px-3 pt-4 pb-1">
                      {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
                        <div
                          key={d}
                          className="text-[11px] font-black uppercase tracking-widest text-slate-400 pb-2"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Days grid — sin bordes, celdas como botones */}
                    <div
                      key={`grid-${calendarMonth}-${calendarYear}`}
                      className="grid grid-cols-7 gap-y-1 px-3 pb-4 animate-fadeIn"
                    >
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`;
                        const dayEvents = eventsMap[dateStr] || [];
                        const cellDate = new Date(
                          calendarYear,
                          calendarMonth,
                          day,
                        );
                        const isToday = cellDate.getTime() === today.getTime();
                        const hasEvents = dayEvents.length > 0;
                        return (
                          <div
                            key={day}
                            onClick={() => openNewEvent(dateStr)}
                            title={
                              hasEvents
                                ? dayEvents.map((e) => e.title).join(", ")
                                : undefined
                            }
                            className={`flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl cursor-pointer transition-all group min-h-[52px]
                            ${isToday ? "bg-indigo-600 shadow-lg shadow-indigo-300/40 dark:shadow-indigo-900/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                          >
                            <span
                              className={`text-xs font-black leading-none ${isToday ? "text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`}
                            >
                              {day}
                            </span>
                            <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                              {dayEvents.slice(0, 3).map((ev) => (
                                <span
                                  key={ev.id}
                                  className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white/80" : TYPE_META[ev.event_type]?.bg || "bg-slate-400"}`}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Leyenda */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4 flex-wrap">
                      {Object.entries(TYPE_META).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${v.bg}`} />
                          <span className="text-[10px] font-bold text-slate-500">
                            {v.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* === PANEL LATERAL === */}
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => openNewEvent("")}
                      className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      <CalendarPlus size={18} /> Nuevo Evento
                    </button>

                    {/* Próximos 7 días */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Clock size={14} className="text-indigo-500" />
                        <span className="font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300">
                          Próximos 7 días
                        </span>
                        {upcomingEvents.length > 0 && (
                          <span className="ml-auto bg-rose-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">
                            {upcomingEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {upcomingEvents.length === 0 && (
                          <p className="text-center text-slate-400 text-xs py-8 font-bold">
                            Sin eventos próximos
                          </p>
                        )}
                        {upcomingEvents.map((ev) => {
                          const meta =
                            TYPE_META[ev.event_type] || TYPE_META.otro;
                          const daysLeft = Math.round(
                            (new Date(ev.event_date) - today) / 86400000,
                          );
                          return (
                            <div
                              key={ev.id}
                              className="px-4 py-3 flex items-start gap-3"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta.bg}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {ev.title}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {daysLeft === 0
                                    ? "Hoy"
                                    : daysLeft === 1
                                      ? "Mañana"
                                      : `En ${daysLeft} días`}{" "}
                                  · {meta.label}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => openEditEvent(ev)}
                                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Pencil
                                    size={13}
                                    className="text-slate-400"
                                  />
                                </button>
                                <button
                                  onClick={() => deleteEvent(ev.id)}
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                >
                                  <Trash2 size={13} className="text-rose-400" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Eventos del mes */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <CalendarDays size={14} className="text-indigo-500" />
                        <span className="font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300">
                          Este mes
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-slate-400">
                          {calendarEvents.length} evento
                          {calendarEvents.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                        {calendarEvents.length === 0 && (
                          <p className="text-center text-slate-400 text-xs py-8 font-bold">
                            Sin eventos este mes
                          </p>
                        )}
                        {calendarEvents.map((ev) => {
                          const meta =
                            TYPE_META[ev.event_type] || TYPE_META.otro;
                          const d = new Date(ev.event_date + "T00:00:00");
                          return (
                            <div
                              key={ev.id}
                              className={`flex items-start gap-3 px-4 py-3 border-l-2 ${meta.border}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {ev.title}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {d.getDate()} {MONTH_NAMES[d.getMonth()]} ·{" "}
                                  {meta.label}
                                </p>
                                {ev.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {ev.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => openEditEvent(ev)}
                                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Pencil
                                    size={13}
                                    className="text-slate-400"
                                  />
                                </button>
                                <button
                                  onClick={() => deleteEvent(ev.id)}
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                >
                                  <Trash2 size={13} className="text-rose-400" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {/* ===== MODAL CREAR/EDITAR EVENTO ===== (fuera del contenedor animado para que fixed cubra toda la pantalla) */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-overlayIn"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-springIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-800 dark:text-white">
                {editingEvent ? "Editar Evento" : "Nuevo Evento"}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Título *
                </label>
                <input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Ej: Evaluación parcial de Matemáticas"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) =>
                      setEventForm((f) => ({
                        ...f,
                        event_date: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) =>
                      setEventForm((f) => ({
                        ...f,
                        event_type: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="evaluacion">Evaluación</option>
                    <option value="actividad">Actividad</option>
                    <option value="evento">Evento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Detalles opcionales..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-black text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEvent}
                disabled={
                  savingEvent ||
                  !eventForm.title.trim() ||
                  !eventForm.event_date
                }
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                {savingEvent ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {editingEvent ? "Guardar Cambios" : "Crear Evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== WIDGET MENSAJES ESTILO MESSENGER ===== */}
      {showInbox && (
        <div
          className={`fixed bottom-20 right-6 z-50 w-[320px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${
            isClosingInbox ? "modal-exit" : "animate-springIn"
          }`}
          style={{ height: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} />
              <span className="font-black text-sm tracking-wide">
                {activeConv ? activeConvName || activeConv : "Mensajes"}
              </span>
              {!activeConv &&
                conversations.filter((c) => c.unread > 0).length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">
                    {conversations.filter((c) => c.unread > 0).length}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-1">
              {activeConv && (
                <button
                  onClick={() => setActiveConv(null)}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <button
                onClick={closeInbox}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Lista de conversaciones */}
          {!activeConv ? (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn">
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                  <MessageCircle
                    size={28}
                    className="text-slate-300 dark:text-slate-700"
                  />
                  <p className="text-slate-400 text-xs font-bold">
                    Sin mensajes aún
                  </p>
                </div>
              )}
              {conversations.map((c, ci) => (
                <button
                  key={c.other_id}
                  onClick={() => {
                    openConversation(c.other_id);
                    setActiveConvName(c.display_name || c.other_id);
                  }}
                  style={{ animationDelay: `${ci * 40}ms` }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left animate-slideUp [animation-fill-mode:both]"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0 font-black text-white text-xs uppercase shadow-sm">
                    {(c.display_name || c.other_id).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate">
                      {c.display_name || c.other_id}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {c.last_message}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span
                      key={c.unread}
                      className="bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-badgePop"
                    >
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 animate-slideInRight">
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950/40">
                {convMessages.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-6">
                    Inicia la conversación
                  </p>
                )}
                {convMessages.map((m, i) => {
                  const prev = convMessages[i - 1];
                  const curDate = new Date(m.created_at);
                  const prevDate = prev ? new Date(prev.created_at) : null;
                  const sameDay = prevDate && curDate.toDateString() === prevDate.toDateString();
                  const today0 = new Date(); today0.setHours(0,0,0,0);
                  const yest0 = new Date(today0); yest0.setDate(today0.getDate() - 1);
                  const cd = new Date(curDate); cd.setHours(0,0,0,0);
                  let label;
                  if (cd.getTime() === today0.getTime()) label = "Hoy";
                  else if (cd.getTime() === yest0.getTime()) label = "Ayer";
                  else label = curDate.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: cd.getFullYear() !== today0.getFullYear() ? "numeric" : undefined });
                  const isTeacher = m.sender_type === "teacher";
                  return (
                    <div key={m.id}>
                      {!sameDay && (
                        <div className="flex items-center justify-center my-2 animate-fadeIn">
                          <span className="bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">{label}</span>
                        </div>
                      )}
                      <div
                        style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
                        className={`flex animate-slideUp [animation-fill-mode:both] ${isTeacher ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] flex flex-col ${isTeacher ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                              isTeacher
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm"
                            }`}
                          >
                            {m.content}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                            {curDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Responder..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-slate-400 transition-all"
                />
                <button
                  onClick={sendReply}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-2 rounded-xl transition-all"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== BOTÓN FLOTANTE MENSAJES (docente) ===== */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            setIsClosingInbox(false);
            setShowInbox(true);
            fetchConversations();
          }}
          className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 hover:scale-105 animate-slideUp [animation-fill-mode:both]"
          style={{ animationDelay: "150ms" }}
        >
          <MessageCircle size={18} /> Mensajes
          {unreadCount > 0 && (
            <span
              key={unreadCount}
              className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg animate-badgePop animate-bounce"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
