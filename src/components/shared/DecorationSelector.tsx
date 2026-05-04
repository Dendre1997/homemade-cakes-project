"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Decoration, SelectedDecoration } from "@/types";

interface DecorationSelectorProps {
  categoryId?: string;
  selectedDecorations: SelectedDecoration[];
  onChange: (newDecorations: SelectedDecoration[]) => void;
}

export function DecorationSelector({
  categoryId,
  selectedDecorations,
  onChange,
}: DecorationSelectorProps) {
  const [allDecorations, setAllDecorations] = useState<Decoration[]>([]);
  const [activeDecorationId, setActiveDecorationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDecorations() {
      setIsLoading(true);
      try {
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
    return (
      <div className="animate-pulse">
        <h3 className="font-heading text-xl text-primary mb-2">
          Add Decorations
        </h3>
        <p className="text-sm text-primary/60 mb-4">
          Loading available decorations...
        </p>
        <div className="flex gap-4 overflow-x-auto pb-4">
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
        </div>
      </div>
    );
  }

  if (availableDecorations.length === 0) {
    return null; // Return null if no active decorations for this category
  }

  return (
    <div className="animate-in fade-in duration-500">
      <h3 className="font-heading text-xl text-primary mb-2">
        Add Decorations
      </h3>
      <p className="text-sm text-primary/60 mb-4">
        Select any additional decorations you'd like to add to your order.
      </p>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
        {availableDecorations.map((deco) => {
          const isSelected = selectedDecorations.some((d: any) => d.decorationId === deco._id);
          const isActive = activeDecorationId === deco._id;
          
          return (
            <button
              key={deco._id}
              type="button"
              onClick={() => setActiveDecorationId(isActive ? null : deco._id)}
              className={`relative w-32 h-32 md:w-40 md:h-40 shrink-0 snap-center rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                isActive
                  ? "ring-4 ring-accent scale-95"
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
                  <span className="font-heading text-sm text-primary/70">{deco.name}</span>
                </div>
              )}
              
              {isSelected && !isActive && (
                <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1 shadow-md">
                  <Check className="w-4 h-4" />
                </div>
              )}
              
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-between items-end">
                <span className="text-white text-sm font-bold truncate pr-2">{deco.name}</span>
                {isActive ? <ChevronUp className="w-4 h-4 text-white shrink-0" /> : <ChevronDown className="w-4 h-4 text-white shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {activeDecorationId && (
        <div className="mt-2 bg-subtleBackground p-4 md:p-6 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
          {(() => {
            const activeDeco = availableDecorations.find(d => d._id === activeDecorationId);
            if (!activeDeco) return null;
            
            return (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-heading font-bold text-lg text-primary">{activeDeco.name} Options</h4>
                  {selectedDecorations.some((d: any) => d.decorationId === activeDeco._id) && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                      1 option selected
                    </span>
                  )}
                </div>
                
                {activeDeco.description && (
                  <p className="text-sm text-primary/70 mb-4">{activeDeco.description}</p>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeDeco.variants.map((variant, idx) => {
                    const isSelected = selectedDecorations.some(
                      (d: any) => d.decorationId === activeDeco._id && d.variantName === variant.name
                    );
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleVariant(activeDeco, variant)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? "bg-accent/5 border-accent ring-1 ring-accent" 
                            : "bg-white border-border hover:border-primary/30"
                        }`}
                      >
                        {(variant.imageUrl || activeDeco.imageUrl) && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-subtleBackground">
                            <Image 
                              src={variant.imageUrl || activeDeco.imageUrl!} 
                              alt={variant.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-primary truncate">{variant.name}</p>
                          <p className="text-xs text-primary/70">${variant.price.toFixed(2)}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-accent border-accent text-white" : "border-primary/30"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
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
