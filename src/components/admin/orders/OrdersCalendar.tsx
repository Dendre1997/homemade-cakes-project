
import { Order } from "@/types";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/Button";

import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface OrdersCalendarProps {
  orders: Order[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  timeScope?: 'day' | 'week' | 'month';
}

export const OrdersCalendar = ({
  orders,
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  timeScope = 'day',
}: OrdersCalendarProps) => {
  
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  // Generate exact days for this month
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Auto-Scroll Logic: Manual Math Approach
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedDate || !scrollContainerRef.current) return;

    // Small timeout to allow layout to settle
    const timer = setTimeout(() => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const container = scrollContainerRef.current;
        if (!container) return;

        // Find the target element inside the specific container
        const targetElement = container.querySelector(`[data-date="${dateStr}"]`) as HTMLElement;

        if (targetElement) {
            // Calculate center position
            const containerWidth = container.clientWidth;
            const itemLeft = targetElement.offsetLeft; 
            const itemWidth = targetElement.clientWidth;

            // Formula: Item Position - Half Container + Half Item = Center
            const scrollTo = itemLeft - (containerWidth / 2) + (itemWidth / 2);

            container.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedDate, currentMonth]);

  const getLoadStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const dailyOrders = orders.filter(o => 
        o.deliveryInfo.deliveryDates.some(d => format(new Date(d.date), "yyyy-MM-dd") === dateStr)
    );

    const totalItemsCount = dailyOrders.reduce((total, order) => {
        const orderItemsCount = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        return total + orderItemsCount;
    }, 0);

    if (totalItemsCount === 0) return null;
    if (totalItemsCount <= 2) return "low"; 
    if (totalItemsCount <= 5) return "medium"; 
    return "high"; 
  };

  // Helper: Check if date is selected (Day mode) or in selected week (Week mode)
  const isDateActive = (date: Date) => {
      if (!selectedDate) return false;
      if (timeScope === 'day') return isSameDay(date, selectedDate);
      if (timeScope === 'week') {
          return isWithinInterval(date, { 
              start: startOfWeek(selectedDate), 
              end: endOfWeek(selectedDate) 
          });
      }
      return false; 
  };
  
  // Highlight Styles
  const getDateStyle = (date: Date) => {
      const active = isDateActive(date);
      const isExactDay = selectedDate && isSameDay(date, selectedDate);

      if (!active) return "hover:bg-muted/50 text-foreground";

      if (timeScope === 'day') {
           return "bg-primary text-white font-bold shadow-md scale-105";
      }

      if (timeScope === 'week') {
           if (isExactDay) return "bg-primary text-white font-bold shadow-sm";
           return "bg-primary/20 text-primary font-semibold";
      }
      
      return "";
  };


  const startDayIndex = startDate.getDay(); // 0 = Sunday
  const paddingDays = Array.from({ length: startDayIndex });

  return (
    <div className="w-full flex justify-center py-4 bg-background">
      <div className="w-full md:w-[90%] lg:w-[100%] max-w-[1400px] flex flex-col items-center gap-4 transition-all duration-300">
        
        {/* Header (Shared) */}
        <div className="flex items-center justify-between w-full md:justify-center md:gap-4 shrink-0 relative px-4 md:px-0 ">
           <Button
             variant="ghost"
             onClick={() => onMonthChange(subMonths(currentMonth, 1))}
           >
             <ChevronLeft className="w-6 h-6 text-primary" />
           </Button>

           <div className="text-lg font-medium text-muted-foreground uppercase tracking-widest text-center">
             <span>{format(startDate, "MMMM yyyy")}</span>
             {timeScope === 'week' && selectedDate && (
                 <span className="block text-[15px] text-primary">
                     Week {format(startOfWeek(selectedDate), "d")} - {format(endOfWeek(selectedDate), "d")}
                 </span>
             )}
           </div>

           <Button
             variant="ghost"
             onClick={() => onMonthChange(addMonths(currentMonth, 1))}
           >
             <ChevronRight className="w-6 h-6 text-primary" />
           </Button>
        </div>

        {/* MOBILE VIEW: Grid Calendar */}
        <div className="w-full md:hidden px-4">
             {/* Day Names */}
             <div className="grid grid-cols-7 mb-2 text-center">
                 {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                     <div key={day} className="text-xs font-semibold text-muted-foreground">{day}</div>
                 ))}
             </div>
             
             {/* Calendar Grid */}
             <div className="grid grid-cols-7 gap-y-2 gap-x-2">
                 {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                 {monthDays.map((day) => {
                   const style = getDateStyle(day);
                   const status = getLoadStatus(day);
                   const isActive = isDateActive(day);
                   
                   return (
                     <div 
                        key={day.toString()}
                        data-date={format(day, 'yyyy-MM-dd')}
                        onClick={() => onSelectDate(day)} 
                        className={`
                            flex flex-col items-center justify-center aspect-square rounded-full cursor-pointer relative transition-all
                            ${style}
                        `}
                     >
                         <span className="text-sm">{format(day, "d")}</span>
                         
                         {/* Bar for Mobile */}
                         {status && !isActive && (
                             <div className="absolute bottom-1 w-full px-2">
                                <div className={`h-1 rounded-full ${
                                    status === "low" ? "w-[30%] bg-green-500" : 
                                    status === "medium" ? "w-[60%] bg-yellow-500" : "w-full bg-red-500"
                                }`} />
                             </div>
                         )}
                     </div>
                   );
                 })}
             </div>
        </div>

        {/* DESKTOP VIEW: Horizontal Strip */}
        <div className="hidden md:flex flex-1 overflow-hidden relative mx-2 w-full">
              <div 
                  ref={scrollContainerRef}
                  className="flex justify-between items-center w-full overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-3"
              >
                {monthDays.map((day) => {
                  const style = getDateStyle(day);
                  const status = getLoadStatus(day);
                  const isActive = isDateActive(day);
                  const isExactDay = selectedDate && isSameDay(day, selectedDate);
                  
                  // Specific styling for desktop strip
                  let containerClass = "opacity-70 hover:opacity-100 hover:bg-muted/5";
                  let textClass = "text-muted-foreground font-medium";
                  let numClass = "font-light text-foreground";

                  if (isActive) {
                      containerClass = "opacity-100";
                      if (timeScope === 'day') {
                          containerClass += " bg-primary shadow-md transform -translate-y-1";
                          textClass = "text-white font-bold";
                          numClass = "text-white font-bold scale-110";
                      } else if (timeScope === 'week') {
                          containerClass += isExactDay ? " bg-primary shadow-sm" : " bg-primary/10 border border-primary/20";
                          textClass = isExactDay ? "text-white font-bold" : "text-primary font-semibold";
                          numClass = isExactDay ? "text-white font-bold" : "text-primary font-bold";
                      }
                  }

                  return (
                    <div
                      key={day.toString()}
                      data-date={format(day, 'yyyy-MM-dd')}
                      onClick={() => onSelectDate(day)}
                      className={`
                        flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 p-2 rounded-xl
                        ${containerClass}
                         min-w-[60px] snap-center flex-shrink-0
                      `}
                    >
                      <span className={`text-xs uppercase tracking-wider ${textClass}`}>
                        {format(day, "EEE")}
                      </span>
                      <span className={`text-3xl leading-none transition-transform ${numClass}`}>
                        {format(day, "d")}
                      </span>

                      {/* Progress Bar Indicator */}
                      <div className="w-full px-2 mt-1">
                          <div className={`h-1.5 rounded-full transition-all duration-300 ${
                              status === "low" ? "w-[30%] bg-green-500" :
                              status === "medium" ? "w-[60%] bg-yellow-500" :
                              status === "high" ? "w-full bg-red-500" : 
                              "w-0 bg-transparent"
                          } ${isActive && timeScope === 'day' ? "brightness-125" : ""}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
        </div>

      </div>
    </div>
  );
};
