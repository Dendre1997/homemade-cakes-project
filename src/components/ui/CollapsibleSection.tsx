import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleSection = ({
  title,
  isOpen,
  onToggle,
  children,
  className,
}: CollapsibleSectionProps) => {
  return (
    <div
      className={cn(
        "mb-4 overflow-hidden rounded-medium border border-border transition-all duration-200",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
            "flex w-full items-center justify-between bg-subtleBackground px-6 py-4 text-left transition-colors hover:bg-subtleBackground/80",
            isOpen && "border-b border-border"
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
        <div className="bg-background p-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
