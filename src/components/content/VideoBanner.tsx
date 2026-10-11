import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { VideoBannerContent } from "@/types";
import { cn } from "@/lib/utils";

interface VideoBannerProps {
  content: VideoBannerContent | null;
}

export const VideoBanner = ({ content }: VideoBannerProps) => {
  if (!content || !content.isActive || !content.videoUrl) return null;

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden group">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-label="Promotional video"
      >
        <source src={content.videoUrl} type="video/mp4" />
        {/* Fallback for browsers that don't support video */}
      </video>

      {/* Overlay — always visible below md; on hover-capable md+ hidden until hover or focus within */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-500",
          "bg-black/30 md:bg-black/40",
          "[@media(hover:hover)_and_(min-width:768px)]:opacity-0",
          "[@media(hover:hover)_and_(min-width:768px)]:group-hover:opacity-100",
          "[@media(hover:hover)_and_(min-width:768px)]:has-[a:focus]:opacity-100",
        )}
      >
        <div
          className={cn(
            "text-center transform transition-transform duration-500 translate-y-0",
            "[@media(hover:hover)_and_(min-width:768px)]:translate-y-4",
            "[@media(hover:hover)_and_(min-width:768px)]:group-hover:translate-y-0",
            "[@media(hover:hover)_and_(min-width:768px)]:has-[a:focus]:translate-y-0",
          )}
        >
          <Link
            href={content.linkUrl || "/"}
            className={cn(
              buttonVariants({ size: "lg" }),
              "font-bold text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform",
            )}
          >
            {content.buttonText || "Order Now"}
          </Link>
        </div>
      </div>
    </div>
  );
};
