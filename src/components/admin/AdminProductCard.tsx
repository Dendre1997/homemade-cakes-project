import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { Button } from "../ui/Button";
import { Eye, EyeOff, FolderMinus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminProductCardProps {
  product: ProductWithCategory;
  onDelete: (id: string) => void;
  // New props
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
  onRemoveFromCollection?: (id: string) => void;
  onRemoveFromSeasonal?: (id: string) => void;
}

const AdminProductCard = ({
  product,
  onDelete,
  onToggleActive,
  onRemoveFromCollection,
  onRemoveFromSeasonal,
}: AdminProductCardProps) => {
  const firstImage = product.imageUrls[0] || "/placeholder.png";
  const otherImagesCount = product.imageUrls.length - 1;
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsToggling(true);
    await onToggleActive(product._id.toString(), product.isActive);
    setIsToggling(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-medium border border-border bg-card-background shadow-md transition-shadow duration-300 hover:shadow-lg group relative">
      <div className="relative aspect-square w-full overflow-hidden rounded-t-medium">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-all duration-300",
            !product.isActive && "grayscale opacity-70"
          )}
        />
        {otherImagesCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-small bg-primary/80 px-2 py-1 text-small font-semibold text-text-on-primary">
            <span>+{otherImagesCount}</span>
          </div>
        )}

        <button
          onClick={handleToggleClick}
          disabled={isToggling}
          title={product.isActive ? "Click to Deactivate" : "Click to Activate"}
          className={cn(
            "absolute top-2 right-2 rounded-full px-3 py-1 text-small font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 backdrop-blur-md",
            product.isActive
              ? "bg-success/90 text-white hover:bg-success"
              : "bg-neutral-500/90 text-white hover:bg-neutral-600"
          )}
        >
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : product.isActive ? (
            <>
              <Eye className="h-3.5 w-3.5" /> Active
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Inactive
            </>
          )}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-md">
        <div className="flex items-start justify-between">
          <span className="font-body text-small uppercase text-text-main/80 truncate max-w-[70%]">
            {product.category.name}
          </span>
        </div>

        <h3
          className="mt-sm font-heading text-h3 text-primary truncate"
          title={product.name}
        >
          {product.name}
        </h3>

        <p className="mt-sm font-body text-body font-bold text-primary">
          ${product.structureBasePrice.toFixed(2)}
        </p>
        {onRemoveFromCollection && (
          <div className="mt-md pt-sm border-t border-border border-dashed">
            <button
              onClick={() => onRemoveFromCollection(product._id.toString())}
              className="w-full flex items-center justify-center gap-2 text-xs text-error hover:text-error/80 hover:bg-error/5 py-1.5 rounded-medium transition-colors"
            >
              <FolderMinus className="w-3.5 h-3.5" />
              Remove from Collection
            </button>
          </div>
        )}

        {onRemoveFromSeasonal && (
          <div className="mt-md pt-sm border-t border-border border-dashed">
            <button
              onClick={() => onRemoveFromSeasonal(product._id.toString())}
              className="w-full flex items-center justify-center gap-2 text-xs text-error hover:text-error/80 hover:bg-error/5 py-1.5 rounded-medium transition-colors"
            >
              <FolderMinus className="w-3.5 h-3.5" />
              Remove from Seasonal
            </button>
          </div>
        )}

        <div className="mt-auto flex items-center justify-end gap-sm border-t border-border pt-md">
          <Link href={`/bakery-manufacturing-orders/products/${product._id.toString()}`}>
            <Button variant="primary" size="sm">
              View
            </Button>
          </Link>
          <Link href={`/bakery-manufacturing-orders/products/${product._id.toString()}/edit`}>
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
