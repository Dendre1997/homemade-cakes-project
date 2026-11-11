import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { Button, buttonVariants } from "../ui/Button";
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
    <div className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/15 bg-background/20 shadow-none backdrop-blur-md hover:shadow-none">
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          quality={90}
          className={cn(
            "object-cover transition-[filter,opacity] duration-300",
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
            "absolute right-2 top-2 flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white shadow-none backdrop-blur-md",
            product.isActive
              ? "bg-success/90 text-white hover:bg-success"
              : "bg-neutral-500/90 text-white hover:bg-neutral-600"
          )}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : product.isActive ? (
            <>
              <Eye className="h-4 w-4 shrink-0" aria-hidden /> Active
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> Inactive
            </>
          )}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-md">
        <div className="flex min-w-0 items-start justify-between">
          <span className="max-w-full truncate font-body text-small uppercase text-text-main/80">
            {product.category.name}
          </span>
        </div>

        <h3
          className="mt-sm min-w-0 truncate font-heading text-h3 text-primary"
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-error transition-colors hover:bg-error/5 hover:text-error/80 sm:h-10"
            >
              <FolderMinus className="h-4 w-4 shrink-0" aria-hidden />
              Remove from Collection
            </button>
          </div>
        )}

        {onRemoveFromSeasonal && (
          <div className="mt-md pt-sm border-t border-border border-dashed">
            <button
              onClick={() => onRemoveFromSeasonal(product._id.toString())}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-error transition-colors hover:bg-error/5 hover:text-error/80 sm:h-10"
            >
              <FolderMinus className="h-4 w-4 shrink-0" aria-hidden />
              Remove from Seasonal
            </button>
          </div>
        )}

        <div className="mt-auto flex items-center justify-end gap-sm border-t border-border pt-md">
          <Link
            href={`/bakery-manufacturing-orders/products/${product._id.toString()}`}
            className={cn(buttonVariants({ variant: "primary" }), "h-11 rounded-xl px-3 text-sm shadow-none hover:shadow-none sm:h-10")}
          >
            View
          </Link>
          <Link
            href={`/bakery-manufacturing-orders/products/${product._id.toString()}/edit`}
            className={cn(buttonVariants({ variant: "secondary" }), "h-11 rounded-xl px-3 text-sm text-primary shadow-none hover:shadow-none sm:h-10")}
          >
            Edit
          </Link>
          <Button
            onClick={() => onDelete(product._id.toString())}
            variant="danger"
            className="h-11 rounded-xl px-3 text-sm text-white shadow-none hover:shadow-none sm:h-10"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminProductCard;
