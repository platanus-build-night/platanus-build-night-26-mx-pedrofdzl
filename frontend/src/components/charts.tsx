"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { answersOverTime, coverageByCategory } from "@/lib/mock";

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const C3 = "var(--chart-3)";
const C4 = "var(--chart-4)";
const C5 = "var(--chart-5)";

const axisProps = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  stroke: "var(--border)",
  tickLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 0,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--popover-foreground)" },
};

const legendStyle = { fontSize: 11, color: "var(--muted-foreground)" };

export function CoverageChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={coverageByCategory}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="category" {...axisProps} interval={0} angle={-25} dy={10} height={52} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="backed" name="Backed" stackId="a" fill={C1} />
        <Bar dataKey="unbacked" name="Unbacked" stackId="a" fill={C5} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={answersOverTime}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillAnswered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C1} stopOpacity={0.4} />
            <stop offset="100%" stopColor={C1} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} />
        <Area
          type="monotone"
          dataKey="answered"
          name="Answered"
          stroke={C1}
          fill="url(#fillAnswered)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="flagged"
          name="Flagged"
          stroke={C5}
          fill="transparent"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IssueMixChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
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
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
