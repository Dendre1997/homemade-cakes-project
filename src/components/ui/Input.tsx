import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-border bg-white py-sm px-md font-body text-body file:border-0 file:bg-transparent file:text-sm placeholder:text-text-primary/50",
          "hover:border-accent-secondary",
          "disabled:cursor-not-allowed disabled:bg-border disabled:opacity-70",
          error
            ? "border-error focus-visible:ring-error/30" // 3. Apply error styles if true
            : "focus-visible:outline-none focus-visible:border-accent-primary focus-visible:ring-2 focus-visible:ring-accent/30", // Default styles

          "disabled:cursor-not-allowed disabled:bg-border disabled:opacity-70",
          "focus-visible:outline-none",

          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
