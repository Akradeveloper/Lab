"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ACCENT = "#22d3ee";
const MUTED_BAR = "var(--border)";

export type ProgressByModuleForChart = {
  moduleId: string;
  moduleTitle: string;
  completedCount: number;
  totalCount: number;
};

type Props = {
  data: ProgressByModuleForChart[];
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function ProgressByModuleChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    name: truncate(d.moduleTitle, 20),
    pendientes: Math.max(0, d.totalCount - d.completedCount),
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            type="number"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            formatter={(value, name) => {
              const n = name ?? "";
              const label =
                n === "completedCount"
                  ? "Completadas"
                  : n === "pendientes"
                  ? "Pendientes"
                  : n;
              return [value ?? 0, label];
            }}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.moduleTitle ?? ""
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) =>
              value === "completedCount" ? "Completadas" : "Pendientes"
            }
          />
          <Bar
            dataKey="completedCount"
            name="completedCount"
            fill={ACCENT}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
          <Bar
            dataKey="pendientes"
            name="pendientes"
            fill={MUTED_BAR}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
