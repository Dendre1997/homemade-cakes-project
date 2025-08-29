import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";

interface ProductCardProps {
  product: ProductWithCategory;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const otherImagesCount = product.imageUrls.length - 1;

  return (
    <Link
      href={`/products/${product._id.toString()}`}
      className="group block w-full"
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-card-background shadow-lg transition-all duration-300 hover:shadow-2xl md:flex-row">
        {/* Left Side: Image Container */}
        <div className="relative w-full p-4 md:w-2/5">
          {/* Decorative Gradient Background Shape */}
          <div className="absolute inset-0 z-0 m-auto h-5/6 w-5/6 rounded-full "></div>

          {/* The Product Image */}
          <div className="relative aspect-square w-full rounded-large">
            <div className="relative aspect-square w-full rounded-large overflow-hidden">
              <Image
                src={firstImage}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            {otherImagesCount > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-large bg-gray-900 bg-opacity-80 px-2.5 py-1.5 text-xs font-semibold text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 0v7.5a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>+{otherImagesCount} more</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Text Content */}
        <div className="flex flex-1 flex-col justify-center p-6 text-center md:p-8 md:text-left">
          <p className="font-semibold text-gray-500">{product.category.name}</p>
          <h3 className="mt-2 text-2xl font-bold uppercase tracking-wide text-gray-800 md:text-3xl">
            {product.name}
          </h3>

          <p className="mt-3 text-sm text-gray-600 md:text-base">
            {/* Using a placeholder text similar to the image */}
            Discover our delicious, handcrafted cakes made with the finest
            ingredients.
          </p>

          <p className="mt-4 text-3xl font-extrabold text-gray-900">
            ${product.structureBasePrice}
          </p>

          {/* Buttons Area - visual only, since the card is the link */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <div className="rounded-large bg-yellow-400 px-5 py-2.5 font-bold text-gray-900 transition-colors group-hover:bg-yellow-500">
              Order Now
            </div>
            <div className="rounded-large bg-stone-700 px-5 py-2.5 font-bold text-white transition-colors group-hover:bg-stone-800">
              Learn More
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
