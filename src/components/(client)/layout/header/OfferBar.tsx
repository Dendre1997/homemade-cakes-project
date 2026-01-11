"use client";

import { useEffect, useState } from "react";
import { Discount } from "@/types";
import { Tag } from "lucide-react";

const OfferBar = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/discounts/active");
        if (res.ok) {
          const discounts: Discount[] = await res.json();

          if (discounts.length > 0) {
            const discountMsgs = discounts.map((d) => {
              const valueText =
                d.type === "percentage" ? `${d.value}% OFF` : `$${d.value} OFF`;
              const codeText =
                d.trigger === "code"
                  ? `Use Code: ${d.code}`
                  : "Applied Automatically";
              return `${d.name}: ${valueText} (${codeText})`;
            });
            setMessages([
              ...discountMsgs,
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch discounts for OfferBar", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscounts();
  }, []);

  if (!isLoading && messages.length === 0) {
    return null;
  }

  if (isLoading || messages.length === 1) {
    return (
      <div className="bg-primary text-white font-body text-small h-10 flex items-center justify-center">
        <div className="mx-auto max-w-7xl px-lg text-center">
          <span>{messages[0]}</span>
        </div>
      </div>
    );
  }

  const marqueeContent = [...messages, ...messages, ...messages, ...messages];

  return (
    <div className="bg-primary text-white font-body text-small overflow-hidden relative h-10 flex items-center z-50">
      {/* Gradients to fade text at edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-primary to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-primary to-transparent z-10" />

      {/* The Marquee Track */}
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {marqueeContent.map((msg, i) => (
          <div key={i} className="flex items-center mx-8">
            <Tag className="w-3 h-3 mr-2 opacity-70" />
            <span className="font-medium tracking-wide">{msg}</span>
            {/* Separator dot */}
            <span className="ml-8 text-white/40">•</span>
          </div>
        ))}
      </div>

      {/* Inline styles for the custom animation */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            /* Move exactly 25% (the length of one full set of messages) */
            transform: translateX(-25%);
          }
        }
        .animate-marquee {
          /* Duration matches the speed of moving one set. Adjust 30s to make it faster/slower */
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default OfferBar;
