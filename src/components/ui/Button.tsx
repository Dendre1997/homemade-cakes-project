import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Basic styles for every button
  "inline-flex items-center justify-center rounded-medium font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      // Variables by purposes 
      variant: {
        primary:"bg-primary text-text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary:"bg-secondary text-text-main hover:bg-secondary/90 focus:ring-secondary",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      // By size
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    // By default
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
