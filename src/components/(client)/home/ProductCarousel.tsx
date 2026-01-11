"use client";

import { ProductWithCategory, Discount } from "@/types";
import { Carousel } from "@/components/ui/Carousel";
import { CarouselProductCard } from "@/components/ui/CarouselProductCard";
import { useRouter } from "next/navigation";

interface ProductCarouselProps {
  products: ProductWithCategory[];
  validDiscounts?: Discount[];
}

const ProductCarousel = ({ products, validDiscounts }: ProductCarouselProps) => {
  const router = useRouter();

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <Carousel
      items={products}
      keyExtractor={(product) => product._id.toString()}
      renderItem={(product, isActive) => {
        if (!product) return null;
        return (
            <CarouselProductCard
            image={product.imageUrls?.[0] || "/placeholder.png"}
            name={product.name}
            price={product.structureBasePrice}
            onOrder={() => router.push(`/products/${product._id}`)}
            className="h-full"
            />
        );
      }}
    />
  );
};

export default ProductCarousel;
