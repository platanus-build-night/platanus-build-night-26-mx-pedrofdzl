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

const NAVY = "#1b3a5c";
const BRICK = "#8c2b22";
const OLIVE = "#6e7b3d";
const MUSTARD = "#b08400";
const INK = "#23282e";

const axisProps = {
  tick: { fill: INK, fontSize: 10, fontFamily: "var(--font-mono)" },
  stroke: "#8e8676",
};

const tooltipStyle = {
  contentStyle: {
    background: "#f2efe6",
    border: "2px solid #8e8676",
    borderRadius: 0,
    fontFamily: "var(--font-mono)",
    fontSize: 11,
  },
  labelStyle: { color: INK, fontWeight: 600 },
};

export function CoverageChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={coverageByCategory}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid stroke="#bcb4a2" strokeDasharray="2 2" vertical={false} />
        <XAxis dataKey="category" {...axisProps} interval={0} angle={-25} dy={8} height={48} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
        <Bar dataKey="backed" name="Backed" stackId="a" fill={NAVY} />
        <Bar dataKey="unbacked" name="Unbacked" stackId="a" fill={BRICK} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={answersOverTime}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid stroke="#bcb4a2" strokeDasharray="2 2" vertical={false} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
        <Area
          type="stepAfter"
          dataKey="answered"
          name="Answered"
          stroke={NAVY}
          fill={NAVY}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Area
          type="stepAfter"
          dataKey="flagged"
          name="Flagged"
          stroke={BRICK}
          fill={BRICK}
          fillOpacity={0.2}
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
  const palette = [BRICK, MUSTARD, OLIVE, NAVY, "#4a5560"];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={42}
          outerRadius={72}
          paddingAngle={2}
          stroke="#f2efe6"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
