"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// #6 — Evolución del promedio del estudiante por periodo.
// Se aísla en su propio componente para cargar recharts con dynamic import.
export default function EvolutionChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v) => [v, "Nota final"]}
          labelFormatter={(l) => l}
          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", fontSize: 13 }}
        />
        {/* Línea de aprobación 3.0 */}
        <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="nota"
          stroke="#7c3aed"
          strokeWidth={3}
          dot={{ r: 5, fill: "#7c3aed" }}
          activeDot={{ r: 7 }}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
