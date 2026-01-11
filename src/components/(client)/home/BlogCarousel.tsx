"use client";

import Link from "next/link";
import Image from "next/image";
import { Blog } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BlogCarouselProps {
  blogs: Blog[];
}

export default function BlogCarousel({ blogs }: BlogCarouselProps) {
  if (!blogs || blogs.length === 0) return null;

  return (
    <div className="w-full">
      <div 
        className={cn(
          "flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory",
          "scrollbar-hide",
          "-mx-4 px-4 sm:mx-0 sm:px-0"
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {blogs.map((blog) => (
          <Link 
            key={blog._id} 
            href={`/blog/${blog.slug}`}
            className={cn(
               "group relative flex-none snap-start",
               "w-[85vw] sm:w-[45%] md:w-[30%] lg:w-[24%]" // Mobile: 85vw, Desktop: ~4 cards
            )}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card-background transition-shadow hover:shadow-lg">
              {/* Image Container */}
              <div className="relative aspect-[3/2] w-full overflow-hidden">
                <Image
                  src={blog.imageUrl}
                  alt={blog.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 25vw"
                />
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                {blog.publishedAt && (
                   <time className="mb-2 text-xs font-medium text-muted-foreground">
                     {format(new Date(blog.publishedAt), "MMM d, yyyy")}
                   </time>
                )}
                
                <h3 className="mb-2 font-heading text-lg font-bold leading-tight text-primary line-clamp-2 group-hover:text-accent transition-colors">
                  {blog.title}
                </h3>
                
                {/* Excerpt - stripping HTML tags simply */}
                <p className="text-sm text-muted-foreground line-clamp-3">
                   {blog.content.replace(/<[^>]+>/g, '')}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
