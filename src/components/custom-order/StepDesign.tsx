"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MultiImageUpload } from "@/components/custom-order/MultiImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Flavor } from "@/types";

export default function StepDesign() {
  const { register, control, formState: { errors } } = useFormContext();
  const [flavors, setFlavors] = useState<Flavor[]>([]);

  useEffect(() => {
    async function fetchFlavors() {
      try {
        const res = await fetch("/api/flavors");
        if (res.ok) {
          const data = await res.json();
          setFlavors(data);
        }
      } catch (error) {
        console.error("Failed to fetch flavors", error);
      }
    }
    fetchFlavors();
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
          <div className="space-y-2">
            <Label htmlFor="flavorPreferences" className="text-base font-semibold">Flavor Preferences</Label>
             <Controller
              control={control}
              name="flavorPreferences"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="flavorPreferences" className="w-full">
                    <SelectValue placeholder="Select a flavor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {flavors.map((flavor) => (
                      <SelectItem key={flavor._id} value={flavor._id}>
                        {flavor.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other/Surprise Me">Other / Surprise Me</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.flavorPreferences && (
              <p className="text-error text-sm">{errors.flavorPreferences.message as string}</p>
            )}
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Label htmlFor="budgetRange" className="text-base font-semibold">Approximate Budget</Label>
            <Controller
              control={control}
              name="budgetRange"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="budgetRange" className="w-full">
                    <SelectValue placeholder="Select Range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$50 - $100">$50 - $100</SelectItem>
                    <SelectItem value="$100 - $200">$100 - $200</SelectItem>
                    <SelectItem value="$200 - $300">$200 - $300</SelectItem>
                    <SelectItem value="$300+">$300+</SelectItem>
                  </SelectContent>
                </Select>
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
