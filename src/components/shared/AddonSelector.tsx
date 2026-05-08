"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Addon, SelectedAddon } from "@/types";

interface AddonSelectorProps {
  categoryId?: string | string[];
  selectedAddons: SelectedAddon[];
  onChange: (newaddons: SelectedAddon[]) => void;
  availableAddons?: Addon[];
}

export function AddonSelector({
  categoryId,
  selectedAddons,
  onChange,
  availableAddons: initialAvailableAddons,
}: AddonSelectorProps) {
  const [allAddons, setAllAddons] = useState<Addon[]>(initialAvailableAddons || []);
  const [activeaddonId, setActiveaddonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialAvailableAddons);
  const variantScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected variant when a panel opens
  useEffect(() => {
    if (!activeaddonId || !variantScrollRef.current) return;
    const container = variantScrollRef.current;
    const selectedBtn = container.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selectedBtn) {
      setTimeout(() => {
        selectedBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 50);
    }
  }, [activeaddonId]);

  useEffect(() => {
    if (initialAvailableAddons) {
      setAllAddons(initialAvailableAddons);
      setIsLoading(false);
      return;
    }
    async function fetchAddons() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/addons");
        if (res.ok) {
          const data: Addon[] = await res.json();
          setAllAddons(data);
        }
      } catch (err) {
        console.error("Failed to fetch Addons", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAddons();
  }, [initialAvailableAddons]);

  const availableAddons = allAddons.filter((d) => {
    if (!d.isActive) return false;
    if (categoryId && d.categoryIds && d.categoryIds.length > 0) {
      if (Array.isArray(categoryId)) {
        return categoryId.some(c => d.categoryIds?.includes(c));
      }
      return d.categoryIds.includes(categoryId);
    }
    return true;
  });

  const handleToggleVariant = (deco: Addon, variant: any) => {
    const isAlreadySelected = selectedAddons.some(
      (d) => d.addonId === deco._id && (d.variantId ? d.variantId === variant._id : d.variantName === variant.name)
    );

    if (isAlreadySelected) {
      onChange(
        selectedAddons.filter(
          (d) => !(d.addonId === deco._id && (d.variantId ? d.variantId === variant._id : d.variantName === variant.name))
        )
      );
    } else {
      const filtered = selectedAddons.filter((d) => d.addonId !== deco._id);
      onChange([
        ...filtered,
        {
          addonId: deco._id,
          name: deco.name,
          variantId: variant._id,
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
          Add Addons
        </h3>
        <p className="text-sm text-primary/60 mb-4">
          Loading available Addons...
        </p>
        <div className="flex gap-4 overflow-x-auto pb-4">
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
            <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-subtleBackground rounded-2xl" />
        </div>
      </div>
    );
  }

  if (availableAddons.length === 0) {
    return null; // Return null if no active Addons for this category
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
        {availableAddons.map((deco) => {
          const isSelected = selectedAddons.some((d: any) => d.addonId === deco._id);
          const isActive = activeaddonId === deco._id;
          
          return (
            <button
              key={deco._id}
              type="button"
              onClick={() => setActiveaddonId(isActive ? null : deco._id)}
              className={`relative w-40 h-40 shrink-0 snap-center rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
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

      {activeaddonId && (
        <div className="mt-2 p-4 md:p-6 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
          {(() => {
            const activeDeco = availableAddons.find(d => d._id === activeaddonId);
            if (!activeDeco) return null;
            
            return (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-heading font-bold text-lg text-primary">{activeDeco.name} Options</h4>
                  {selectedAddons.some((d: any) => d.addonId === activeDeco._id) && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                      1 option selected
                    </span>
                  )}
                </div>
                
                {activeDeco.description && (
                  <p className="text-sm text-primary/70 mb-4">{activeDeco.description}</p>
                )}
                
                <div ref={variantScrollRef} className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
                  {activeDeco.variants.map((variant, idx) => {
                    const isSelected = selectedAddons.some(
                      (d: any) => d.addonId === activeDeco._id && (d.variantId ? d.variantId === variant._id : d.variantName === variant.name)
                    );
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        data-selected={isSelected ? "true" : undefined}
                        onClick={() => handleToggleVariant(activeDeco, variant)}
                        className={`flex items-center gap-4 p-4 w-[280px] sm:w-[320px] shrink-0 snap-center rounded-2xl border text-left transition-all duration-300 ${
                          isSelected 
                            ? "bg-accent/5 border-accent ring-2 ring-accent scale-[0.98]" 
                            : "bg-white border-border hover:border-primary/30"
                        }`}
                      >
                        {(variant.imageUrl || activeDeco.imageUrl) && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative bg-subtleBackground shadow-sm">
                            <Image 
                              src={variant.imageUrl || activeDeco.imageUrl!} 
                              alt={variant.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base text-primary line-clamp-2 leading-tight mb-1">{variant.name}</p>
                          <p className="text-sm font-medium text-accent">+${variant.price.toFixed(2)}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-accent border-accent text-white" : "border-primary/30"
                        }`}>
                          {isSelected && <Check className="w-4 h-4" />}
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
