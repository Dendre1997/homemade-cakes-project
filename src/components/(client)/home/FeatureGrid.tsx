"use client";

import FeatureCard from "./FeatureCard";
import { cn } from "@/lib/utils";

interface FeatureItem {
  id: string;
  name: string;
  imageUrl?: string;
  href: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  title?: string;
}

const FeatureGrid = ({ items, title }: FeatureGridProps) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-md">
      <div className="mx-auto max-w-7xl px-lg">
        {title && (
          <h2 className="mb-lg font-heading text-h2 text-primary text-center">
            {title}
          </h2>
        )}

        <div className="grid grid-cols-2 gap-md md:grid-cols-3 auto-rows-[200px] md:auto-rows-[250px]">
          {items.map((item, index) => (
            <FeatureCard
              key={item.id}
              title={item.name}
              imageUrl={item.imageUrl || null}
              href={item.href}
                  className={cn(
                  
                index === 0
                  ? "col-span-2 md:col-span-1"
                  : "col-span-1",

                index === 0 && items.length > 3
                  ? "md:row-span-2 h-full"
                  : ""
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
