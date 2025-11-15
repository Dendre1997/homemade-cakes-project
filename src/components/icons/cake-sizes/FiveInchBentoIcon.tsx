import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const FiveInchBentoIcon: React.FC<IconProps> = ({
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
    {...props}
  >
    <ellipse
      cx="50"
      cy="75"
      rx="33"
      ry="10"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M17 75V49C17 44.5 32 39 50 39C68 39 83 44.5 83 49V75"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse
      cx="50"
      cy="49"
      rx="33"
      ry="10"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
