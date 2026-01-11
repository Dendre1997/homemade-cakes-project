"use client";

import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
import { ProductWithCategory } from "@/types";
import { cn } from "@/lib/utils";

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center overflow-y-auto py-8 px-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <Dialog.Content
            className={cn(
              "relative z-50 w-full max-w-lg",
              "bg-card-background border border-border shadow-lg",
              "rounded-large flex flex-col overflow-hidden",
              "outline-none duration-200",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-md border-b border-border bg-subtleBackground/50">
              <Dialog.Title className="font-heading text-h3 text-primary truncate pr-4">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-full hover:bg-subtleBackground transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isSaving}
                >
                  <X className="h-5 w-5 text-primary/60" />
                </button>
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-md p-md">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={isSaving}
                />
              </div>

              <div className="flex-grow overflow-y-auto max-h-[50vh] min-h-[200px] border border-border rounded-medium custom-scrollbar bg-background">
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
                            "flex items-center gap-md p-sm rounded-medium cursor-pointer transition-all border select-none",
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
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>

                          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-small overflow-hidden border border-border shrink-0">
                            <Image
                              src={product.imageUrls[0] || "/placeholder.png"}
                              alt={product.name}
                              fill
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
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={isSaving || selectedIds.length === 0}
                  className="flex-1 sm:flex-none min-w-[100px]"
                >
                  {isSaving ? 'Adding...' : "Add Selected"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
