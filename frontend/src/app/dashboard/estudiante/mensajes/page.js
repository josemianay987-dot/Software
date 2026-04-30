"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, GraduationCap, User, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api";

export default function MensajesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const sidRef = useRef(null);
  const tidRef = useRef(null);

  const loadMessages = useCallback(async (sid, tid, signal) => {
    if (!sid || !tid) return;
    try {
      const data = await api.get(
        `/messages/?user_id=${encodeURIComponent(sid)}&other_id=${encodeURIComponent(tid)}`,
        { signal },
      );
      setMessages(data || []);
    } catch (_) {}
  }, []);

  // Auto-logout si la API responde 401
  useEffect(() => {
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("mocavi:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mocavi:unauthorized", onUnauthorized);
  }, [router]);

  useEffect(() => {
    const raw = localStorage.getItem("mocavi_student");
    const token = localStorage.getItem("mocavi_token");
    if (!raw || !token) { router.push("/login"); return; }
    const s = JSON.parse(raw);
    const sid = s.document_id || s.id;
    setStudentId(sid);
    sidRef.current = sid;

    const ctrl = new AbortController();
    let interval;
    let ws;

    api.get(`/teachers/default`, { signal: ctrl.signal })
      .then((t) => {
        if (!t) return;
        setTeacherId(t.id);
        tidRef.current = t.id;
        loadMessages(sid, t.id, ctrl.signal);
        // Polling cada 30s como respaldo del WebSocket
        interval = setInterval(() => loadMessages(sidRef.current, tidRef.current, ctrl.signal), 30000);

        const wsUrl = `${process.env.NEXT_PUBLIC_API_URL.replace("http", "ws")}/ws/${token}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = () => { loadMessages(sidRef.current, tidRef.current, ctrl.signal); };
        ws.onerror = () => {};
      })
      .catch(() => {});

    return () => {
      if (interval) clearInterval(interval);
      if (ws) ws.close();
      ctrl.abort();
    };
  }, [router, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !studentId || !teacherId) return;
    setSending(true);
    setInput("");
    try {
      await api.post(`/messages/`, {
        sender_type: "student", sender_id: studentId,
        receiver_type: "teacher", receiver_id: teacherId,
        content: text, media_type: "text",
      });
      loadMessages(studentId, teacherId);
    } catch (_) {}
    setSending(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-white text-sm">Docente</p>
            <p className="text-[10px] text-slate-400 font-bold">Mensajes privados</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-bold">Inicia una conversación con tu docente</p>
            <p className="text-slate-300 text-xs mt-1">Tus mensajes son privados</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.sender_type === "student";
          const prev = messages[i - 1];
          const curDate = new Date(m.created_at);
          const prevDate = prev ? new Date(prev.created_at) : null;
          const sameDay = prevDate && curDate.toDateString() === prevDate.toDateString();
          const today = new Date(); today.setHours(0,0,0,0);
          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
          const cd = new Date(curDate); cd.setHours(0,0,0,0);
          let label;
          if (cd.getTime() === today.getTime()) label = "Hoy";
          else if (cd.getTime() === yesterday.getTime()) label = "Ayer";
          else label = curDate.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: cd.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
          return (
            <div key={m.id}>
              {!sameDay && (
                <div className="flex items-center justify-center my-4 animate-fadeIn">
                  <span className="bg-slate-200/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{label}</span>
                </div>
              )}
            <div style={{ animationDelay: `${Math.min(i * 35, 280)}ms` }} className={`flex items-end gap-2 animate-slideUp [animation-fill-mode:both] ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shrink-0">
                  <GraduationCap size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div className="max-w-[78%] space-y-1">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
                <p className={`text-[10px] text-slate-400 ${isMe ? "text-right" : "text-left"}`}>
                  {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {isMe && (
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                  <User size={14} className="text-slate-500" />
                </div>
              )}
            </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Escribe un mensaje al docente..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-3 rounded-2xl transition-colors"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
