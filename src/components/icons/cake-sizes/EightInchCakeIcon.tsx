import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const EightInchCakeIcon: React.FC<IconProps> = ({
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
      rx="50"
      ry="15"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M0 75V22C0 15.7 22.3 7 50 7C77.6 7 100 15.7 100 22V75"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse
      cx="50"
      cy="22"
      rx="50"
      ry="15"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
