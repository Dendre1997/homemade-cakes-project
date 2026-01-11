import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-body text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-md hover:bg-accent/90",
        secondary:
          "border border-accent bg-transparent text-accent hover:bg-accent/20",
        text: "text-accent underline-offset-4 hover:underline",
        danger: "bg-error text-white hover:bg-error/90",
        default: "bg-primary text-text-on-primary shadow hover:opacity-90",
        outline:
          "border border-border bg-transparent shadow-sm hover:bg-subtleBackground hover:text-primary",
        ghost: "hover:bg-subtleBackground hover:text-primary",
      },
      size: {
        default: "py-sm px-lg",
        text: "p-xs",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10 p-2",
      },
    },
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
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
