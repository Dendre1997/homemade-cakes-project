"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { Input } from "@/components/ui/Input";
import { Search, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductPickerProps {
  availableProducts: ProductWithCategory[];
  selectedIds: string[];
  onChange: (newSelectedIds: string[]) => void;
  themeColor: string;
}

export const ProductPicker = ({
  availableProducts,
  selectedIds,
  onChange,
  themeColor,
}: ProductPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return availableProducts;
    const lowerQuery = searchQuery.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.category.name.toLowerCase().includes(lowerQuery)
    );
  }, [availableProducts, searchQuery]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
        <Input
          placeholder="Search cakes to add..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-small text-primary/60">
        {selectedIds.length} products have been added
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-sm max-h-[400px] overflow-y-auto custom-scrollbar p-1">
        {filteredProducts.map((product) => {
          const isSelected = selectedIds.includes(product._id.toString());

          return (
            <ProductPickerCard 
               key={product._id.toString()}
               product={product}
               isSelected={isSelected}
               themeColor={themeColor}
               onToggle={() => toggleSelection(product._id.toString())}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ProductPickerCardProps {
    product: ProductWithCategory;
    isSelected: boolean;
    themeColor: string;
    onToggle: () => void;
}

function ProductPickerCard({ product, isSelected, themeColor, onToggle }: ProductPickerCardProps) {
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    return (
        <div
            onClick={onToggle}
            className={cn(
            "group relative cursor-pointer rounded-medium overflow-hidden border-2 transition-all duration-200",
            isSelected
                ? "border-current shadow-md scale-[1.02]"
                : "border-transparent hover:border-border bg-neutral-50"
            )}
            style={isSelected ? { borderColor: themeColor } : {}}
        >
            <div className="relative aspect-square w-full bg-primary/5">
                {/* SKELETON PLACEHOLDER */}
                {!isImageLoaded && (
                    <div className="absolute inset-0 animate-pulse bg-primary/10" />
                )}
                <Image
                    src={product.imageUrls?.[0] || "/placeholder.png"}
                    alt={product.name}
                    fill
                    className={cn(
                        "object-cover transition-all duration-300",
                        !isImageLoaded ? "opacity-0 scale-95" : "opacity-100 scale-100",
                        !isSelected && "opacity-70 group-hover:opacity-100"
                    )}
                    sizes="(max-width: 768px) 150px, 200px"
                    onLoad={() => setIsImageLoaded(true)}
                    // Fallback to loaded if the image errors out (e.g. placeholder missing) so we don't end up with a permanent blank box
                    onError={() => setIsImageLoaded(true)} 
                />

                {isSelected && (
                    <div
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm transition-transform animate-in zoom-in duration-200"
                    style={{ color: themeColor }}
                    >
                    <CheckCircle className="h-5 w-5 fill-current" />
                    </div>
                )}
            </div>

            <div className="p-xs text-center border-t border-primary/5">
                <p className="text-xs font-bold text-primary truncate">
                    {product.name}
                </p>
                <p className="text-[10px] text-primary/60 truncate">
                    {product?.category?.name || "Uncategorized"}
                </p>
            </div>
        </div>
    );
}
