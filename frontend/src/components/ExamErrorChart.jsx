"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Gráfico de % de error por pregunta. Se aísla para que recharts (~120KB)
// se cargue sólo cuando el docente abre el modal de estadísticas.
export default function ExamErrorChart({ stats, height = 220 }) {
  if (!stats || stats.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={stats} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="question" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Error"]}
          labelFormatter={(l) => `Pregunta ${l}`}
        />
        <Bar dataKey="error_rate" radius={[3, 3, 0, 0]}>
          {stats.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.error_rate >= 60
                  ? "#ef4444"
                  : entry.error_rate >= 30
                    ? "#f59e0b"
                    : "#6366f1"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
