import React from "react";
import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const BoxIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <svg
    width="300"
    height="300"
    viewBox="35 40 160 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <polygon points="100,150 50,125 50,95 100,120" fill="#A8855A" />

    <polygon points="100,150 180,110 180,80 100,120" fill="#B48F62" />

    <polygon points="105,142 165,112 125,92 65,122" fill="#8F6F4B" />

    <path
      d="M100,120 L180,80 L130,55 L50,95 Z M105,112 L65,92 L125,62 L165,82 Z"
      fill="#C19A6B"
      fillRule="evenodd"
    />

    <polygon
      points="105,112 165,82 125,62 65,92"
      fill="#ECF0F1"
      opacity="0.3"
    />

    <g
      stroke="#6D4A2C"
      strokeWidth="0.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M50,95 L100,120 L180,80" /> <path d="M100,150 L100,120" />{" "}
      <path d="M50,125 L100,150 L180,110" /> <path d="M50,95 L50,125" />{" "}
      <path d="M180,80 L180,110" /> <path d="M50,95 L130,55 L180,80" />{" "}
      <polygon points="105,112 165,82 125,62 65,92" fill="none" />
      <path d="M50,95 L60,98" />
      <path d="M50,95 L55,90" />
      <path d="M180,80 L170,83" />
      <path d="M180,80 L175,75" />
      <path d="M100,120 L100,125" />
    </g>
  </svg>
);
