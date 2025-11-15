import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const FourInchBentoIcon: React.FC<IconProps> = ({
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
      rx="27"
      ry="8"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M23 75V53C23 48.6 35.5 45 50 45C64.5 45 77 48.6 77 53V75"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse
      cx="50"
      cy="53"
      rx="27"
      ry="8"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
