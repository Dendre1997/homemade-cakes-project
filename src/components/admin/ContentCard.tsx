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
        "h-full rounded-2xl border border-primary/15 bg-background/20 p-5 shadow-sm backdrop-blur-xl backdrop-saturate-150",
        "transition-[transform,box-shadow,border-color] duration-300 motion-reduce:transition-none",
        "hover:border-accent hover:shadow-lg motion-safe:hover:-translate-y-1"
      )}
    >
      <div className="mb-4 w-fit rounded-full bg-background/40 p-3 shadow-sm transition-transform motion-reduce:transition-none motion-safe:group-hover:scale-110">
        <div className="text-primary transition-colors group-hover:text-accent">
          {icon}
        </div>
      </div>

      <h3 className="mb-2 font-heading text-lg font-semibold tracking-tight text-primary text-balance transition-colors group-hover:text-accent">
        {title}
      </h3>

      <p className="font-body text-sm text-primary/70 text-pretty">{description}</p>
    </div>
  );

  if (href && href !== "#") {
    return (
      <Link href={href} className="group block h-full min-w-0">
        {CardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className="group block h-full min-w-0">
      {CardContent}
    </div>
  );
};
