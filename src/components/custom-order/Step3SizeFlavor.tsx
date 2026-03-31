import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Loader2 } from "lucide-react";

import DiameterSelector, { DiameterOption } from "@/components/ui/DiameterSelector";
import FlavorSelector from "@/components/ui/FlavorSelector";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";

import { BoxIcon as BoxIconSix } from "@/components/icons/quantityIcons/BoxIconSix";
import { BoxIconTwelve } from "@/components/icons/quantityIcons/BoxIconTwelve";
import { BoxIconTwentyFour } from "@/components/icons/quantityIcons/BoxIconTwentyFour";

const getIllustrationForSize = (sizeValue: number) => {
  if (sizeValue <= 4) return FourInchBentoIcon;
  if (sizeValue === 5) return FiveInchBentoIcon;
  if (sizeValue === 6) return SixInchCakeIcon;
  if (sizeValue === 7) return SevenInchCakeIcon;
  if (sizeValue >= 8) return EightInchCakeIcon;
  return FourInchBentoIcon;
};

const BOX_SIZES = [
  { value: "6", label: "Box of 6", Icon: BoxIconSix },
  { value: "12", label: "Box of 12", Icon: BoxIconTwelve },
  { value: "24", label: "Box of 24", Icon: BoxIconTwentyFour },
];

export default function Step3SizeFlavor({ onNext }: { onNext: () => void }) {
  const { setValue, watch, formState: { errors } } = useFormContext<CustomOrderFormData>();
  const categoryName = watch("category");
  
  // What the final output to the database will be
  const currentSize = watch("details.size");
  const currentFlavor = watch("details.flavor");

  const [isLoading, setIsLoading] = useState(true);

  // Raw API Data
  const [categories, setCategories] = useState<any[]>([]);
  const [allDiameters, setAllDiameters] = useState<any[]>([]);
  const [allFlavors, setAllFlavors] = useState<any[]>([]);

  // INTELLIGENT INFERENCE
  const categoryStr = categoryName?.toLowerCase() || "";
  const isCombo = categoryStr.includes("combo") || categoryStr.includes("set");
  const isDiscrete = categoryStr.includes("cupcake") || categoryStr.includes("macaron");
  const isStandard = !isCombo && !isDiscrete;

  // --- LOCAL STATE FOR COMPLEX RUNDOWNS ---
  // If isStandard
  const [standardDiameterId, setStandardDiameterId] = useState<string | null>(null);
  const [standardFlavorId, setStandardFlavorId] = useState<string | null>(null);
  
  // If isDiscrete (Cupcakes)
  const [discreteQuantity, setDiscreteQuantity] = useState<string>("");
  const [discreteFlavorIds, setDiscreteFlavorIds] = useState<string[]>([]);

  // If isCombo (Sets)
  const [comboPieceQuantity, setComboPieceQuantity] = useState<string>("");
  const [comboTreatFlavorIds, setComboTreatFlavorIds] = useState<string[]>([]);
  const [comboCakeFlavorId, setComboCakeFlavorId] = useState<string | null>(null);


  useEffect(() => {
    async function fetchDBDocs() {
      setIsLoading(true);
      try {
        const [catRes, diamRes, flavRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/diameters"),
          fetch("/api/flavors")
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (diamRes.ok) setAllDiameters(await diamRes.json());
        if (flavRes.ok) setAllFlavors(await flavRes.json());
      } catch (e) {
        console.error("Failed to load options", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDBDocs();
  }, []);

  const activeCategoryId = useMemo(() => {
    if (!categoryName) return null;
    const cat = categories.find(c => {
       const displayName = c.name.endsWith('s') || c.name.endsWith('S') ? c.name.slice(0, -1) : c.name;
       return displayName === categoryName || c.name === categoryName;
    });
    return cat?._id || null;
  }, [categoryName, categories]);

  const filteredDiameters = useMemo(() => {
    if (!activeCategoryId) return [];
    return allDiameters.filter((d: any) => 
       Array.isArray(d.categoryIds) && d.categoryIds.includes(activeCategoryId)
    );
  }, [allDiameters, activeCategoryId]);

  const filteredFlavors = useMemo(() => {
    if (!activeCategoryId) return [];
    return allFlavors.filter((f: any) => 
       Array.isArray(f.categoryIds) && f.categoryIds.includes(activeCategoryId)
    );
  }, [allFlavors, activeCategoryId]);

  // Specific Flavor Segregations for Combo Sets
  const bentoCategoryId = useMemo(() => {
    return categories.find(c => c.name.toLowerCase().includes('bento'))?._id || null;
  }, [categories]);

  const treatsCategoryId = useMemo(() => {
    const isMacaronCombo = categoryName?.toLowerCase().includes('macaron');
    return categories.find(c => 
        c.name.toLowerCase().includes(isMacaronCombo ? 'macaron' : 'cupcake')
    )?._id || null;
  }, [categories, categoryName]);

  const bentoFlavors = useMemo(() => {
    if (!bentoCategoryId) return filteredFlavors; // Fallback to category defaults
    return allFlavors.filter((f: any) => 
       Array.isArray(f.categoryIds) && f.categoryIds.includes(bentoCategoryId)
    );
  }, [allFlavors, bentoCategoryId, filteredFlavors]);

  const treatFlavors = useMemo(() => {
    if (!treatsCategoryId) return filteredFlavors; // Fallback to category defaults
    return allFlavors.filter((f: any) => 
       Array.isArray(f.categoryIds) && f.categoryIds.includes(treatsCategoryId)
    );
  }, [allFlavors, treatsCategoryId, filteredFlavors]);

  const displayableDiameters: DiameterOption[] = useMemo(() => {
    return filteredDiameters.map(d => ({
      id: d._id,
      name: d.name,
      servings: d.servings || `Approx. ${d.sizeValue || 0} servings`,
      illustration: getIllustrationForSize(d.sizeValue || 0),
    }));
  }, [filteredDiameters]);


  // --- COMPILATION LOGIC ---
  // Whenever local state changes, compile it dynamically into the single details.size & details.flavor string
  const compilePayload = useCallback(() => {
      let finalSize = "";
      let finalFlavor = "";

      if (isCombo) {
          finalSize = `Combo Box: ${comboPieceQuantity || "TBD"} pieces + 4" Pick`;
          
          const tFlavors = comboTreatFlavorIds.map(id => treatFlavors.find(f => f._id === id)?.name).filter(Boolean).join(", ");
          const cFlavor = bentoFlavors.find(f => f._id === comboCakeFlavorId)?.name;
          
          finalFlavor = `Treats: [${tFlavors || "None"}]. Cake: ${cFlavor || "None"}`;

      } else if (isDiscrete) {
          finalSize = discreteQuantity ? `Quantity: ${discreteQuantity}` : "";
          finalFlavor = discreteFlavorIds.map(id => filteredFlavors.find(f => f._id === id)?.name).filter(Boolean).join(", ");
          
      } else {
          // Standard
          finalSize = filteredDiameters.find(d => d._id === standardDiameterId)?.name || "";
          finalFlavor = filteredFlavors.find(f => f._id === standardFlavorId)?.name || "";
      }

      setValue("details.size", finalSize, { shouldValidate: true });
      setValue("details.flavor", finalFlavor, { shouldValidate: true });

  }, [isCombo, isDiscrete, comboPieceQuantity, comboTreatFlavorIds, comboCakeFlavorId, discreteQuantity, discreteFlavorIds, standardDiameterId, standardFlavorId, filteredFlavors, filteredDiameters, setValue]);

  // Sync back local state compilation
  useEffect(() => {
      compilePayload();
  }, [compilePayload]);


  // Helper Handlers for Arrays (Multi Select)
  const handleToggleDiscreteFlavor = (id: string) => {
     setDiscreteFlavorIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };
  
  const handleToggleComboTreatFlavor = (id: string) => {
     setComboTreatFlavorIds(prev => {
        if (prev.includes(id)) return prev.filter(f => f !== id);
        if (prev.length >= 3) return prev; // max 3
        return [...prev, id];
     });
  };

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-primary/50 gap-4">
           <Loader2 className="w-8 h-8 animate-spin text-accent" />
           <p className="font-semibold animate-pulse">Loading customizable options...</p>
        </div>
      );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-heading text-primary">Customize your {categoryName || "Treat"}</h2>
      </div>

      <div className="space-y-10">
        
        {/* ========================================= */}
        {/* CONDITION B: COMBO SETS UI                */}
        {/* ========================================= */}
        {isCombo && (
           <div className="space-y-10">
              
              <div className="border-b border-primary/10 pb-8">
                 <h3 className="font-heading text-xl text-primary mb-2">1. Choose Box Size</h3>
                 <p className="text-sm text-primary/60 mb-4">How many treats should be included alongside the mini cake?</p>
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {BOX_SIZES.map((box) => (
                      <button
                        key={box.value}
                        type="button"
                        onClick={() => setComboPieceQuantity(box.value)}
                        className={`flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
                          comboPieceQuantity === box.value
                            ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                            : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground hover:shadow-sm"
                        }`}
                      >
                        <div className="flex h-24 w-24 items-center justify-center pointer-events-none">
                           <box.Icon className={`h-full w-full ${comboPieceQuantity === box.value ? 'text-accent' : 'text-primary'}`} />
                        </div>
                        <p className="font-body text-body font-bold text-primary">
                          {box.label}
                        </p>
                      </button>
                    ))}
                 </div>
              </div>

              <div className="border-b border-primary/10 pb-8">
                 <h3 className="font-heading text-xl text-primary mb-2">2. Treats Flavors</h3>
                 <p className="text-sm text-primary/60 mb-4">Choose up to 3 flavors for the treats in your box.</p>
                 <div className="bg-background rounded-2xl shadow-sm border p-4">
                   <FlavorSelector
                     mode="multiple"
                     flavors={treatFlavors}
                     selectedIds={comboTreatFlavorIds}
                     onToggleId={handleToggleComboTreatFlavor}
                     maxSelection={3}
                     hidePrice={true} 
                   />
                 </div>
              </div>

              <div>
                 <h3 className="font-heading text-xl text-primary mb-4">3. Cake Flavor</h3>
                 <div className="mb-6 flex gap-4 items-center bg-accent/5 p-4 rounded-xl border border-accent/20">
                    <div className="w-16 h-16 shrink-0 bg-white rounded-lg shadow-sm flex items-center justify-center">
                       <FourInchBentoIcon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                       <p className="font-bold text-primary">Includes 4-inch Custom Cake</p>
                       <p className="text-sm text-primary/70">Pick the core flavor below.</p>
                    </div>
                 </div>
                 <div className="bg-background rounded-2xl shadow-sm border p-4">
                   <FlavorSelector
                     mode="single"
                     flavors={bentoFlavors}
                     selectedId={comboCakeFlavorId}
                     onSelectId={setComboCakeFlavorId}
                     hidePrice={true} 
                   />
                 </div>
              </div>

           </div>
        )}


        {/* ========================================= */}
        {/* CONDITION A: DISCRETE (Cupcakes)          */}
        {/* ========================================= */}
        {isDiscrete && (
            <div className="space-y-10">
              
              <div className="border-b border-primary/10 pb-8">
                 <h3 className="font-heading text-xl text-primary mb-2">How many do you need?</h3>
                 <p className="text-sm text-primary/60 mb-4">Select the quantity bundle for your treats.</p>
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {BOX_SIZES.map((box) => (
                      <button
                        key={box.value}
                        type="button"
                        onClick={() => setDiscreteQuantity(box.value)}
                        className={`flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
                          discreteQuantity === box.value
                            ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                            : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground hover:shadow-sm"
                        }`}
                      >
                        <div className="flex h-24 w-24 items-center justify-center pointer-events-none">
                           <box.Icon className={`h-full w-full ${discreteQuantity === box.value ? 'text-accent' : 'text-primary'}`} />
                        </div>
                        <p className="font-body text-body font-bold text-primary">
                          {box.label}
                        </p>
                      </button>
                    ))}
                 </div>
              </div>

              <div>
                 <h3 className="font-heading text-xl text-primary mb-2">Choose your flavors</h3>
                 <p className="text-sm text-primary/60 mb-4">Select multiple profiles for a mixed set, or pick one.</p>
                 <div className="bg-background rounded-2xl shadow-sm border p-4">
                   <FlavorSelector
                     mode="multiple"
                     flavors={filteredFlavors}
                     selectedIds={discreteFlavorIds}
                     onToggleId={handleToggleDiscreteFlavor}
                     hidePrice={true} 
                   />
                 </div>
              </div>

            </div>
        )}


        {/* ========================================= */}
        {/* CONDITION C: STANDARD UI (Cakes)          */}
        {/* ========================================= */}
        {isStandard && (
           <div className="space-y-10">
              
              <div className="border-b border-primary/10 pb-8">
                {filteredDiameters.length > 0 ? (
                  <DiameterSelector
                    diameters={displayableDiameters}
                    selectedDiameterId={standardDiameterId}
                    onSelectDiameter={setStandardDiameterId}
                  />
                ) : (
                  <div>
                    <h3 className="font-heading text-xl text-primary mb-2">Custom Yield / Size</h3>
                    <p className="text-sm text-primary/60 mb-4">Describe the dimensional requirements or guest count.</p>
                    <Input 
                      placeholder="e.g. 15 guests, 3-tiers" 
                      value={currentSize || ""} // Fallback if no DB configs exist
                      onChange={(e) => setValue("details.size", e.target.value, { shouldValidate: true })}
                      className="w-full max-w-sm bg-white"
                    />
                  </div>
                )}
                {errors.details?.size && <p className="text-primary/60 text-sm mt-3 flex items-center font-medium"> {errors.details.size.message}</p>}
              </div>

              <div>
                <h3 className="font-heading text-xl text-primary mb-4">Flavor Profile</h3>
                {filteredFlavors.length > 0 ? (
                  <div className="bg-background rounded-2xl shadow-sm border p-4">
                    <FlavorSelector
                      mode="single"
                      flavors={filteredFlavors}
                      selectedId={standardFlavorId}
                      onSelectId={setStandardFlavorId}
                      hidePrice={true} 
                    />
                  </div>
                ) : (
                  <Input 
                    placeholder="e.g. Vanilla Bean with Jam" 
                    value={currentFlavor || ""} 
                    onChange={(e) => setValue("details.flavor", e.target.value, { shouldValidate: true })}
                    className="w-full max-w-sm bg-white"
                  />
                )}
                {errors.details?.flavor && <p className="text-primary/60 text-sm mt-3 flex items-center font-medium"> {errors.details.flavor.message}</p>}
              </div>

           </div>
        )}
        
      </div>
    </div>
  );
}
