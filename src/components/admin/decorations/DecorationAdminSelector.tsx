"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Decoration, SelectedDecoration } from "@/types";

interface DecorationAdminSelectorProps {
  categoryId?: string;
  selectedDecorations: SelectedDecoration[];
  onChange: (newDecorations: SelectedDecoration[]) => void;
}

export function DecorationAdminSelector({
  categoryId,
  selectedDecorations,
  onChange,
}: DecorationAdminSelectorProps) {
  const [allDecorations, setAllDecorations] = useState<Decoration[]>([]);
  const [activeDecorationId, setActiveDecorationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDecorations() {
      try {
        // We use the admin route or public route. Assuming /api/decorations works based on the previous task.
        const res = await fetch("/api/decorations");
        if (res.ok) {
          const data: Decoration[] = await res.json();
          setAllDecorations(data);
        }
      } catch (err) {
        console.error("Failed to fetch decorations", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDecorations();
  }, []);

  const availableDecorations = allDecorations.filter((d) => {
    if (!d.isActive) return false;
    if (categoryId && d.categoryIds && d.categoryIds.length > 0) {
      return d.categoryIds.includes(categoryId);
    }
    return true;
  });

  const handleToggleVariant = (deco: Decoration, variant: any) => {
    const isAlreadySelected = selectedDecorations.some(
      (d) => d.decorationId === deco._id && d.variantName === variant.name
    );

    if (isAlreadySelected) {
      onChange(
        selectedDecorations.filter(
          (d) => !(d.decorationId === deco._id && d.variantName === variant.name)
        )
      );
    } else {
      const filtered = selectedDecorations.filter((d) => d.decorationId !== deco._id);
      onChange([
        ...filtered,
        {
          decorationId: deco._id,
          name: deco.name,
          variantName: variant.name,
          price: variant.price,
          imageUrl: variant.imageUrl || deco.imageUrl,
        },
      ]);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500 animate-pulse">Loading decorations...</p>;
  }

  if (availableDecorations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-border">
      <h3 className="font-bold text-sm text-primary mb-2">Decorations</h3>
      
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
        {availableDecorations.map((deco) => {
          const isSelected = selectedDecorations.some((d) => d.decorationId === deco._id);
          const isActive = activeDecorationId === deco._id;

          return (
            <button
              key={deco._id}
              type="button"
              onClick={() => setActiveDecorationId(isActive ? null : deco._id)}
              className={`relative w-24 h-24 shrink-0 snap-center rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
                isActive
                  ? "ring-2 ring-accent scale-95"
                  : "border border-border hover:brightness-110"
              }`}
            >
              {deco.imageUrl ? (
                <Image
                  src={deco.imageUrl}
                  alt={deco.name}
                  fill
                  className="object-cover opacity-90"
                />
              ) : (
                <div className="w-full h-full bg-subtleBackground flex items-center justify-center p-2 text-center">
                  <span className="font-heading text-xs text-primary/70">{deco.name}</span>
                </div>
              )}

              {isSelected && !isActive && (
                <div className="absolute top-1 right-1 bg-accent text-white rounded-full p-0.5 shadow-md">
                  <Check className="w-3 h-3" />
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex justify-between items-end">
                <span className="text-white text-[10px] font-bold truncate pr-1">{deco.name}</span>
                {isActive ? (
                  <ChevronUp className="w-3 h-3 text-white shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-white shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeDecorationId && (
        <div className="mt-2 bg-subtleBackground p-3 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
          {(() => {
            const activeDeco = availableDecorations.find((d) => d._id === activeDecorationId);
            if (!activeDeco) return null;

            return (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-primary">{activeDeco.name} Options</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeDeco.variants.map((variant, idx) => {
                    const isSelected = selectedDecorations.some(
                      (d) =>
                        d.decorationId === activeDeco._id && d.variantName === variant.name
                    );

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleVariant(activeDeco, variant)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-accent/5 border-accent ring-1 ring-accent"
                            : "bg-white border-border hover:border-primary/30"
                        }`}
                      >
                        {(variant.imageUrl || activeDeco.imageUrl) && (
                          <div className="w-8 h-8 rounded shrink-0 relative bg-subtleBackground overflow-hidden">
                            <Image
                              src={variant.imageUrl || activeDeco.imageUrl!}
                              alt={variant.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-primary truncate">
                            {variant.name}
                          </p>
                          <p className="text-[10px] text-primary/70">
                            +${variant.price.toFixed(2)}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-accent border-accent text-white"
                              : "border-primary/30"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
