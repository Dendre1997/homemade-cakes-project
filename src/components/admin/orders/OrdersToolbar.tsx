import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface OrdersToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  viewMode: 'table' | 'grid';
  setViewMode: (m: 'table' | 'grid') => void;
  timeScope: 'day' | 'week' | 'month';
  setTimeScope: (s: 'day' | 'week' | 'month') => void;
}

export const OrdersToolbar = ({ 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter,
    viewMode,
    setViewMode,
    timeScope,
    setTimeScope
}: OrdersToolbarProps) => {

  const filters = [
    { label: "All Orders", value: "all" },
    { label: "Require Confirmation", value: "pending_confirmation" },
    { label: "In Progress", value: "processing" },
    { label: "Ready", value: "ready" },
    { label: "Completed", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="flex flex-col  justify-between items-center gap-4 py-4 px-6 border-b border-border">
      {/* 1. Search */}
      <div className="w-full flex flex-col md:flex-row md:items-center gap-4">
    
    {/* 1. Search */}
    <div className="relative flex-1 md:max-w-[70%]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Input
        type="text"
        placeholder="Search by name, order id or phone number"
        className="w-full h-10 pl-9 bg-background"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    {/* 2. Time Scope Toggle */}
    <div className="flex-shrink-0 flex justify-center p-1 bg-muted/50 rounded-lg border border-border">
      {(["day", "week", "month"] as const).map((scope) => (
        <button
          key={scope}
          onClick={() => setTimeScope(scope)}
          className={`
            px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-all
            ${
              timeScope === scope
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }
          `}
        >
          {scope}
        </button>
      ))}
    </div>

  </div>

      {/* 3. Right: Filters + View Mode */}
      <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
        {/* Filters (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-image-scroll flex-1 md:flex-none py-3">
          {filters.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`
                            h-8 px-4 text-xs font-semibold rounded-full whitespace-nowrap transition-all border flex-shrink-0
                            ${
                              isActive
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                            }
                        `}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
