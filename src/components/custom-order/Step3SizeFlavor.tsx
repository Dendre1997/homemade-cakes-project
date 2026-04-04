import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormContext } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Loader2 } from "lucide-react";
import LoadingSpinner from "../ui/Spinner";

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
  { value: "6", label: "Box of", Icon: BoxIconSix },
  { value: "12", label: "Box of", Icon: BoxIconTwelve },
  { value: "24", label: "Box of", Icon: BoxIconTwentyFour },
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
  
  // If isDiscrete (Cupcakes) — default to smallest box
  const [discreteQuantity, setDiscreteQuantity] = useState<string>(BOX_SIZES[0].value);
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

  const activeCategoryObj = useMemo(() => {
    if (!categoryName) return null;
    return categories.find(c => {
       const displayName = c.name.endsWith('s') || c.name.endsWith('S') ? c.name.slice(0, -1) : c.name;
       return displayName === categoryName || c.name === categoryName;
    }) || null;
  }, [categoryName, categories]);

  const activeCategoryId = activeCategoryObj?._id || null;

  // Sorted ascending by sizeValue so index 0 = smallest = base price, no multiplier
  const filteredDiameters = useMemo(() => {
    if (!activeCategoryId) return [];
    return allDiameters
      .filter((d: any) => Array.isArray(d.categoryIds) && d.categoryIds.includes(activeCategoryId))
      .sort((a: any, b: any) => (a.sizeValue || 0) - (b.sizeValue || 0));
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

  // ── Price computation ──────────────────────────────────────────────────────
  // Formula: basePrice × (1 + diameterIndex × 0.30)
  // Index 0 (smallest diameter) = no markup; each subsequent size adds 30%.
  const basePrice: number = activeCategoryObj?.basePrice || 0;

  const approximatePrice = useMemo(() => {
    if (!isStandard || basePrice <= 0) return 0;
    if (!standardDiameterId) return basePrice; // show base price before selection
    const idx = filteredDiameters.findIndex((d: any) => d._id === standardDiameterId);
    if (idx < 0) return basePrice;
    if (idx <= 0) return basePrice; // smallest size — keep exact base price
    return Math.ceil(basePrice * (1 + idx * 0.30) / 10) * 10;
  }, [isStandard, basePrice, standardDiameterId, filteredDiameters]);

  // Discrete: basePrice × quantity — smallest box exact, larger ceil-to-10
  const discretePrice = useMemo(() => {
    if (!isDiscrete || basePrice <= 0) return 0;
    const qty = Number(discreteQuantity) || Number(BOX_SIZES[0].value);
    const raw = basePrice * qty;
    return discreteQuantity === BOX_SIZES[0].value
      ? raw           // smallest box — exact price
      : Math.ceil(raw / 10) * 10;
  }, [isDiscrete, basePrice, discreteQuantity]);

  // Sync computed price into form state so it's submitted with the order
  useEffect(() => {
    if (isStandard) {
      setValue("approximatePrice", approximatePrice > 0 ? approximatePrice : undefined);
    } else if (isDiscrete) {
      setValue("approximatePrice", discretePrice > 0 ? discretePrice : undefined);
    }
  }, [approximatePrice, discretePrice, isStandard, isDiscrete, setValue]);


  // --- COMPILATION LOGIC ---
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
           <LoadingSpinner />
      );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      <div className="text-center">
        <p className="text-primary/70 mt-2">
          Pick {!isDiscrete ? "size" : "quantity"} & flavor of{" "}
          {categoryName || "Treat"}
        </p>
      </div>

      <div className="space-y-10">
        {/* ========================================= */}
        {/* CONDITION B: COMBO SETS UI                */}
        {/* ========================================= */}
        {isCombo && (
          <div className="space-y-10">
            <div className="border-b border-primary/10 pb-8">
              <h3 className="font-heading text-xl text-primary mb-2">
                1. Choose Box Size
              </h3>
              <p className="text-sm text-primary/60 mb-4">
                How many treats should be included alongside the mini cake?
              </p>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {BOX_SIZES.map((box) => (
                  <button
                    key={box.value}
                    type="button"
                    onClick={() =>
                      setComboPieceQuantity(String(Number(box.value) - 1))
                    }
                    className={`flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
                      comboPieceQuantity === String(Number(box.value) - 1)
                        ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                        : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground hover:shadow-sm"
                    }`}
                  >
                    <div className="flex h-24 w-24 items-center justify-center pointer-events-none">
                      <box.Icon
                        className={`h-full w-full ${comboPieceQuantity === box.value ? "text-accent" : "text-primary"}`}
                      />
                    </div>
                    <p className="font-body text-body font-bold text-primary">
                      {box.label + " " + String(Number(box.value) - 1)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-primary/10 pb-8">
              <h3 className="font-heading text-xl text-primary mb-2">
                2. Treats Flavors
              </h3>
              <p className="text-sm text-primary/60 mb-4">
                Choose up to 3 flavors for the treats in your box.
              </p>
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
              <h3 className="font-heading text-xl text-primary mb-4">
                3. Cake Flavor
              </h3>
              <div className="mb-6 flex gap-4 items-center bg-accent/5 p-4 rounded-xl border border-accent/20">
                <div className="w-16 h-16 shrink-0 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <FourInchBentoIcon className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-primary">
                    Includes 4-inch Custom Cake
                  </p>
                  <p className="text-sm text-primary/70">
                    Pick the core flavor below.
                  </p>
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
              {/* ── Live price badge ── */}
              {basePrice > 0 && (
                <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/40">
                      Estimate, not final
                    </p>
                    <p className="text-sm text-primary/60 mt-0.5">
                      Final after review
                    </p>
                    <p className="text-sm text-primary/60 mt-0.5">
                      {discreteQuantity
                        ? `${discreteQuantity} pieces × $${basePrice} each`
                        : "Select a quantity to see your price"}
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-accent tabular-nums">
                    $
                    {discretePrice > 0
                      ? discretePrice
                      : basePrice * Number(BOX_SIZES[0].value)}
                  </p>
                </div>
              )}
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
                      <box.Icon
                        className={`h-full w-full ${discreteQuantity === box.value ? "text-accent" : "text-primary"}`}
                      />
                    </div>
                    <p className="font-body text-body font-bold text-primary">
                      {box.label + " " + box.value}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-sm text-primary/60 mb-4">
                Select how many {categoryName + "s"} do you need?
              </p>
            </div>

            <div>
              <div className="bg-background rounded-2xl shadow-sm border p-4">
                <FlavorSelector
                  mode="multiple"
                  flavors={filteredFlavors}
                  selectedIds={discreteFlavorIds}
                  onToggleId={handleToggleDiscreteFlavor}
                  hidePrice={true}
                />
              </div>
              <p className="text-sm text-primary/60 mb-4">
                Select multiple flavors for a mixed set, or pick one.
              </p>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* CONDITION C: STANDARD UI (Cakes)          */}
        {/* ========================================= */}
        {isStandard && (
          <div className="space-y-10">
            <div className="border-b border-primary/10 pb-8">
              {/* ── Live price badge ── */}
              {basePrice > 0 && (
                <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/40">
                      Estimate, not final
                    </p>
                    <p className="text-sm text-primary/60 mt-0.5">
                      Final after review
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-accent tabular-nums">
                      ${approximatePrice}
                    </p>
                    {/* {standardDiameterId && (() => {
                      const idx = filteredDiameters.findIndex((d: any) => d._id === standardDiameterId);
                      return idx > 0 ? (
                        <p className="text-xs text-primary/40 mt-0.5">+{(idx * 30)}% size markup</p>
                      ) : (
                        <p className="text-xs text-primary/40 mt-0.5">Base price</p>
                      );
                    })()} */}
                  </div>
                </div>
              )}

              {filteredDiameters.length > 0 ? (
                <DiameterSelector
                  diameters={displayableDiameters}
                  selectedDiameterId={standardDiameterId}
                  onSelectDiameter={setStandardDiameterId}
                />
              ) : (
                <div>
                  <h3 className="font-heading text-xl text-primary mb-2">
                    Custom Yield / Size
                  </h3>
                  <p className="text-sm text-primary/60 mb-4">
                    Describe the dimensional requirements or guest count.
                  </p>
                  <Input
                    placeholder="e.g. 15 guests, 3-tiers"
                    value={currentSize || ""} // Fallback if no DB configs exist
                    onChange={(e) =>
                      setValue("details.size", e.target.value, {
                        shouldValidate: true,
                      })
                    }
                    className="w-full max-w-sm bg-white"
                  />
                </div>
              )}
              {errors.details?.size && (
                <p className="text-primary/60 text-sm mt-3 flex items-center font-medium">
                  {" "}
                  {errors.details.size.message}
                </p>
              )}
            </div>

            <div>
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
                  onChange={(e) =>
                    setValue("details.flavor", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                  className="w-full max-w-sm bg-white"
                />
              )}
              {errors.details?.flavor && (
                <p className="text-primary/60 text-sm mt-3 flex items-center font-medium">
                  {" "}
                  {errors.details.flavor.message}
                </p>
              )}
            </div>
          </div>
        )}

        <AllergySection />
      </div>
    </div>
  );
}


function AllergySection() {
  const { setValue, watch, formState: { errors } } = useFormContext<CustomOrderFormData>();
  const currentAllergies = watch("allergies");

  const handleNo = () => {
    setValue("allergies", "No", { shouldValidate: true });
  };

  const handleYes = () => {
    // Switch to YES mode — clear "No" so the input shows and user must type
    if (currentAllergies === "No" || currentAllergies === undefined) {
      setValue("allergies", "", { shouldValidate: false });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("allergies", e.target.value, { shouldValidate: true });
  };

  // Determine active button
  const noActive  = currentAllergies === "No";
  const yesActive = currentAllergies !== undefined && currentAllergies !== "No";

  return (
    <div className="border-t border-primary/10 pt-8 space-y-4">
      <div>
        <h3 className="font-heading text-xl text-primary mb-1">Do you have any allergies?</h3>
        <p className="text-sm text-primary/60 mb-4">
          This helps us make your order safely
        </p>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleNo}
            className={`w-32 h-12 text-lg rounded-xl shadow-lg transition-all active:scale-95 ${
              noActive
                ? "shadow-primary/20 hover:shadow-primary/40"
                : "bg-white border border-primary/20 text-primary/70 shadow-primary/10 hover:shadow-primary/20 hover:bg-subtleBackground"
            }`}
            variant={noActive ? "primary" : "outline"}
          >
            No
          </Button>

          <Button
            type="button"
            onClick={handleYes}
            className={`w-32 h-12 text-lg rounded-xl shadow-lg transition-all active:scale-95 ${
              yesActive
                ? "shadow-primary/20 hover:shadow-primary/40"
                : "bg-white border border-primary/20 text-primary/70 shadow-primary/10 hover:shadow-primary/20 hover:bg-subtleBackground"
            }`}
            variant={yesActive ? "primary" : "outline"}
          >
            Yes
          </Button>
        </div>


        {/* Conditional text input — framer-motion for smooth spring entrance */}
        <AnimatePresence>
          {yesActive && (
            <motion.div
              key="allergy-input"
              initial={{ opacity: 0, height: 0, y: -6, filter: "blur(4px)" }}
              animate={{ opacity: 1, height: "auto", y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, height: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden mt-4"
            >
              <Input
                placeholder="Please list your allergies (e.g. nuts, dairy, gluten...)"
                value={currentAllergies === "No" ? "" : (currentAllergies || "")}
                onChange={handleTextChange}
                className="w-full bg-white"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation error */}
        {errors.allergies && (
          <p className="text-primary/60 text-sm mt-3 flex items-center font-medium">
            {errors.allergies.message}
          </p>
        )}
      </div>
    </div>
  );
}
