import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  /** Glass header matches schedule / dashboard surfaces */
  variant?: "default" | "glass";
}

export const CollapsibleSection = ({
  title,
  isOpen,
  onToggle,
  children,
  className,
  variant = "default",
}: CollapsibleSectionProps) => {
  const isGlass = variant === "glass";

  return (
    <div
      className={cn(
        "mb-4 overflow-hidden transition-all duration-200",
        isGlass
          ? "rounded-2xl border border-primary/15 shadow-sm backdrop-blur-xl"
          : "rounded-medium border border-border",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-5 py-4 text-left transition-colors sm:px-6",
          isGlass
            ? "bg-background/25 hover:bg-background/40"
            : "bg-subtleBackground hover:bg-subtleBackground/80",
          isOpen &&
            (isGlass ? "border-b border-primary/10" : "border-b border-border")
        )}
      >
        <span className="font-heading text-h4 font-bold text-primary">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-primary/70" />
        ) : (
          <ChevronDown className="h-5 w-5 text-primary/70" />
        )}
      </button>
      
      {isOpen && (
        <div
          className={cn(
            "animate-in fade-in slide-in-from-top-1 p-5 duration-200 sm:p-6",
            isGlass ? "bg-background/10" : "bg-background"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
