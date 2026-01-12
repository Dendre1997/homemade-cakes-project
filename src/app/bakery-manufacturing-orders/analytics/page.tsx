"use client";

import { useEffect, useState } from "react";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import { format, subDays } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/exportUtils";
import { SourceChart } from "@/components/admin/analytics/SourceChart";
import CategoryChart from "@/components/admin/analytics/CategoryChart";
import FlavorChart from "@/components/admin/analytics/FlavorChart";
import LoadingSpinner from "@/components/ui/Spinner";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#938ef0ff'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (!dateRange.to) return;
        const query = new URLSearchParams({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        });
        
        const res = await fetch(`/api/admin/analytics?${query}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (dateRange.from && dateRange.to) {
      fetchData();
    }
  }, [dateRange]);

  const handleExport = (type: "sales" | "production" | "all") => {
    if (!data) return;

    if (type === "sales" || type === "all") {
      const detailedOrders = data.detailedOrders || [];
      const totalRevenue = detailedOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

      const salesData = detailedOrders.map((order: any) => ({
        "Order ID": order._id.slice(-6).toUpperCase(),
        Date: new Date(order.createdAt).toISOString().split('T')[0],
        "Items Count": order.itemsCount,
        "Total ($)": (order.totalAmount || 0).toFixed(2),
      }));

      salesData.push({
        "Order ID": "TOTAL",
        Date: "",
        "Items Count": "",
        "Total ($)": totalRevenue.toFixed(2),
      });

      exportToCSV(salesData, `sales_report_${format(new Date(), "yyyy-MM-dd")}`);
    }

    if (type === "production" || type === "all") {
      const soldItems = data.soldItemsLog || [];
      const totalQty = soldItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const totalRevenue = soldItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

      const productionData = soldItems.map((item: any) => ({
        Date: new Date(item.date).toISOString().split('T')[0],
        "Product Name": item.productName || "Unknown",
        "Variant/Size": `${item.flavor} - ${item.size}`,
        "Price ($)": (item.price || 0).toFixed(2),
        "Quantity": item.quantity,
      }));

      productionData.push({
        Date: "TOTAL",
        "Product Name": "",
        "Variant/Size": "",
        "Price ($)": totalRevenue.toFixed(2),
        "Quantity": totalQty,
      });

      exportToCSV(productionData, `production_log_${format(new Date(), "yyyy-MM-dd")}`);
    }
  };

  const kpis = data?.kpis?.[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, totalItemsSold: 0 };
  const hasData = kpis.totalOrders > 0;

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen text-primary">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-heading">Analytics</h1>
        
        {/* Compact Popover Date Picker */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full md:w-[240px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, y")} -{" "}
                      {format(dateRange.to, "MMM dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] md:w-auto p-0 border-none bg-transparent shadow-none" align="end">
               <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <CustomDateRangePicker
                    startDate={dateRange.from}
                    endDate={dateRange.to}
                    onSelectRange={(start, end) => {
                       if (start) {
                          setDateRange({ from: start, to: end ?? undefined });
                       }
                    }}
                    className="p-4 w-full md:min-w-[460px] shadow-none border-0"
                  />
               </div>
            </PopoverContent>
          </Popover>

          {/* Export Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="px-3" disabled={!hasData || loading}>
                <Download className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 bg-white rounded-lg shadow-xl border border-gray-100">
               <div className="flex flex-col gap-1">
                 <button 
                    onClick={() => handleExport("sales")}
                    className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                 >
                    Export Sales Report (.csv)
                 </button>
                 <button 
                    onClick={() => handleExport("production")}
                    className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                 >
                    Export Production Stats (.csv)
                 </button>
                 <div className="h-px bg-gray-100 my-1"></div>
                 <button 
                    onClick={() => handleExport("all")}
                    className="text-left px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors"
                 >
                    Download All
                 </button>
               </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Date Range Feedback */}
      <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-md">
        <p className="text-sm md:text-base text-primary font-medium">
          Showing statistics for:{" "}
          <span className="font-bold">
            {format(dateRange.from, "MMM d, yyyy")} — {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "Selecting..."}
          </span>
        </p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-lg border border-border">
          <h2 className="text-xl font-bold text-gray-500">No data available for this period.</h2>
          <p className="text-gray-400">Try selecting a different date range.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards - Mobile First Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KpiCard title="Total Revenue" value={`$${kpis.totalRevenue.toFixed(2)}`} />
            <KpiCard title="Total Orders" value={kpis.totalOrders} />
            <KpiCard title="Avg. Order Value" value={`$${kpis.averageOrderValue.toFixed(2)}`} />
            <KpiCard title="Items Sold" value={kpis.totalItemsSold} />
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-border overflow-hidden">
            <h3 className="text-lg font-bold mb-4 font-heading">Revenue Over Time</h3>
            <div className="h-[300px] md:h-[400px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.salesOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="_id" 
                    tickFormatter={(str) => format(new Date(str), 'MMM d')}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} width={35} />
                  <Tooltip 
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    formatter={(value: any) => [`$${value}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Source of Orders */}
            <SourceChart data={data.sourceStats || []} />

            {/* Sales by Category */}
            <CategoryChart data={data.categoryStats || []} />

            {/* Top Flavors */}
            <FlavorChart data={data.flavorStats} />

            {/* Top Sizes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
              <h3 className="text-lg font-bold mb-4 font-heading">Popular Sizes</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.diameterStats} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Products Table */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-border">
               <h3 className="text-lg font-bold mb-4 font-heading">Top Selling Products</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left min-w-[300px]">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3 text-right">Units</th>
                        <th className="px-4 py-3 text-right">Rev</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts?.map((product: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium truncate max-w-[150px]">{product.name || "Unknown Product"}</td>
                          <td className="px-4 py-3 text-right">{product.totalSold}</td>
                          <td className="px-4 py-3 text-right">${(product.revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>

            {/* Discount Codes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
              <h3 className="text-lg font-bold mb-4 font-heading">Promo Code Performance</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3 text-right">Products Sold</th>
                        <th className="px-4 py-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.discountStats?.length > 0 ? (
                        data.discountStats.map((discount: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-accent font-medium">{discount._id}</td>
                            <td className="px-4 py-3 text-right">{discount.totalItemsSold}</td>
                            <td className="px-4 py-3 text-right font-medium">${(discount.totalRevenue || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No promo codes used in this period.</td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>

            {/* Automatic Discounts */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-border">
              <h3 className="text-lg font-bold mb-4 font-heading">Automatic Discount Performance</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">Discount Name</th>
                        <th className="px-4 py-3 text-right">Products Sold</th>
                        <th className="px-4 py-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.automaticDiscountStats?.length > 0 ? (
                        data.automaticDiscountStats.map((discount: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-accent">{discount._id}</td>
                            <td className="px-4 py-3 text-right">{discount.totalItemsSold}</td>
                            <td className="px-4 py-3 text-right font-medium">${(discount.totalRevenue || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No automatic discounts applied in this period.</td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-border transition-all hover:shadow-md">
      <p className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider">{title}</p>
      <p className="text-2xl md:text-3xl font-bold text-primary mt-2">{value}</p>
    </div>
  );
}
