"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SourceData {
  name: string;
  value: number;
  [key: string]: any;
}

interface SourceChartProps {
  data: SourceData[];
}

const SOURCE_COLORS: Record<string, string> = {
  web: "#3b82f6", // Blue-500 (Primary-ish)
  instagram: "#E1306C", 
  phone: "#22c55e", // Green-500
  other: "#94a3b8", // Slate-400
  walkin: "#f59e0b", // Amber-500
};

const DEFAULT_COLOR = "#cbd5e1"; // Slate-300

export function SourceChart({ data }: SourceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
      <h3 className="text-lg font-bold mb-4 font-heading">Orders by Source</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => {
                const sourceKey = entry.name.toLowerCase();
                const color = SOURCE_COLORS[sourceKey] || DEFAULT_COLOR;
                return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
              })}
            </Pie>
            <Tooltip 
                formatter={(value: any) => [value, 'Orders']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
