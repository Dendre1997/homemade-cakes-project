"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  imageUrl: string | null;
  href: string;
  className?: string;
}

const FeatureCard = ({
  title,
  imageUrl,
  href,
  className,
}: FeatureCardProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-large bg-neutral-100",
        className
      )}
    >
      <div className="absolute inset-0 h-full w-full">
        <Image
          src={imageUrl || "/placeholder.png"}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
      </div>

      <div className="relative h-full p-md flex flex-col justify-start items-start">
        <h3 className="font-heading text-h2 text-white drop-shadow-sm">
          {title}
        </h3>
        {/* TODO ADD ARROW OR BUTTON */}
      </div>
    </Link>
  );
};

export default FeatureCard;
