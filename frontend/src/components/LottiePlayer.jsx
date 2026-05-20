"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// lottie-react tiene canvas/SVG renderer internos que no funcionan en SSR.
// Usamos dynamic con ssr:false para cargarlo solo en cliente.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * Reproductor universal de animaciones Lottie.
 *
 * Uso A — animación local:
 *   import data from "@/animations/calificacion.json";
 *   <LottiePlayer animationData={data} loop autoplay className="w-64" />
 *
 * Uso B — animación remota (lottiefiles.com):
 *   <LottiePlayer src="https://assets.../graduation.json" loop autoplay />
 *
 * Props:
 *   - animationData : objeto JSON Lottie ya cargado
 *   - src           : URL al JSON (alternativa a animationData)
 *   - loop          : repetir (default true)
 *   - autoplay      : iniciar al montar (default true)
 *   - speed         : 1 = velocidad normal, 0.5 = lento, 2 = rápido
 *   - hover         : reproduce sólo al pasar el ratón
 *   - className     : tamaño/posicionamiento (Tailwind)
 */
export default function LottiePlayer({
  animationData,
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  hover = false,
  className = "w-full h-full",
  ariaLabel = "Animación",
}) {
  const [data, setData] = useState(animationData || null);
  const [isHovered, setIsHovered] = useState(false);

  // Si nos dan una URL, descargamos el JSON una sola vez
  useEffect(() => {
    if (animationData || !src) return;
    let cancelled = false;
    fetch(src)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src, animationData]);

  if (!data) {
    // Skeleton ligero mientras carga el JSON
    return <div className={`${className} bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse`} aria-label={ariaLabel} />;
  }

  const shouldPlay = hover ? isHovered : autoplay;

  return (
    <div
      className={className}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      role="img"
      aria-label={ariaLabel}
    >
      <Lottie
        animationData={data}
        loop={loop}
        autoplay={shouldPlay}
        rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
      />
    </div>
  );
}
