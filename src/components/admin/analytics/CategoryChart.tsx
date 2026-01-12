"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryStat {
  _id: string; // The category name
  revenue: number;
  count: number;
  [key: string]: any; // Recharts compatibility
}

interface CategoryChartProps {
  data: CategoryStat[];
}

const COLORS = [
  "#FF6384", // Vibrant Pink
  "#36A2EB", // Vibrant Blue
  "#FFCE56", // Vibrant Yellow
  "#4BC0C0", // Vibrant Teal
  "#9966FF", // Vibrant Purple
  "#FF9F40", // Vibrant Orange
];

export default function CategoryChart({ data }: CategoryChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
      <h3 className="text-lg font-bold mb-4 font-heading">Sales by Category</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
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
              formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, "Revenue"]}
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
