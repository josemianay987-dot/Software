"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Bot, Loader2, User } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";

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

function MarkdownText({ text }) {
  const lines = text.split("\n");
  const elements = [];
  lines.forEach((line, i) => {
    if (/^### /.test(line))
      elements.push(<p key={i} className="font-black text-sm mt-3 mb-0.5">{parseInline(line.slice(4), i * 100)}</p>);
    else if (/^## /.test(line))
      elements.push(<p key={i} className="font-black text-base mt-3 mb-0.5">{parseInline(line.slice(3), i * 100)}</p>);
    else if (/^# /.test(line))
      elements.push(<p key={i} className="font-black text-lg mt-3 mb-1">{parseInline(line.slice(2), i * 100)}</p>);
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^\d+/)[0];
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="shrink-0 font-bold text-indigo-500">{num}.</span>
          <span>{parseInline(line.replace(/^\d+\.\s/, ""), i * 100)}</span>
        </div>
      );
    } else if (/^\s*[\*\-]\s/.test(line)) {
      const indent = /^\s{2,}/.test(line);
      elements.push(
        <div key={i} className={`flex gap-2 my-0.5 ${indent ? "ml-4" : ""}`}>
          <span className="shrink-0 text-indigo-400 font-black">•</span>
          <span>{parseInline(line.replace(/^\s*[\*\-]\s/, ""), i * 100)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5 leading-relaxed">{parseInline(line, i * 100)}</p>);
    }
  });
  return <div className="text-sm">{elements}</div>;
}

export default function ChatbotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    { role: "bot", text: "¡Hola! Soy tu tutor IA. Puedo ayudarte con cualquier duda académica. ¿En qué tema necesitas ayuda hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-logout si la API responde 401
  useEffect(() => {
    const onUnauthorized = () => router.push("/login");
    window.addEventListener("mocavi:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mocavi:unauthorized", onUnauthorized);
  }, [router]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const history = newMessages.slice(1).map((m, i, arr) =>
        m.role === "user" ? { user: m.text, bot: arr[i + 1]?.text || "" } : null
      ).filter(Boolean);
      const d = await api.post(`/chatbot`, { message: text, history });
      setMessages(prev => [...prev, { role: "bot", text: d.reply || "No pude generar una respuesta." }]);
    } catch (err) {
      const msg = err instanceof ApiError && err.message
        ? err.message
        : "Error de conexión. Intenta de nuevo.";
      setMessages(prev => [...prev, { role: "bot", text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-white text-sm">Tutor IA</p>
            <p className="text-[10px] text-emerald-500 font-bold">En línea</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-2xl w-full mx-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            className={`flex items-end gap-2 animate-slideUp [animation-fill-mode:both] ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "bot" && (
              <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center shrink-0">
                <Bot size={15} className="text-violet-600 dark:text-violet-400" />
              </div>
            )}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl ${
              m.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm text-sm leading-relaxed"
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
            }`}>
              {m.role === "user" ? m.text : <MarkdownText text={m.text} />}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shrink-0">
                <User size={15} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center">
              <Bot size={15} className="text-violet-600" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <Loader2 size={16} className="animate-spin text-violet-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Escribe tu pregunta..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-3 rounded-2xl transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
