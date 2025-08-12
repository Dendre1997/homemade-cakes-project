import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";

interface ProductCardProps {
  product: ProductWithCategory;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";

  return (
    <Link href={`/products/${product._id.toString()}`} className="group block">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className="object-cover object-center transition-opacity duration-300 group-hover:opacity-75"
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {product.name}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{product.category.name}</p>
      <p className="mt-2 text-md font-bold text-gray-900">
        ${product.structureBasePrice}
      </p>
      {/* "Add to Cart" */}
    </Link>
  );
};

export default ProductCard;
