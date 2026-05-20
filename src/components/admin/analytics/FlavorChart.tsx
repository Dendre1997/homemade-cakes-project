"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RawFlavorItem {
  flavorId?: string;
  flavor?: string;
  customFlavor?: string;
  flavorDocName?: string;
  categoryName?: string;
  quantity: number;
}

interface FlavorChartProps {
  data: RawFlavorItem[];
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
  const [filter, setFilter] = useState("All");

  const availableCategories = useMemo(() => {
    if (!data || data.length === 0) return ["All"];
    const categories = new Set<string>();
    data.forEach(item => {
      if (item.categoryName) {
        categories.add(item.categoryName);
      } else {
        categories.add("Other");
      }
    });
    return ["All", ...Array.from(categories).sort()];
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const filtered = filter === "All" 
      ? data 
      : data.filter(item => {
          const cat = item.categoryName || "Other";
          return cat === filter;
        });

    const aggregated: Record<string, number> = {};

    filtered.forEach(item => {
      let flavorName = "Unknown";
      
      if (item.flavorDocName) {
        flavorName = item.flavorDocName;
      } else if (item.flavor) {
        flavorName = item.flavor;
      } else if (item.customFlavor) {
        flavorName = item.customFlavor;
      }

      aggregated[flavorName] = (aggregated[flavorName] || 0) + (item.quantity || 1);
    });

    delete aggregated["Unknown"];

    const result = Object.keys(aggregated).map(name => ({
      _id: name,
      count: aggregated[name]
    }));

    result.sort((a, b) => b.count - a.count);
    return result.slice(0, 5);
  }, [data, filter]);

  return (
    <div className="bg-white p-6 pb-14 rounded-xl shadow-sm border border-border flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-lg font-bold font-heading">Top 5 Flavors</h3>
        <div className="flex gap-2 flex-wrap">
           {availableCategories.map(cat => (
              <button
                 key={cat}
                 onClick={() => setFilter(cat)}
                 className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${filter === cat ? 'bg-accent text-white border-accent' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                 {cat}
              </button>
           ))}
        </div>
      </div>
      
      <div className="h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {chartData.map((entry, index) => (
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
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
             No flavor data for this category.
          </div>
        )}
      </div>
    </div>
  );
}
