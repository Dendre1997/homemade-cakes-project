"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Order, OrderStatus } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { OrdersCalendar } from "@/components/admin/orders/OrdersCalendar";
import { OrdersToolbar } from "@/components/admin/orders/OrdersToolbar";
import { OrderCard } from "@/components/admin/orders/OrderCard";
import { startOfMonth, endOfMonth, format, isSameDay, startOfWeek, endOfWeek, isWithinInterval, startOfDay, isAfter } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

// Helper for stable date comparison
const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

const ManageOrdersPage = () => {
  const { showAlert } = useAlert();
  
  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState<any>(null); // New State for availability
  const [diametersMap, setDiametersMap] = useState<Record<string, number>>({});

  // Filters
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid'); // Layout Mode
  const [timeScope, setTimeScope] = useState<'day' | 'week' | 'month'>('month'); // Date Scope
  const [hasInitialized, setHasInitialized] = useState(false); // Guard for initial smart selection

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setOrders([]); // Clear orders to avoid stale data race condition
      
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const params = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: end.toISOString()
      });

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error(error);
      showAlert("Failed to load orders", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, showAlert]);

  const fetchAvailability = useCallback(async () => {
    try {
        const res = await fetch("/api/availability", { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            setAvailabilityData(data);
        }
    } catch (e) {
        console.error("Failed to load availability", e);
    }
  }, []);

  const fetchDiameters = useCallback(async () => {
    try {
      const res = await fetch("/api/diameters");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        data.forEach((d: any) => {
          map[d._id] = d.sizeValue;
        });
        setDiametersMap(map);
      }
    } catch (e) {
      console.error("Failed to load diameters", e);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchAvailability(); // Load availability on mount
    fetchDiameters();
  }, [fetchOrders, fetchAvailability]);

  // Smart Initial Date Selection
  useEffect(() => {
    if (!isLoading && orders.length > 0 && !hasInitialized) {
        const today = startOfDay(new Date());
        
        // 1. Check for orders Today
        const todayStr = toISODate(today);
        const hasOrdersToday = orders.some(o => 
            o.deliveryInfo.deliveryDates.some(d => toISODate(new Date(d.date)) === todayStr)
        );

        if (hasOrdersToday) {
            setSelectedDate(today);
            setTimeScope('day');
        } else {
            // 2. Find Closest Future Date
            const futureDates = orders
                .flatMap(o => o.deliveryInfo.deliveryDates.map(d => new Date(d.date)))
                .filter(d => isAfter(d, today) || isSameDay(d, today)) // Include today just in case, primarily for future
                .sort((a, b) => a.getTime() - b.getTime());

            if (futureDates.length > 0) {
                // Found a future date
                setSelectedDate(futureDates[0]);
                setTimeScope('day');
            } else {
                // 3. Fallback to Today (no future orders found in this month/batch)
                setSelectedDate(today);
                setTimeScope('day');
            }
        }
        setHasInitialized(true);
    } else if (!isLoading && orders.length === 0 && !hasInitialized) {
         // No orders at all, just default to today
         setSelectedDate(startOfDay(new Date()));
         setTimeScope('day');
         setHasInitialized(true);
    }
  }, [orders, isLoading, hasInitialized]);

  // Handle Month Navigation
  const handleMonthChange = (newMonth: Date) => {
      setCurrentMonth(newMonth);
      setTimeScope('month'); // Switch to month view when navigating months
      setSelectedDate(null); // Optional: Clear specific date selection
  };

  // Handle Date Selection (with Cross-Month support)
  const handleDateSelect = (date: Date | null) => {
      if (!date) {
          setSelectedDate(null);
          return;
      }

      // Check if the clicked date is in the currently fetched month
      if (!isSameDay(startOfMonth(date), startOfMonth(currentMonth))) {
          // It's a different month! We need to switch context.
          setCurrentMonth(startOfMonth(date)); // This triggers fetchOrders via useEffect
      }

      setSelectedDate(date);
      setTimeScope('day');
  };


  // Status Update Handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
      const oldOrders = [...orders];
      setOrders(prev => prev.map(o => o._id.toString() === orderId ? { ...o, status: newStatus } : o));

      try {
           const res = await fetch(`/api/admin/orders/${orderId}/status`, {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ status: newStatus })
           });

           if (!res.ok) throw new Error("Failed to update status");
      } catch (e) {
          setOrders(oldOrders);
          throw e; 
      }
  };

  // Smart Filtering Logic
  const filteredOrders = useMemo(() => {
    let result = orders;

    // 1. Status Filter (Step 1: The Tabs)
    if (statusFilter === 'all') {
         // "Active Work" View: Show everything EXCEPT 'cancelled' and 'delivered'
         result = result.filter(o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED);
    } else if (statusFilter === 'pending_confirmation') {
         result = result.filter(o => o.status === OrderStatus.PENDING_CONFIRMATION);
    } else if (statusFilter === 'processing') {
         result = result.filter(o => o.status === OrderStatus.IN_PROGRESS);
    } else if (statusFilter === 'ready') {
         result = result.filter(o => o.status === OrderStatus.READY);
    } else if (statusFilter === 'delivered') {
         result = result.filter(o => o.status === OrderStatus.DELIVERED);
    } else if (statusFilter === 'cancelled') {
         result = result.filter(o => o.status === OrderStatus.CANCELLED);
    }

    // 2. Time Scope Filter (Step 2: The Calendar)
    if (timeScope === 'day' && selectedDate) {
         const targetDateStr = toISODate(selectedDate);
         result = result.filter(order => 
             // Check if ANY delivery date matches the selected date
             order.deliveryInfo.deliveryDates.some(d => toISODate(new Date(d.date)) === targetDateStr)
         );
    } else if (timeScope === 'week' && selectedDate) {
         const start = startOfWeek(selectedDate);
         const end = endOfWeek(selectedDate);
         result = result.filter(order => 
             order.deliveryInfo.deliveryDates.some(d => 
                isWithinInterval(new Date(d.date), { start, end })
             )
         );
    }

    // 3. Search Filter
    if (searchQuery) {
         const lowerQ = searchQuery.toLowerCase();
         result = result.filter(order => 
             order._id.toLowerCase().includes(lowerQ) ||
             order.customerInfo.name.toLowerCase().includes(lowerQ) ||
             order.customerInfo.phone.includes(lowerQ)
         );
    }

    return result;
  }, [orders, searchQuery, statusFilter, timeScope, selectedDate]);


  if (isLoading && orders.length === 0) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-col gap-6 p-6 mx-auto max-w-[1600px] min-h-screen bg-background text-foreground">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-primary">Orders Dashboard</h1>
              <p className="text-muted-foreground">Manage All Orders.</p>
          </div>
          <Link href="/admin/orders/new" className="shrink-0">
                 <Button variant="primary" className="shadow-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="whitespace-nowrap">Add Order</span>
                 </Button>
          </Link>
      </div>

      <div className="flex flex-col gap-6">
          <div className="space-y-4">
               <OrdersCalendar 
                  orders={orders}
                  currentMonth={currentMonth}
                   onMonthChange={handleMonthChange}
                   selectedDate={selectedDate}
                   onSelectDate={handleDateSelect}
                   timeScope={timeScope}
               />
           </div>
          {/* TOP SECTION: Orders List (Toolbar + View) */}
           <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden min-h-[500px]">
               {/* Header / Toolbar */}
               <div className="flex flex-col border-b border-border">
                   <div className="px-6 py-4 bg-muted/20 border-b border-border flex justify-between items-center">
                       <h2 className="font-semibold text-lg">
                            {timeScope === 'day' && selectedDate && `Orders for ${format(selectedDate, "MMM do")}`}
                            {timeScope === 'week' && selectedDate && `Orders for Week of ${format(startOfWeek(selectedDate), "MMM do")}`}
                            {(timeScope === 'month' || !selectedDate) && `All Orders (${format(currentMonth, "MMMM")})`}
                            <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredOrders.length})</span>
                       </h2>
            </div>
            
            
                   
                   <OrdersToolbar 
                      searchQuery={searchQuery} 
                      setSearchQuery={setSearchQuery}
                      statusFilter={statusFilter}
                      setStatusFilter={setStatusFilter}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      timeScope={timeScope}
                      setTimeScope={setTimeScope}
                   />
               </div>

               <div className="flex-1 p-4 bg-background">
                   {filteredOrders.length === 0 ? (
                       <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                           <p>No orders found for this view.</p>
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                           {filteredOrders.map(order => (
                               <OrderCard 
                                    key={order._id} 
                                    order={order} 
                                    onStatusChange={handleStatusChange} 
                                    diametersMap={diametersMap}
                               />
                           ))}
                       </div>
                   )}
               </div>
           </div>
      </div>
    </div>
  );
};

export default ManageOrdersPage;
