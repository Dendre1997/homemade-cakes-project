"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ContentCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

export const ContentCard = ({
  title,
  description,
  icon,
  href,
  onClick,
}: ContentCardProps) => {
  const CardContent = (
    <div
      className={cn(
        "h-full p-lg rounded-large border border-border bg-card-background transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1 hover:border-accent cursor-pointer"
      )}
    >
      <div className="mb-md p-md bg-subtleBackground rounded-full w-fit shadow-sm group-hover:scale-110 transition-transform">
        <div className="text-primary group-hover:text-accent transition-colors">
          {icon}
        </div>
      </div>

      <h3 className="font-heading text-h3 text-primary mb-sm group-hover:text-accent transition-colors">
        {title}
      </h3>

      <p className="font-body text-small text-primary/70">{description}</p>
    </div>
  );

  if (href && href !== "#") {
    return (
      <Link href={href} className="group block h-full">
        {CardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className="group block h-full">
      {CardContent}
    </div>
  );
};
