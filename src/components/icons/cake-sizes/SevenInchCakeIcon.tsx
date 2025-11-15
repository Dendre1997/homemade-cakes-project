import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SevenInchCakeIcon: React.FC<IconProps> = ({
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
      rx="47"
      ry="14"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M3 75V28C3 21.7 24 14 50 14C76 14 97 21.7 97 28V75"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse
      cx="50"
      cy="28"
      rx="47"
      ry="14"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
