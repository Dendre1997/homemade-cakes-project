"use client";

import { useState } from "react";
import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { Discount } from "@/types";

interface ProductFeedProps {
  initialProducts: ProductWithCategory[];
  initialTotalCount: number;
  gridClassName?: string;
  validDiscounts?: Discount[];
  categoryId?: string;
  collectionId?: string;
  seasonalId?: string;
}

const PRODUCTS_PER_PAGE = 8;

export default function ProductFeed({
  initialProducts,
  initialTotalCount,
  gridClassName,
  validDiscounts,
  categoryId,
  collectionId,
  seasonalId
}: ProductFeedProps) {
  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialProducts.length < initialTotalCount
  );

  const loadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: PRODUCTS_PER_PAGE.toString(),
      });

      if (categoryId) params.append("categoryId", categoryId);
      if (collectionId) params.append("collectionId", collectionId);
      if (seasonalId) params.append("seasonalEventId", seasonalId);

      const res = await fetch(`/api/products?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch");

      const { products: newProducts, totalCount } = await res.json();

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p._id.toString()));
        const uniqueNewProducts = newProducts.filter(
          (p: ProductWithCategory) => !existingIds.has(p._id.toString())
        );
        const nextProducts = [...prev, ...uniqueNewProducts];
        setHasMore(nextProducts.length < totalCount);
        return nextProducts;
      });
      
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr",
          gridClassName
        )}
      >
        {products.map((product) => (
          <ProductCard 
            key={product._id.toString()} 
            product={product} 
            validDiscounts={validDiscounts}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-20 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="min-w-[200px]"
          >
            {isLoadingMore ? (
              <>
                <span className="mr-2">
                  {/* <LoadingSpinner /> */}
                Loading...
                </span>{" "}
              </>
            ) : (
              "View More Cakes"
            )}
          </Button>
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="mt-10 text-center text-primary/60 font-body animate-in fade-in slide-in-from-bottom-2">
          You've viewed all our sweet creations!
        </p>
      )}
    </>
  );
}
