"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CheckoutBlocked() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-background relative overflow-hidden">
      {/* Dynamic Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl text-center bg-white/80 backdrop-blur-md border border-primary/10 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Soft Premium Brand Accent Badge */}
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-accent animate-pulse" />
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary mb-4 tracking-tight leading-tight">
         We currently accept custom requests only
        </h1>

        <div className="w-12 h-[2px] bg-accent/30 mx-auto mb-6 rounded-full" />

        <p className="font-body text-base sm:text-lg text-primary/80 leading-relaxed mb-8 max-w-md mx-auto">
          Our online checkout for ready-made products is temporarily unavailable as we focus on creating fully personalized cakes for each celebration
          <br /><br />
          You can still submit a request easily through our custom form — just tell us what you need and we’ll take care of the rest
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/custom-order" className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto px-8 h-12 text-md rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 bg-accent hover:bg-accent/90 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              Create Custom Cake Request
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link href="/gallery" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto px-8 h-12 text-md rounded-xl bg-white border border-primary/20 hover:border-accent/40 hover:bg-subtleBackground text-primary/80 font-semibold transition-all active:scale-98"
            >
              Browse Gallery
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
