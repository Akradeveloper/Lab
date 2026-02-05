"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ACCENT = "#22d3ee";
const MUTED_BAR = "var(--border)";

type Props = {
  totalCompleted: number;
  totalLessons: number;
};

export function CompletionPieChart({ totalCompleted, totalLessons }: Props) {
  const pending = Math.max(0, totalLessons - totalCompleted);
  const data = [
    { name: "Completadas", value: totalCompleted, color: ACCENT },
    { name: "Pendientes", value: pending, color: MUTED_BAR },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-muted">
        Aún no hay lecciones en el currículo.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => [
              `${value} ${value === 1 ? "lección" : "lecciones"}`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
