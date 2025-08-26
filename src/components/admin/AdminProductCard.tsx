import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";

interface AdminProductCardProps {
  product: ProductWithCategory;
  onDelete: (id: string) => void;
}

const AdminProductCard = ({ product, onDelete }: AdminProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const otherImagesCount = product.imageUrls.length - 1

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-lg md:flex-row">
      {/* --- Left Side: Image --- */}
      <div className="relative w-full p-4 md:w-2/5">
        {/* Decorative Gradient Background */}
        <div className="absolute inset-0 z-0 m-auto h-5/6 w-5/6 rounded-full bg-gradient-to-br from-blue-50 via-rose-50 to-amber-50 blur-lg"></div>

        {/* Product Image */}
        <div className="relative aspect-square w-full">
          <Image
            src={firstImage}
            alt={product.name}
            fill
            className="object-contain drop-shadow-lg"
          />
          {otherImagesCount > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-gray-900 bg-opacity-80 px-2.5 py-1.5 text-xs font-semibold text-white">
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

      {/* --- Right Side: Content & Actions --- */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase text-gray-500">
            {product.category.name}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              product.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {product.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <h3 className="mt-2 text-2xl font-bold text-gray-900">
          {product.name}
        </h3>

        <p className="mt-2 text-xl font-bold text-gray-800">
          ${product.structureBasePrice}
        </p>

        {/* Spacer to push actions to the bottom */}
        <div className="flex-grow" />

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-end gap-4 border-t pt-4">
          <Link
            href={`/admin/products/${product._id.toString()}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            View
          </Link>
          <Link
            href={`/admin/products/${product._id.toString()}/edit`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(product._id.toString())}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProductCard;
