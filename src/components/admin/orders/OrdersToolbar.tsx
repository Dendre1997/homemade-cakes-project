import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface OrdersToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  timeScope: "day" | "week" | "month";
  setTimeScope: (s: "day" | "week" | "month") => void;
}

export const OrdersToolbar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  timeScope,
  setTimeScope,
}: OrdersToolbarProps) => {
  const filters = [
    { label: "Active", value: "all" },
    { label: "Confirm", value: "pending_confirmation" },
    { label: "In progress", value: "processing" },
    { label: "Ready", value: "ready" },
    { label: "Done", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-primary/10 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            type="search"
            placeholder="Name, order ID, phone, email…"
            className="h-10 w-full pl-9"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex shrink-0 justify-center rounded-xl border border-primary/10 bg-background/30 p-1">
          {(["day", "week", "month"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setTimeScope(scope)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                timeScope === scope
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary/65 hover:bg-background/50 hover:text-primary"
              )}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {filters.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "border-accent bg-accent text-white"
                  : "border-primary/15 bg-background/30 text-primary/70 hover:border-primary/25 hover:text-primary"
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
