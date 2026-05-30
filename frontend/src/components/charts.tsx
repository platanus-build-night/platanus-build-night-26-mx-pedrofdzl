"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const C3 = "var(--chart-3)";
const C4 = "var(--chart-4)";
const C5 = "var(--chart-5)";

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)" },
  itemStyle: { color: "var(--popover-foreground)" },
};

const legendStyle = { fontSize: 11, color: "var(--muted-foreground)" };

export function IssueMixChart({ data }: { data: { name: string; value: number }[] }) {
  const palette = [C1, C2, C3, C4, C5];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={84}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
