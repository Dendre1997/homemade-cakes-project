import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  rating: number; // A number from 0 to 5
  className?: string;
}

const TestimonialCard = ({
  quote,
  author,
  rating,
  className,
}: TestimonialCardProps) => {
  return (
    // --- The Card Container ---
    <div
      className={cn(
        "rounded-medium border border-border bg-card-background p-xl shadow-md",
        className
      )}
    >
      {/* --- Star Rating --- */}
      <div className="flex items-center gap-xs">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "h-5 w-5",
              index < rating ? "fill-accent text-accent" : "text-border"
            )}
          />
        ))}
      </div>

      {/* --- The Quote --- */}
      <div className="relative mt-md">
        {/* Decorative quotation mark */}
        <span className="absolute -top-2 -left-4 font-heading text-6xl text-primary/20">
          “
        </span>
        {/* The quote text itself */}
        <p className="relative font-heading italic text-[22px] leading-snug text-primary">
          {quote}
        </p>
      </div>

      {/* --- The Author --- */}
      <p className="mt-md text-right font-body text-body font-bold text-primary">
        — {author}
      </p>
    </div>
  );
};

export default TestimonialCard;
