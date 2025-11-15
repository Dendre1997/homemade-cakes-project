import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { Button } from "../ui/Button";

interface ProductCardProps {
  product: ProductWithCategory;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const otherImagesCount = product.imageUrls.length - 1;

  return (
    <Link
      href={`/products/${product._id.toString()}`}
      className="group block h-full pt-md"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-md ">
        <div className="relative aspect-[1/1] w-full overflow-hidden rounded-t-md">
          <Image
            src={firstImage}
            alt={product.name}
            fill
            priority
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="flex flex-1 flex-col pt-md">
          <h3 className="font-heading text-h3 text-text-primary">
            {product.name}
          </h3>
          <div className="mt-auto w-full pt-sm">
            <Button
              variant="secondary"
              className="w-full flex items-center "
              aria-label={`Order ${product.name}`}
            >
              <span className="font-body text-lg font-semibold text-text-primary">
                From ${product.structureBasePrice.toFixed(2)}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
