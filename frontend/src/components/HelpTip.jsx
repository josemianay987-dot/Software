"use client";
import { HelpCircle, Info } from "lucide-react";

/**
 * HelpTip — icono de ayuda (? o i) con tooltip pegado AL LADO del icono.
 *
 * 100% CSS (sin JavaScript de posición): el tooltip es un hijo absoluto del
 * icono, así que SIEMPRE aparece junto a él, a su misma altura, y nunca se
 * "va para otro lado" ni salta al hacer scroll. Se muestra al pasar el ratón
 * o al enfocar con teclado (group-hover / group-focus-within de Tailwind).
 *
 * Props:
 *   - text     : contenido (string o JSX)
 *   - title    : título opcional
 *   - variant  : "help" (?) | "info" (i)
 *   - side     : "right" (por defecto, al ladito derecho) | "left"
 *   - size     : tamaño del icono (px)
 *   - tone     : "slate" | "indigo" | "violet" | "white"
 */
export default function HelpTip({
  text,
  title,
  variant = "help",
  side = "right",
  size = 15,
  tone = "slate",
  className = "",
}) {
  const Icon = variant === "info" ? Info : HelpCircle;

  const toneCls = {
    slate:  "text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400",
    indigo: "text-indigo-500 hover:text-indigo-700 dark:text-indigo-400",
    violet: "text-violet-500 hover:text-violet-700 dark:text-violet-400",
    white:  "text-white/80 hover:text-white",
  }[tone] || "text-slate-400 hover:text-indigo-600";

  // Posición del tooltip respecto al icono
  const posCls = {
    right:  "left-full ml-2 top-1/2 -translate-y-1/2",
    left:   "right-full mr-2 top-1/2 -translate-y-1/2",
    bottom: "top-full mt-2 left-0",   // debajo (para iconos pegados al borde superior)
    top:    "bottom-full mb-2 left-0",
  }[side] || "left-full ml-2 top-1/2 -translate-y-1/2";

  return (
    <span className={`relative inline-flex align-middle group/help ${className}`}>
      <span
        role="button"
        tabIndex={0}
        aria-label="Ayuda"
        className={`inline-flex items-center justify-center cursor-help transition-colors ${toneCls}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Icon size={size} />
      </span>

      <span
        role="tooltip"
        className={`pointer-events-none absolute ${posCls} z-[9999] w-52 max-w-[70vw] rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs leading-snug px-3 py-2 shadow-2xl ring-1 ring-white/10 normal-case tracking-normal opacity-0 invisible transition-opacity duration-150 group-hover/help:opacity-100 group-hover/help:visible group-focus-within/help:opacity-100 group-focus-within/help:visible`}
      >
        {title && (
          <span className="block font-black text-[10px] uppercase tracking-widest text-indigo-300 mb-1">
            {title}
          </span>
        )}
        <span className="block font-medium text-slate-100">{text}</span>
      </span>
    </span>
  );
}
