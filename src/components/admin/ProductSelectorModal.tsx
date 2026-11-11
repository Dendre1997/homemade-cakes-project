"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { cn } from "@/lib/utils";
import { catalogFieldClass } from "@/components/admin/catalog/CatalogFormChrome";

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  availableProducts: ProductWithCategory[];
  isSaving: boolean;
  title: string;
}

export const ProductSelectorModal = ({
  isOpen,
  onClose,
  onConfirm,
  availableProducts,
  isSaving,
  title,
}: ProductSelectorModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
  };

  const handleClose = () => {
    if (!isSaving) {
      setSelectedIds([]);
      setSearchQuery("");
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 px-4 py-8 shadow-none hover:shadow-none">
          <Dialog.Content
            className={cn(
              "relative z-50 flex w-full max-w-lg flex-col overflow-hidden overscroll-contain",
              "rounded-2xl border border-primary/15 bg-background/95 shadow-none backdrop-blur-md hover:border-primary/15 hover:bg-background/95 hover:shadow-none",
              "outline-none"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-primary/10 p-4">
              <Dialog.Title className="min-w-0 truncate pr-4 font-heading text-lg font-semibold tracking-tight text-primary">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary transition-colors hover:bg-background/60"
                  aria-label="Close"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-md p-md">
              <div className="relative shrink-0">
                <label htmlFor="collection-product-search" className="sr-only">
                  Search products
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 text-primary/50" aria-hidden />
                <Input
                  id="collection-product-search"
                  placeholder="Search products…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(catalogFieldClass, "pl-9")}
                  disabled={isSaving}
                />
              </div>

              <div className="custom-scrollbar max-h-[50vh] min-h-[200px] flex-grow overflow-y-auto overscroll-contain rounded-xl border border-primary/10 bg-background/40">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-xl text-primary/60 min-h-[150px]">
                    <p>No products found.</p>
                  </div>
                ) : (
                  <div className="p-sm space-y-xs">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedIds.includes(
                        product._id.toString()
                      );
                      return (
                        <div
                          key={product._id.toString()}
                          onClick={() =>
                            !isSaving && toggleSelection(product._id.toString())
                          }
                          className={cn(
                            "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl border p-3 transition-colors",
                            isSelected
                              ? "bg-accent/10 border-accent"
                              : "bg-card-background border-transparent hover:bg-subtleBackground",
                            isSaving && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-sm border flex items-center justify-center transition-colors shrink-0",
                              isSelected
                                ? "bg-accent border-accent text-white"
                                : "border-primary/30 bg-white"
                            )}
                          >
                            {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                          </div>

                          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-small overflow-hidden border border-border shrink-0">
                            <Image
                              src={product.imageUrls[0] || "/placeholder.png"}
                              alt={product.name}
                              fill
                              quality={90}
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>

                          <div className="flex-grow min-w-0">
                            <p className="font-body font-bold text-primary text-small truncate">
                              {product.name}
                            </p>
                            <p className="font-body text-xs text-primary/70 truncate">
                              {product.category.name}
                            </p>
                          </div>

                          <p className="font-body font-semibold text-primary text-small shrink-0">
                            ${product.structureBasePrice.toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-md border-t border-border bg-subtleBackground/30 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
              <p className="text-small text-primary/70">
                {selectedIds.length} product
                {selectedIds.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-md w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="h-11 flex-1 rounded-xl shadow-none sm:h-10 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={isSaving || selectedIds.length === 0}
                  className="h-11 min-w-[100px] flex-1 rounded-xl shadow-none sm:h-10 sm:flex-none"
                >
                  {isSaving ? "Adding…" : "Add Selected"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
