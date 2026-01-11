"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cartStore";
import { Button } from "@/components/ui/Button";
import { X, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTO_CLOSE_TIME = 10000;

export const MiniCart = ({ isOpen, onClose }: MiniCartProps) => {
  const { lastItemAdded } = useCartStore();
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(AUTO_CLOSE_TIME);

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 100) {
            clearInterval(interval);
            setTimeout(onClose, 0);
            return 0;
          }
          return prev - 100;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isOpen, onClose]);

  const progressWidth = (timeLeft / AUTO_CLOSE_TIME) * 100;

  return (
    <div
      className={cn(
        "absolute top-full right-lg z-50 w-80 max-w-sm rounded-medium border border-border bg-card-background shadow-lg transition-all duration-300 ease-in-out overflow-hidden",
        isOpen
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-0 pointer-events-none"
      )}
    >

      <div
        className="absolute top-0 left-0 h-1 bg-accent"
        style={{ width: `${progressWidth}%`, transition: "width 0.1s linear" }}
      />

      <div className="p-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-sm">
          <h4 className="font-heading text-h3 text-primary">Added to Cart</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-primary/60 transition-colors hover:bg-subtleBackground hover:text-primary"
            aria-label="Close cart popover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {lastItemAdded ? (
          <div className="mt-md">
            <div className="flex items-start gap-md">
              <Image
                src={lastItemAdded.imageUrl}
                alt={lastItemAdded.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-medium border border-border object-cover"
              />
              <div className="flex-1">
                <p className="font-body font-bold text-primary">
                  {lastItemAdded.name}
                </p>
                <p className="font-body text-small text-primary/80">
                  {lastItemAdded.flavor}
                </p>
                <p className="font-body text-small text-primary/80">
                  Qty: {lastItemAdded.quantity}
                </p>
              </div>
              <div className="text-right">
                {lastItemAdded.originalPrice ? (
                  <>
                    <p className="text-xs text-gray-400 line-through">
                      ${(lastItemAdded.originalPrice * lastItemAdded.quantity).toFixed(2)}
                    </p>
                    <p className="font-body font-semibold text-error">
                      ${(lastItemAdded.price * lastItemAdded.quantity).toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="font-body font-semibold text-primary">
                    ${(lastItemAdded.price * lastItemAdded.quantity).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-md flex gap-sm">
              <Link href="/cart" onClick={onClose} className="flex-1">
                <Button variant="secondary" className="w-full">
                  Go to Cart
                </Button>
              </Link>
              <Link href="/checkout" onClick={onClose} className="flex-1">
                <Button variant="primary" className="w-full">
                  Checkout
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-lg text-center">
            <ShoppingBag className="h-12 w-12 text-primary/30" />
            <p className="mt-md font-heading text-body text-primary">
              Your cart is empty
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
