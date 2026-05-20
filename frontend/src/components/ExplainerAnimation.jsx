"use client";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Sparkles,
  MessageCircle,
  BarChart2,
  TrendingUp,
  FileText,
  ArrowRight,
  Zap,
} from "lucide-react";

// Polyfill: prefers-reduced-motion sin librerías externas
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// =====================================================================
// ExplainerAnimation — Versión "After Effects" (cinematográfica)
// =====================================================================
//   • Fondo: gradient mesh animado (3 blobs radiales con blur grande)
//   • Letterbox cinema (barras superior e inferior animadas)
//   • Vignette radial para profundidad
//   • Partículas flotantes (30) sobrepuestas
//   • Light leaks (manchas de color con mix-blend-mode)
//   • Kinetic typography en intro/outro (letras con stagger 3D)
//   • Cursor simulado con halo y click animado
//   • Counter animado de notas (0.0 → 4.6 con easing)
//   • Confetti al ver SUPERIOR
//   • Transiciones entre escenas tipo "fade through dark"
//   • Barra de progreso lineal con nombre de capítulo
//   • Respeta prefers-reduced-motion (todo se desactiva)
// =====================================================================

const TIMELINE = [
  { id: "intro",    title: "KNOWTIFY",                  ms: 2000 },
  { id: "upload",   title: "1 · Sube los exámenes",     ms: 4000 },
  { id: "grades",   title: "2 · Notas instantáneas",    ms: 4000 },
  { id: "feedback", title: "3 · Feedback IA",            ms: 4000 },
  { id: "chat",     title: "4 · En tiempo real",         ms: 4000 },
  { id: "outro",    title: "Empieza hoy",                ms: 2500 },
];

const TOTAL_MS = TIMELINE.reduce((a, s) => a + s.ms, 0);

export default function ExplainerAnimation({ className = "" }) {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);    // 0..TOTAL_MS, en bucle
  const [sceneIdx, setSceneIdx] = useState(0);

  // Loop del tiempo global (RAF)
  useEffect(() => {
    if (reduced) { setSceneIdx(1); return; } // sin animación: muestra escena 1 estática
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const elapsed = (now - start) % TOTAL_MS;
      setTick(elapsed);
      // Determinar escena actual
      let acc = 0;
      for (let i = 0; i < TIMELINE.length; i++) {
        acc += TIMELINE[i].ms;
        if (elapsed < acc) { setSceneIdx(i); break; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const currentScene = TIMELINE[sceneIdx];
  const progressPct = (tick / TOTAL_MS) * 100;

  // Transición "fade through dark" cuando empieza una nueva escena
  // (cubre los primeros 250ms y los últimos 250ms de cada escena)
  let sceneStart = 0;
  for (let i = 0; i < sceneIdx; i++) sceneStart += TIMELINE[i].ms;
  const sceneElapsed = tick - sceneStart;
  const FADE_MS = 250;
  const fadeIn  = Math.min(1, sceneElapsed / FADE_MS);
  const fadeOut = Math.min(1, (currentScene.ms - sceneElapsed) / FADE_MS);
  const transitionDim = 1 - Math.min(fadeIn, fadeOut);

  return (
    <div className={`relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/20 select-none ${className}`}>
      {/* Capa 1 — fondo gradient mesh */}
      <BackgroundMesh tick={tick} />

      {/* Capa 2 — partículas flotantes */}
      {!reduced && <ParticleField count={36} />}

      {/* Capa 3 — Light leaks (manchas violet/indigo con blend) */}
      {!reduced && <LightLeaks tick={tick} />}

      {/* Capa 4 — Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(2, 6, 23, 0.55) 100%)" }} />

      {/* Capa 5 — Letterbox cinema (barras superior/inferior) */}
      <Letterbox />

      {/* Capa 6 — Marco de "browser" sutil */}
      <BrowserChrome />

      {/* Capa 7 — Escenas */}
      <div className="absolute inset-0 z-20">
        <SceneIntro    active={currentScene.id === "intro"} />
        <SceneUpload   active={currentScene.id === "upload"}   tick={tick} sceneStart={sceneStart} />
        <SceneGrades   active={currentScene.id === "grades"}   tick={tick} sceneStart={sceneStart} />
        <SceneFeedback active={currentScene.id === "feedback"} tick={tick} sceneStart={sceneStart} />
        <SceneChat     active={currentScene.id === "chat"}     tick={tick} sceneStart={sceneStart} />
        <SceneOutro    active={currentScene.id === "outro"} />
      </div>

      {/* Capa 7.5 — Logo orbitando esquina superior derecha (siempre visible) */}
      <OrbitingLogo />

      {/* Capa 8 — Atenuación + glitch flash de transición */}
      <div className="absolute inset-0 bg-slate-950 pointer-events-none z-30 transition-opacity"
        style={{ opacity: transitionDim * 0.65 }} />
      {transitionDim > 0.7 && <GlitchFlash />}

      {/* Capa 9 — UI inferior: barra de progreso + título capítulo */}
      <BottomBar
        title={currentScene.title}
        sceneIdx={sceneIdx}
        progressPct={progressPct}
      />
    </div>
  );
}

/* ======================================================================
   Logo orbitando (decoración constante)
====================================================================== */
function OrbitingLogo() {
  return (
    <div className="absolute top-[8%] right-[3%] z-30 pointer-events-none"
      style={{ animation: "logoOrbit 8s linear infinite" }}>
      <div className="relative w-10 h-10"
        style={{ animation: "logoBob 3s ease-in-out infinite" }}>
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 blur-md opacity-60" />
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 ring-1 ring-white/30">
          <GraduationCap size={18} />
        </span>
        {/* Anillo orbital */}
        <span className="absolute -inset-3 rounded-full border border-violet-400/40"
          style={{ animation: "ringSpin 6s linear infinite" }} />
      </div>
      <style jsx>{`
        @keyframes logoOrbit {
          0%, 100% { transform: translate(0, 0); }
          25%      { transform: translate(-6px, 4px); }
          50%      { transform: translate(0, 8px); }
          75%      { transform: translate(6px, 4px); }
        }
        @keyframes logoBob {
          0%, 100% { transform: rotate(-6deg); }
          50%      { transform: rotate(6deg); }
        }
        @keyframes ringSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* Glitch flash que aparece en momentos de transición */
function GlitchFlash() {
  return (
    <div className="absolute inset-0 pointer-events-none z-30"
      style={{ animation: "glitchFlash 250ms steps(3) forwards", mixBlendMode: "screen" }}>
      <div className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(236,72,153,0.4), transparent)",
          transform: "translateX(-100%)",
          animation: "glitchSwipe 250ms ease-out forwards",
        }} />
      <style jsx>{`
        @keyframes glitchFlash {
          0%   { opacity: 0; }
          50%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes glitchSwipe {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/* ======================================================================
   BACKGROUND MESH — 3 blobs radiales con movimiento muy lento
====================================================================== */
function BackgroundMesh({ tick }) {
  const t = tick / 1000;
  const x1 = 30 + Math.sin(t * 0.4) * 18;
  const y1 = 35 + Math.cos(t * 0.35) * 15;
  const x2 = 75 + Math.cos(t * 0.5) * 12;
  const y2 = 60 + Math.sin(t * 0.45) * 18;
  const x3 = 50 + Math.sin(t * 0.3 + 2) * 22;
  const y3 = 80 + Math.cos(t * 0.4 + 1) * 10;
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950" />
      <div className="absolute inset-0"
        style={{
          background: `
            radial-gradient(closest-side at ${x1}% ${y1}%, rgba(99, 102, 241, 0.55), transparent 70%),
            radial-gradient(closest-side at ${x2}% ${y2}%, rgba(139, 92, 246, 0.45), transparent 70%),
            radial-gradient(closest-side at ${x3}% ${y3}%, rgba(236, 72, 153, 0.30), transparent 75%)`,
          filter: "blur(40px)",
        }} />
      {/* Grid sutil */}
      <div className="absolute inset-0 opacity-30 dark:opacity-15"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
    </div>
  );
}

/* ======================================================================
   PARTICLE FIELD — puntitos flotantes
====================================================================== */
function ParticleField({ count = 30 }) {
  const items = Array.from({ length: count });
  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
      {items.map((_, i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const size = 2 + (i % 4);
        const dur = 6 + (i % 7);
        const delay = (i * 0.4) % 5;
        return (
          <span key={i}
            className="absolute rounded-full bg-white dark:bg-indigo-200"
            style={{
              left: `${left}%`, top: `${top}%`,
              width: size, height: size,
              opacity: 0.35,
              filter: "blur(0.4px)",
              animation: `particleFloat ${dur}s ease-in-out ${delay}s infinite`,
            }} />
        );
      })}
      <style jsx>{`
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-30px) translateX(10px) scale(1.4); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

/* ======================================================================
   LIGHT LEAKS — manchas de color con mix-blend
====================================================================== */
function LightLeaks({ tick }) {
  const t = tick / 1000;
  return (
    <div className="absolute inset-0 pointer-events-none z-[6] mix-blend-screen">
      <span className="absolute rounded-full"
        style={{
          width: "30%", height: "30%",
          left: `${20 + Math.sin(t * 0.6) * 10}%`,
          top: `${10 + Math.cos(t * 0.8) * 6}%`,
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent 60%)",
          filter: "blur(40px)",
        }} />
      <span className="absolute rounded-full"
        style={{
          width: "35%", height: "35%",
          right: `${10 + Math.cos(t * 0.5) * 8}%`,
          bottom: `${15 + Math.sin(t * 0.7) * 6}%`,
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 60%)",
          filter: "blur(45px)",
        }} />
    </div>
  );
}

/* ======================================================================
   LETTERBOX cinema — barras top/bottom
====================================================================== */
function Letterbox() {
  return (
    <>
      <div className="absolute top-0 inset-x-0 h-[6%] bg-slate-950 z-40" />
      <div className="absolute bottom-0 inset-x-0 h-[6%] bg-slate-950 z-40" />
    </>
  );
}

/* ======================================================================
   BROWSER CHROME sutil sobre el letterbox superior
====================================================================== */
function BrowserChrome() {
  return (
    <div className="absolute top-0 inset-x-0 h-[6%] flex items-center px-4 gap-1.5 z-50">
      <span className="w-2 h-2 rounded-full bg-rose-500/80" />
      <span className="w-2 h-2 rounded-full bg-amber-400/80" />
      <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
      <span className="ml-3 text-[9px] font-bold tracking-widest text-slate-400">knowtify.app</span>
      <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-black text-slate-300">
        <GraduationCap size={10} /> KNOWTIFY
      </span>
    </div>
  );
}

/* ======================================================================
   BOTTOM BAR — barra de progreso + título capítulo
====================================================================== */
function BottomBar({ title, sceneIdx, progressPct }) {
  return (
    <div className="absolute bottom-0 inset-x-0 h-[6%] flex items-center px-5 gap-3 z-50 text-white">
      <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-80">
        {String(sceneIdx + 1).padStart(2, "0")}/{String(TIMELINE.length).padStart(2, "0")}
      </span>
      <span key={title} className="text-[10px] font-black uppercase tracking-widest text-white animate-fadeIn">
        {title}
      </span>
      <div className="ml-auto flex-1 max-w-[60%] h-[3px] rounded-full bg-white/15 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-all duration-100"
          style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

/* ======================================================================
   ESCENA INTRO — Kinetic typography "KNOWTIFY"
====================================================================== */
function SceneIntro({ active }) {
  if (!active) return null;
  const letters = "KNOWTIFY".split("");
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="text-center" style={{ perspective: 1000 }}>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-300 mb-3 animate-fadeIn">
          Plataforma educativa con IA
        </p>
        <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(99,102,241,0.6)]">
          {letters.map((l, i) => (
            <span key={i}
              className="inline-block"
              style={{
                animation: `introLetter 700ms cubic-bezier(0.34, 1.4, 0.5, 1) ${i * 60}ms both`,
                transformStyle: "preserve-3d",
              }}>
              {l}
            </span>
          ))}
        </h1>
        <div className="mt-6 inline-flex items-center gap-2 text-indigo-200 text-sm font-bold tracking-widest"
          style={{ animation: "introTagline 800ms ease-out 600ms both" }}>
          <Sparkles size={14} className="animate-pulse" />
          ENSEÑAR · CALIFICAR · INSPIRAR
          <Sparkles size={14} className="animate-pulse" />
        </div>
      </div>
      <style jsx>{`
        @keyframes introLetter {
          0%   { opacity: 0; transform: translateY(40px) rotateX(-90deg); }
          60%  { opacity: 1; transform: translateY(-6px) rotateX(15deg); }
          100% { opacity: 1; transform: translateY(0)    rotateX(0); }
        }
        @keyframes introTagline {
          from { opacity: 0; transform: translateY(12px) scale(0.95); letter-spacing: 0.05em; }
          to   { opacity: 1; transform: translateY(0)    scale(1);    letter-spacing: 0.2em; }
        }
      `}</style>
    </div>
  );
}

/* ======================================================================
   ESCENA 1 — Subir examen (con cursor simulado y motion blur)
====================================================================== */
function SceneUpload({ active, tick, sceneStart }) {
  if (!active) return null;
  const t = tick - sceneStart; // ms desde inicio de escena
  // Cursor: del centro-izquierda al centro-derecha, hace click a 1.4s, fade out
  const cursorX = 18 + (Math.min(t, 1400) / 1400) * 50; // %
  const cursorY = 50 + Math.sin((t / 1400) * Math.PI) * 6;
  const isClicking = t > 1300 && t < 1600;
  // Documento: aparece a 0ms, llega al destino a 1500ms con motion blur
  const docProgress = Math.min(1, t / 1600);
  const docY = -20 + 70 * easeOutCubic(docProgress);
  const docRot = -15 * (1 - docProgress);
  const docBlur = docProgress < 0.85 ? (1 - docProgress) * 6 : 0;
  // Counter de progreso IA: arranca cuando llega doc
  const procProgress = Math.max(0, Math.min(1, (t - 1500) / 2000));

  return (
    <SceneShell>
      <Title>Calificación con IA</Title>

      {/* Documento que cae con barrel roll y luego idle wobble */}
      <div className="absolute left-1/2 top-[18%]"
        style={{
          transform: `translate(-50%, ${docY}%) rotate(${docRot + (docProgress >= 1 ? 0 : 360 * docProgress)}deg)`,
          filter: `blur(${docBlur}px)`,
          willChange: "transform, filter",
          transition: "filter 100ms linear",
        }}>
        <div className="w-44 h-56 bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 px-4 py-4 space-y-2 relative"
          style={{ animation: docProgress >= 1 ? "docFloat 3s ease-in-out infinite" : "none" }}>
          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500">
            <FileText size={10} className="text-indigo-500" /> EXAMEN-MATEMÁTICAS.PDF
          </div>
          <div className="space-y-1.5 mt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-100 border-2 border-indigo-300" />
                <div className="h-1.5 flex-1 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 shadow-lg"
            style={{ transform: `scale(${docProgress})` }}>
            ✓ Listo
          </div>
        </div>
      </div>

      {/* Caja calificador IA con barra de progreso real */}
      <div className="absolute right-[8%] top-1/2 -translate-y-1/2"
        style={{ animation: "fadeUp 600ms cubic-bezier(0.4,0,0.2,1) 1100ms both" }}>
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl px-6 py-5 shadow-2xl shadow-indigo-500/50 ring-1 ring-white/20 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/20 p-1.5 rounded-lg">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">Calificador IA</span>
          </div>
          <div className="space-y-2">
            <div className="h-1.5 w-44 bg-white/15 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-emerald-300 to-white rounded-full relative"
                style={{ width: `${procProgress * 100}%`, transition: "width 100ms linear" }}>
                {/* Shimmer */}
                <span className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
                    animation: "shimmer 1.5s infinite",
                  }} />
              </div>
            </div>
            <p className="text-[10px] text-indigo-100 flex items-center gap-1">
              <Zap size={10} /> Procesando · {Math.round(procProgress * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Cursor simulado */}
      <FakeCursor x={cursorX} y={cursorY} clicking={isClicking} />

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px) translateY(-50%); }
          to   { opacity: 1; transform: translateY(0) translateY(-50%); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes docFloat {
          0%, 100% { transform: translate(-50%, 50%) rotate(-2deg); }
          50%      { transform: translate(-50%, 47%) rotate(2deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(2deg); }
          75%      { transform: rotate(-2deg); }
        }
      `}</style>
    </SceneShell>
  );
}

/* ======================================================================
   ESCENA 2 — Notas con counter animado y confetti en SUPERIOR
====================================================================== */
function SceneGrades({ active, tick, sceneStart }) {
  if (!active) return null;
  const t = tick - sceneStart;
  const students = [
    { name: "Aitana B.", target: 4.6, level: "SUPERIOR", color: "emerald" },
    { name: "Mateo C.",  target: 4.1, level: "ALTO",     color: "blue" },
    { name: "Sofía L.",  target: 3.4, level: "BÁSICO",   color: "amber" },
    { name: "Diego R.",  target: 2.8, level: "BAJO",     color: "rose" },
  ];

  return (
    <SceneShell>
      <Title>Notas calculadas al instante</Title>

      <div className="absolute left-[8%] right-[8%] top-[20%] bottom-[16%]"
        style={{ perspective: 1200 }}>
        <div className="relative h-full"
          style={{
            animation: "panelEnter 700ms cubic-bezier(0.34, 1.56, 0.5, 1) both, panelFloat 5s ease-in-out 700ms infinite",
            transformStyle: "preserve-3d",
          }}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl shadow-2xl shadow-indigo-500/30 ring-1 ring-violet-300/30 p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 p-1.5 rounded-lg">
                <BarChart2 size={12} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                Resultados · Periodo 1
              </span>
              <span className="ml-auto text-[9px] font-bold text-emerald-600 inline-flex items-center gap-1">
                <TrendingUp size={10} /> +12% vs anterior
              </span>
            </div>
            <div className="space-y-2.5">
              {students.map((s, i) => {
                const delay = i * 200; // ms
                const localT = Math.max(0, t - delay);
                const enterProg = Math.min(1, localT / 350);
                const counterProg = Math.min(1, Math.max(0, (localT - 200) / 1200));
                const display = (s.target * easeOutCubic(counterProg)).toFixed(1);
                const colors = COLORS[s.color];
                return (
                  <div key={s.name}
                    className="flex items-center gap-3"
                    style={{
                      opacity: enterProg,
                      transform: `perspective(800px) rotateY(${(1 - enterProg) * 80}deg) translateX(${(1 - enterProg) * -30}px)`,
                      transformOrigin: "left center",
                      transition: "transform 60ms linear",
                    }}>
                    <div className={`w-9 h-9 rounded-full ${colors.bg} text-white text-xs font-black flex items-center justify-center shadow-lg ${colors.shadow}`}
                      style={{ animation: counterProg >= 1 ? `avatarPulse 2.5s ease-in-out ${i * 200}ms infinite` : "none" }}>
                      {s.name.charAt(0)}
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 flex-1">{s.name}</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums"
                      style={{
                        textShadow: counterProg >= 1 && s.level === "SUPERIOR" ? "0 0 14px rgba(16, 185, 129, 0.6)" : "none",
                      }}>
                      {display}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest text-white px-2 py-1 rounded-full ${colors.bg}`}
                      style={{
                        opacity: counterProg > 0.85 ? 1 : 0,
                        transform: `scale(${counterProg > 0.85 ? 1 : 0.5}) rotate(${counterProg > 0.85 ? 0 : 180}deg)`,
                        transition: "all 500ms cubic-bezier(0.34, 1.7, 0.5, 1)",
                      }}>
                      {s.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confetti cuando aparece la primera nota SUPERIOR */}
      {t > 800 && t < 2200 && <Confetti />}

      <style jsx>{`
        @keyframes panelEnter {
          0%   { opacity: 0; transform: rotateX(-25deg) rotateY(15deg) scale(0.85); }
          100% { opacity: 1; transform: rotateX(2deg)   rotateY(-1deg) scale(1); }
        }
        @keyframes panelFloat {
          0%, 100% { transform: rotateX(2deg) rotateY(-1deg)   translateY(0); }
          50%      { transform: rotateX(0deg) rotateY(1.5deg)  translateY(-4px); }
        }
        @keyframes avatarPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%      { transform: scale(1.08) rotate(-3deg); }
        }
      `}</style>
    </SceneShell>
  );
}

/* ======================================================================
   ESCENA 3 — Feedback IA con typewriter y stroke-draw checks
====================================================================== */
function SceneFeedback({ active, tick, sceneStart }) {
  if (!active) return null;
  const t = tick - sceneStart;
  const fullText = "Buen trabajo en aritmética. Para mejorar en geometría, repasa el teorema de Pitágoras y los ejercicios 12 a 15.";
  const charProg = Math.min(1, t / 2200);
  const visibleText = fullText.slice(0, Math.floor(fullText.length * charProg));

  const suggestions = [
    "Practicar 5 ejercicios de triángulos rectángulos",
    "Ver tutorial de razones trigonométricas",
    "Resolver el quiz de práctica del periodo",
  ];

  return (
    <SceneShell>
      <Title>Feedback personalizado por estudiante</Title>

      {/* Card principal — Feedback */}
      <div className="absolute left-[8%] right-[8%] top-[20%]">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-violet-300/40 overflow-hidden">
          {/* Cabecera con glow + anillos rotando */}
          <div className="relative bg-gradient-to-r from-violet-500/20 via-violet-500/10 to-transparent px-5 py-3 overflow-hidden">
            {/* Anillos decorativos detrás */}
            <span className="absolute -left-4 -top-4 w-16 h-16 rounded-full border-2 border-violet-400/30"
              style={{ animation: "ringSpinSlow 8s linear infinite" }} />
            <span className="absolute -left-2 -top-2 w-12 h-12 rounded-full border border-fuchsia-400/30"
              style={{ animation: "ringSpinSlow 6s linear infinite reverse" }} />
            <div className="relative flex items-center gap-2">
              <span className="bg-violet-600 text-white p-1.5 rounded-lg shadow-lg shadow-violet-500/40"
                style={{ animation: "iconWobble 2s ease-in-out infinite" }}>
                <Sparkles size={12} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
                Análisis Gemini · Aitana B.
              </span>
              <span className="ml-auto text-[9px] font-bold text-violet-600">96% confianza</span>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">
              {visibleText}
              {charProg < 1 && (
                <span className="inline-block w-[2px] h-4 bg-violet-600 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sugerencias con check que se dibuja */}
      <div className="absolute left-[8%] right-[8%] bottom-[16%] space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">
          PLAN DE ESTUDIO RECOMENDADO
        </p>
        {suggestions.map((s, i) => {
          const delay = 2400 + i * 250;
          const local = Math.max(0, t - delay);
          const prog = Math.min(1, local / 400);
          return (
            <div key={i} className="flex items-start gap-2"
              style={{
                opacity: prog,
                transform: `translateX(${(1 - prog) * -16}px)`,
                transition: "transform 60ms linear",
              }}>
              <AnimatedCheck progress={prog} />
              <span className="text-[11px] text-white/90 font-medium">{s}</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes ringSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes iconWobble {
          0%, 100% { transform: rotate(0deg)   scale(1); }
          25%      { transform: rotate(-12deg) scale(1.08); }
          75%      { transform: rotate(12deg)  scale(1.08); }
        }
      `}</style>
    </SceneShell>
  );
}

/* ======================================================================
   ESCENA 4 — Mensajería con burbujas + indicador "escribiendo"
====================================================================== */
function SceneChat({ active, tick, sceneStart }) {
  if (!active) return null;
  const t = tick - sceneStart;

  return (
    <SceneShell>
      <Title>Mensajería en tiempo real</Title>

      {/* Burbuja docente */}
      <div className="absolute left-[10%] top-[24%]"
        style={{
          opacity: t > 200 ? 1 : 0,
          transform: `translateY(${t > 200 ? 0 : 10}px) scale(${t > 200 ? 1 : 0.94})`,
          transition: "all 400ms cubic-bezier(0.34, 1.4, 0.5, 1)",
        }}>
        <div className="flex items-end gap-2 max-w-[60%]">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/40">
            <GraduationCap size={14} />
          </div>
          <div className="bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[12px] text-slate-700 dark:text-slate-200 shadow-xl">
            ¡Felicitaciones por tu mejora! 🎉
            <span className="block text-[8px] text-slate-400 mt-1">10:42</span>
          </div>
        </div>
      </div>

      {/* Indicador "escribiendo..." entre burbujas */}
      {t > 1200 && t < 2400 && (
        <div className="absolute right-[10%] top-[44%] animate-fadeIn">
          <div className="flex items-end gap-2 justify-end max-w-[60%] ml-auto">
            <div className="bg-violet-100 dark:bg-violet-900/40 rounded-2xl rounded-br-sm px-4 py-3 shadow">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Burbuja estudiante */}
      <div className="absolute right-[10%] top-[44%]"
        style={{
          opacity: t > 2400 ? 1 : 0,
          transform: `translateY(${t > 2400 ? 0 : 10}px) scale(${t > 2400 ? 1 : 0.94})`,
          transition: "all 400ms cubic-bezier(0.34, 1.4, 0.5, 1)",
        }}>
        <div className="flex items-end gap-2 justify-end max-w-[60%] ml-auto">
          <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[12px] shadow-xl shadow-violet-500/40">
            ¡Gracias profe! 😊
            <span className="block text-[8px] text-white/70 mt-1">10:43 ✓✓</span>
          </div>
        </div>
      </div>

      {/* Botón flotante con badge ping */}
      <div className="absolute right-[8%] bottom-[18%]"
        style={{
          opacity: t > 3000 ? 1 : 0,
          transform: `scale(${t > 3000 ? 1 : 0.5})`,
          transition: "all 350ms cubic-bezier(0.34, 1.6, 0.5, 1)",
        }}>
        <div className="relative">
          <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl shadow-indigo-500/50">
            <MessageCircle size={18} />
          </div>
          <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
            2
          </span>
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 animate-ping opacity-60" />
        </div>
      </div>
    </SceneShell>
  );
}

/* ======================================================================
   ESCENA OUTRO — CTA final con kinetic "EMPIEZA HOY"
====================================================================== */
function SceneOutro({ active }) {
  if (!active) return null;
  const text = "EMPIEZA HOY";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ animation: "outroFade 500ms ease-out both" }}>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-300 mb-3 animate-fadeIn">
        Tu aula merece mejores herramientas
      </p>
      <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(139,92,246,0.6)]">
        {text.split("").map((l, i) => (
          <span key={i} className="inline-block"
            style={{
              animation: `outroLetter 700ms cubic-bezier(0.34, 1.4, 0.5, 1) ${i * 50}ms both`,
            }}>
            {l === " " ? " " : l}
          </span>
        ))}
      </h2>
      <div className="mt-8 inline-flex items-center gap-2 bg-white text-indigo-700 px-7 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-white/30"
        style={{ animation: "outroCta 600ms cubic-bezier(0.34, 1.4, 0.5, 1) 700ms both" }}>
        Probar gratis <ArrowRight size={14} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-6"
        style={{ animation: "fadeIn 600ms ease-out 1200ms both" }}>
        knowtify.app
      </p>
      <style jsx>{`
        @keyframes outroLetter {
          0%   { opacity: 0; transform: translateY(30px) scale(0.7); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0)    scale(1);   filter: blur(0); }
        }
        @keyframes outroCta {
          from { opacity: 0; transform: translateY(20px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes outroFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ======================================================================
   COMPONENTES AUXILIARES
====================================================================== */
function SceneShell({ children }) {
  return <div className="absolute inset-0 animate-fadeIn">{children}</div>;
}

// ── Title cinematográfico ────────────────────────────────────────────
// • Backdrop oscuro con blur y ring violeta para máxima legibilidad
// • Texto con gradiente indigo→violet→fuchsia animado (shimmer)
// • Entrada en "barrel roll" 3D con stagger por letra
// • Idle float sutil para que nunca se quede estático
function Title({ children }) {
  const text = String(children || "");
  return (
    <div
      className="absolute top-[10%] left-1/2 -translate-x-1/2 z-10"
      style={{ animation: "titleWrap 800ms cubic-bezier(0.34, 1.56, 0.64, 1) both, titleIdle 6s ease-in-out 800ms infinite" }}
    >
      <div className="relative">
        {/* Halo glow detrás */}
        <span className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)", opacity: 0.35 }} />
        {/* Backdrop con blur */}
        <span className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-950/70 backdrop-blur-md ring-1 ring-violet-400/40 shadow-2xl shadow-violet-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          {/* Texto con gradiente animado */}
          <span
            className="text-[11px] font-black uppercase tracking-[0.4em] bg-clip-text text-transparent inline-block"
            style={{
              backgroundImage: "linear-gradient(90deg, #c4b5fd, #f0abfc, #c4b5fd, #f0abfc)",
              backgroundSize: "300% 100%",
              animation: "titleShimmer 4s linear infinite",
              perspective: "600px",
              transformStyle: "preserve-3d",
            }}>
            {text.split("").map((ch, i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  animation: `titleLetter 700ms cubic-bezier(0.34, 1.7, 0.5, 1) ${i * 30}ms both`,
                }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" style={{ animationDelay: "400ms" }} />
        </span>
      </div>
      <style jsx>{`
        @keyframes titleWrap {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-30px) rotateX(-90deg) scale(0.6); filter: blur(8px); }
          60%  { opacity: 1; transform: translateX(-50%) translateY(4px)   rotateX(15deg)  scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0)     rotateX(0)      scale(1);    filter: blur(0); }
        }
        @keyframes titleIdle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-3px); }
        }
        @keyframes titleLetter {
          0%   { opacity: 0; transform: translateY(-20px) rotateY(-90deg) scale(0.4); }
          100% { opacity: 1; transform: translateY(0)     rotateY(0)      scale(1); }
        }
        @keyframes titleShimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
      `}</style>
    </div>
  );
}

function FakeCursor({ x, y, clicking }) {
  return (
    <div className="absolute z-40 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, transition: "left 80ms linear, top 80ms linear" }}>
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        {/* Halo del click */}
        {clicking && <span className="absolute inset-0 rounded-full bg-white/40"
          style={{ animation: "cursorRipple 500ms ease-out forwards" }} />}
        {/* Punta */}
        <div className={`relative w-4 h-4 rounded-full bg-white ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/40 transition-transform ${clicking ? "scale-75" : "scale-100"}`} />
      </div>
      <style jsx>{`
        @keyframes cursorRipple {
          from { width: 16px; height: 16px; opacity: 0.8; left: 0; top: 0; }
          to   { width: 60px; height: 60px; opacity: 0; left: -22px; top: -22px; }
        }
      `}</style>
    </div>
  );
}

function AnimatedCheck({ progress }) {
  // Dibuja un círculo + ✓ con stroke-dashoffset según progress 0..1
  const circ = 2 * Math.PI * 9;
  const checkLen = 14;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#10b981" strokeWidth="2"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} />
      <path d="M8 12.5 L11 15.5 L17 9.5" fill="none" stroke="#10b981" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={checkLen} strokeDashoffset={checkLen * (1 - Math.max(0, (progress - 0.4) / 0.6))} />
    </svg>
  );
}

function Confetti() {
  const items = Array.from({ length: 18 });
  return (
    <div className="absolute inset-x-0 top-[30%] h-40 pointer-events-none">
      {items.map((_, i) => {
        const left = (i * 11) % 100;
        const dur = 1.5 + (i % 5) * 0.2;
        const colors = ["bg-emerald-400", "bg-indigo-400", "bg-violet-400", "bg-amber-300", "bg-rose-400"];
        const color = colors[i % colors.length];
        return (
          <span key={i}
            className={`absolute w-1.5 h-2 rounded-sm ${color}`}
            style={{
              left: `${left}%`,
              top: 0,
              animation: `confetti ${dur}s cubic-bezier(0.4,0,0.6,1) ${(i * 60) % 800}ms forwards`,
            }} />
        );
      })}
      <style jsx>{`
        @keyframes confetti {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(160px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ======================================================================
   UTILIDADES
====================================================================== */
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const COLORS = {
  emerald: { bg: "bg-emerald-500", shadow: "shadow-emerald-500/40" },
  blue:    { bg: "bg-blue-500",    shadow: "shadow-blue-500/40" },
  amber:   { bg: "bg-amber-500",   shadow: "shadow-amber-500/40" },
  rose:    { bg: "bg-rose-500",    shadow: "shadow-rose-500/40" },
  violet:  { bg: "bg-violet-600",  shadow: "shadow-violet-500/40" },
  indigo:  { bg: "bg-indigo-600",  shadow: "shadow-indigo-500/40" },
};
