"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory, Discount } from "@/types";
import { Button } from "../ui/Button";
import { calculateProductPrice } from "@/lib/discountUtils";

interface ProductCardProps {
  product: ProductWithCategory;
  validDiscounts?: Discount[];
}

const ProductCard = ({ product, validDiscounts = [] }: ProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const flavorCount = product.availableFlavors?.length || 0;

  const { finalPrice, originalPrice, hasDiscount, discountBadgeText } = useMemo(
    () => calculateProductPrice(product, validDiscounts),
    [product, validDiscounts]
  );

  return (
    <Link
      href={`/products/${product.slug || product._id.toString()}`}
      className="group block h-full pt-md"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white transition-all duration-300 hover:-translate-y-1 border border-gray-100 transform-gpu">
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={firstImage}
            alt={product.name}
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-text-primary shadow-sm backdrop-blur-md">
            {product.category.name}
          </div>

          {hasDiscount && (
            <div className="absolute top-3 right-3 rounded-md bg-error px-2.5 py-1 text-xs font-bold text-white shadow-sm animate-in fade-in zoom-in duration-300">
              {discountBadgeText}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-heading text-xl font-bold text-text-primary mb-2 line-clamp-1 group-hover:text-accent transition-colors">
            {product.name}
          </h3>

          <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary font-medium">
            {flavorCount > 0 && (
              <>
                <span>{flavorCount} Flavors</span>
                <span className="text-gray-300">•</span>
              </>
            )}
            {/* <span>{diameterCount} Sizes</span> */}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex flex-col">
              {hasDiscount ? (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider mb-0.5">
                    Limited Deal
                  </span>
                  <div className="flex items-baseline gap-2">
                    {/* Final Price (Big & Red/Accent) */}
                    <span className="font-heading text-xl font-bold text-error">
                      ${finalPrice.toFixed(2)}
                    </span>
                    {/* Old Price (Small & Crossed Out) */}
                    <span className="text-sm text-gray-400 line-through decoration-gray-400">
                      ${originalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold mb-0.5">
                    From
                  </span>
                  <span className="font-heading text-xl font-bold text-accent">
                    ${originalPrice.toFixed(2)}
                  </span>
                </>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="px-5 font-semibold group-hover:bg-accent group-hover:text-white transition-all duration-300"
              aria-label={`Customize ${product.name}`}
            >
              Order
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
