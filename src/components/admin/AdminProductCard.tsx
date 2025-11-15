import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { Button } from "../ui/Button";

interface AdminProductCardProps {
  product: ProductWithCategory;
  onDelete: (id: string) => void;
}

const AdminProductCard = ({ product, onDelete }: AdminProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const otherImagesCount = product.imageUrls.length - 1;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-medium border border-border bg-card-background shadow-md transition-shadow duration-300 hover:shadow-lg">
      <div className="relative aspect-square w-full overflow-hidden rounded-t-medium">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className="object-cover"
        />
        {otherImagesCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-small bg-primary/80 px-2 py-1 text-small font-semibold text-text-on-primary">
            <span>+{otherImagesCount}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-md">
        <div className="flex items-start justify-between">
          <span className="font-body text-small uppercase text-text-main/80">
            {product.category.name}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-small font-semibold ${
              product.isActive
                ? "bg-success/20 text-success"
                : "bg-error/20 text-error"
            }`}
          >
            {product.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <h3 className="mt-sm font-heading text-h3 text-primary">
          {product.name}
        </h3>
        <p className="mt-sm font-body text-body font-bold text-primary">
          ${product.structureBasePrice.toFixed(2)}
        </p>
        <div className="mt-auto flex items-center justify-end gap-sm border-t border-border pt-md">
          <Link href={`/admin/products/${product._id.toString()}`}>
            <Button variant="primary" size="sm">
              View
            </Button>
          </Link>
          <Link href={`/admin/products/${product._id.toString()}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            onClick={() => onDelete(product._id.toString())}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminProductCard;
