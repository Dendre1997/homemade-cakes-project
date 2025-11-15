import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const SixInchCakeIcon: React.FC<IconProps> = ({
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
      rx="40"
      ry="12"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M10 75V35C10 29.6 28 23 50 23C72 23 90 29.6 90 35V75"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse
      cx="50"
      cy="35"
      rx="40"
      ry="12"
      fill="#EAE2D8"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);
