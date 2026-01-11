import Link from "next/link";
import { Button } from "@/components/ui/Button";
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

      {/* Overlay - Darkens on hover/mobile to make text readable */}
      <div 
        className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-500",
            // Mobile: Always visible with semi-transparent background
            "bg-black/30 opacity-100",
            // Desktop: Hidden by default, fades in on hover
            "md:bg-black/40 md:opacity-0 md:group-hover:opacity-100"
        )}
      >
        <div className="text-center transform transition-transform duration-500 translate-y-0 md:translate-y-4 md:group-hover:translate-y-0">
          <Link href={content.linkUrl || "/"}>
            <Button
              size="lg"
              className="font-bold text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform"
            >
              {content.buttonText || "Order Now"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
