"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MultiImageUpload } from "@/components/custom-order/MultiImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import FlavorSelector from "@/components/ui/FlavorSelector";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Flavor } from "@/types";

export default function StepDesign() {
  const { register, control, formState: { errors } } = useFormContext();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("flavor");

  useEffect(() => {
    async function fetchData() {
      try {
        const [flavorsRes, categoriesRes] = await Promise.all([
          fetch("/api/flavors"),
          fetch("/api/categories")
        ]);
        if (flavorsRes.ok && categoriesRes.ok) {
          const allFlavors: Flavor[] = await flavorsRes.json();
          const allCategories = await categoriesRes.json();

          const cakesCat = allCategories.find(
            (c: any) => c.slug === "cakes" || c.name.toLowerCase().includes("cake")
          );

          let filteredFlavors = allFlavors;
          if (cakesCat) {
            filteredFlavors = allFlavors.filter(
              (f) => f.categoryIds?.includes(cakesCat._id)
            );
          }

          setFlavors(filteredFlavors);
        }
      } catch (error) {
        console.error("Failed to fetch flavors or categories", error);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Design Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          Design Idea & Description
        </Label>
        <p className="text-sm text-gray-500 mb-2">
            Describe the theme, colors, and overall look you are going for.
        </p>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="e.g., A vintage heart-shaped cake with pink piping and 'Happy Birthday' written in cursive..."
          className="min-h-[120px]"
        />
        {errors.description && (
          <p className="text-error text-sm">{errors.description.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flavor Preferences */}
          <div className="space-y-3">
             <Controller
              control={control}
              name="flavorPreferences"
              render={({ field }) => (
                <CollapsibleSection
                  title="Flavor Preferences"
                  isOpen={activeAccordion === "flavor"}
                  onToggle={() => setActiveAccordion((prev) => (prev === "flavor" ? null : "flavor"))}
                >
                  <FlavorSelector
                    mode="single"
                    flavors={flavors}
                    selectedId={field.value || null}
                    onSelectId={field.onChange}
                    hidePrice={true}
                  />
                </CollapsibleSection>
              )}
            />
            {errors.flavorPreferences && (
              <p className="text-error text-sm">{errors.flavorPreferences.message as string}</p>
            )}
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Controller
              control={control}
              name="budgetRange"
              render={({ field }) => (
                <CollapsibleSection
                  title="Approximate Budget"
                  isOpen={activeAccordion === "budget"}
                  onToggle={() => setActiveAccordion((prev) => (prev === "budget" ? null : "budget"))}
                >
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {["$50 - $100", "$100 - $200", "$200 - $300", "$300+"].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => field.onChange(range)}
                        className={`flex items-center justify-center rounded-medium p-3 transition-colors text-sm font-medium border ${
                          field.value === range
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-700 border-border hover:bg-subtleBackground"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            />
            {errors.budgetRange && (
              <p className="text-error text-sm">{errors.budgetRange.message as string}</p>
            )}
          </div>
      </div>

      {/* Reference Images */}
      <div className="space-y-2 pt-2 border-t text-left">
         <Label className="text-base font-semibold block mb-2">Reference Images (Optional)</Label>
         <Controller
            control={control}
            name="referenceImageUrls"
            render={({ field }) => (
                <MultiImageUpload 
                    value={field.value}
                    onChange={field.onChange}
                    maxImages={3}
                />
            )}
         />
         {errors.referenceImageUrls && (
            <p className="text-error text-sm">{errors.referenceImageUrls.message as string}</p>
         )}
      </div>
    </div>
  );
}
