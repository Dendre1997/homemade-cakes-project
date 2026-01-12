"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FlavorStat {
  _id: string; // The flavor name
  count: number;
  [key: string]: any; // Recharts compatibility
}

interface FlavorChartProps {
  data: FlavorStat[];
}

const COLORS = [
  "#FF6384", // Vibrant Pink
  "#36A2EB", // Vibrant Blue
  "#FFCE56", // Vibrant Yellow
  "#4BC0C0", // Vibrant Teal
  "#9966FF", // Vibrant Purple
  "#FF9F40", // Vibrant Orange
];

export default function FlavorChart({ data }: FlavorChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
      <h3 className="text-lg font-bold mb-4 font-heading">Top 5 Flavors</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="_id"
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => <span className="text-sm font-medium text-gray-600 ml-1">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
