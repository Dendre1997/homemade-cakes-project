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

  return (
    <div className="flex flex-col rounded-lg bg-white shadow-lg overflow-hidden">
      <div className="block aspect-square relative">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            {product.category.name}
          </span>
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              product.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {product.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
        <p className="mt-2 font-bold text-gray-800">
          ${product.structureBasePrice}
        </p>

        <div className="mt-auto pt-4 flex justify-end items-center border-t mt-4 gap-4">
          <Link
            href={`/admin/products/${product._id.toString()}/edit`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (
                window.confirm("Are you sure you want to delete this product?")
              ) {
                onDelete(product._id.toString());
              }
            }}
            className="text-sm font-medium text-red-600 hover:text-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProductCard;
