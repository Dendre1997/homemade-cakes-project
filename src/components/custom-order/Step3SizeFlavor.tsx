import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormContext } from "react-hook-form";
import { CustomOrderRequestData } from "@/lib/validation/customOrderSchema";
import { calculateCustomOrderTotal } from "@/lib/pricing/customOrderPricing";
import { Loader2 } from "lucide-react";
import LoadingSpinner from "../ui/Spinner";

import DiameterSelector, { DiameterOption } from "@/components/ui/DiameterSelector";
import ShapeSelector from "@/components/ui/ShapeSelector";
import FlavorSelector from "@/components/ui/FlavorSelector";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { findCategoryForCustomOrderItem } from "@/lib/customOrderCategory";
import { sortFlavorsByDisplayOrder } from "@/lib/utils/sortFlavors";
import { IShape, CakeTierSelection, CatalogSet } from "@/types";
import { useAlert } from "@/contexts/AlertContext";
import { SetBoxIcon } from "@/components/ui/SetBoxIcon";
import {
  catalogSetPortion,
  customOrderSetEstimate,
  customOrderSetSizeText,
  findFlavorBySavedName,
  flavorIdsFromSavedNames,
} from "@/lib/sets/customOrderSets";

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
  { value: "18", label: "Box of", Icon: BoxIconTwentyFour },
  { value: "24", label: "Box of", Icon: BoxIconTwentyFour },
];

const flavorWord = (count: number) => (count === 1 ? "flavor" : "flavors");

function nameForFlavorId(
  flavors: { _id?: unknown; name?: string }[],
  id: unknown
) {
  if (id == null || id === "") return undefined;
  return flavors.find((flavor) => String(flavor._id) === String(id))?.name;
}

export default function Step3SizeFlavor({ onNext, onFlavorInfoClick, itemIndex }: { onNext: () => void; onFlavorInfoClick?: (id: string) => void; itemIndex: number }) {
  const { showAlert } = useAlert();
  const { setValue, watch, getValues, formState: { errors } } = useFormContext<CustomOrderRequestData>();
  const ip = (sub: string): any => `items.${itemIndex}.${sub}`;
  const itemErrors = (errors.items?.[itemIndex] as any) ?? undefined;
  const categoryId = watch(ip("categoryId"));
  const categoryName = watch(ip("category"));
  
  // What the final output to the database will be
  const currentSize = watch(ip("details.size"));
  const currentFlavor = watch(ip("details.flavor"));

  const [isLoading, setIsLoading] = useState(true);

  // Raw API Data
  const [categories, setCategories] = useState<any[]>([]);
  const [allDiameters, setAllDiameters] = useState<any[]>([]);
  const [allFlavors, setAllFlavors] = useState<any[]>([]);
  const [allShapes, setAllShapes] = useState<IShape[]>([]);
  /** The catalog sets fetched for one category, or a failed fetch for that category. */
  const [loadedSets, setLoadedSets] = useState<
    | { status: "ready"; categoryId: string; sets: CatalogSet[] }
    | { status: "error"; categoryId: string }
    | null
  >(null);

  const activeCategoryObj = useMemo(() => {
    if (!categoryId && !categoryName) return null;
    return findCategoryForCustomOrderItem(
      { categoryId, category: categoryName },
      categories
    );
  }, [categoryId, categoryName, categories]);

  const activeCategoryId = activeCategoryObj?._id || null;

  // INTELLIGENT INFERENCE
  const isCombo = activeCategoryObj?.categoryType === "combo";
  const isDiscrete = activeCategoryObj?.categoryType === "set";
  const isStandard = activeCategoryObj?.categoryType === "single" || !activeCategoryObj?.categoryType;

  // --- LOCAL STATE FOR COMPLEX RUNDOWNS ---
  // If isStandard
  const [standardDiameterId, setStandardDiameterId] = useState<string | null>(null);
  const [tierFlavors, setTierFlavors] = useState<Record<number, string>>({});
  const [standardShapeId, setStandardShapeId] = useState<string>("");
  
  // If isDiscrete (Cupcakes) — default to smallest box
  const [discreteQuantity, setDiscreteQuantity] = useState<string>(BOX_SIZES[0].value);
  const [discreteFlavorIds, setDiscreteFlavorIds] = useState<string[]>([]);

  // If isCombo (Sets)
  const [comboPieceQuantity, setComboPieceQuantity] = useState<string>("");
  /** Catalog set chosen for a set or combo category that has assigned sets. */
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [comboTreatFlavorIds, setComboTreatFlavorIds] = useState<string[]>([]);
  const [comboCakeFlavorId, setComboCakeFlavorId] = useState<string | null>(null);

  // The picker state lives only while this step is open. Edit mounts it again,
  // so the saved line item has to be copied back in before we write the form.
  const selectionHydrated = useRef(-1);
  const previousDiameterId = useRef<string | null>(null);
  const sizeTouched = useRef(false);
  const flavorTouched = useRef(false);
  const shapeTouched = useRef(false);
  const preserveSavedEstimate = useRef(false);
  const [selectionReady, setSelectionReady] = useState(false);

  const noteEdit = (field: "size" | "flavor" | "shape") => {
    preserveSavedEstimate.current = false;
    if (field === "size") sizeTouched.current = true;
    if (field === "flavor") flavorTouched.current = true;
    if (field === "shape") shapeTouched.current = true;
  };

  useEffect(() => {
    async function fetchDBDocs() {
      setIsLoading(true);
      try {
        const [catRes, diamRes, flavRes, shapesRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/diameters"),
          fetch("/api/flavors"),
          fetch("/api/shapes"),
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (diamRes.ok) setAllDiameters(await diamRes.json());
        if (flavRes.ok) setAllFlavors(await flavRes.json());
        if (shapesRes.ok) {
          const shapesData = await shapesRes.json();
          setAllShapes(
            shapesData.map((shape: IShape & { _id: unknown }) => ({
              ...shape,
              _id: typeof shape._id === "string" ? shape._id : String(shape._id),
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load options", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDBDocs();
  }, []);

  // null while a set or combo category's sets are still loading, so the fixed
  // boxes are not shown before we know the category has none.
  const catalogSets: CatalogSet[] | null =
    isDiscrete || isCombo
      ? loadedSets?.status === "ready" && loadedSets.categoryId === String(activeCategoryId)
        ? loadedSets.sets
        : null
      : [];
  const setsFailed =
    (isDiscrete || isCombo) &&
    loadedSets?.status === "error" &&
    loadedSets.categoryId === String(activeCategoryId);

  useEffect(() => {
    if (!activeCategoryId || (!isDiscrete && !isCombo)) return;
    let cancelled = false;
    const categoryId = String(activeCategoryId);
    fetch(`/api/sets?categoryId=${categoryId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setLoadedSets({
            status: "ready",
            categoryId,
            sets: Array.isArray(data) ? data : [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedSets({ status: "error", categoryId });
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, isDiscrete, isCombo]);



  // Sorted ascending by sizeValue so index 0 = smallest = base price, no multiplier
  const filteredDiameters = useMemo(() => {
    if (!activeCategoryId) return [];
    return allDiameters
      .filter((d: any) => Array.isArray(d.categoryIds) && d.categoryIds.includes(activeCategoryId))
      .sort((a: any, b: any) => (a.sizeValue || 0) - (b.sizeValue || 0));
  }, [allDiameters, activeCategoryId]);

  const filteredFlavors = useMemo(() => {
    if (!activeCategoryId) return [];
    const filtered = allFlavors.filter((f: any) =>
       Array.isArray(f.categoryIds) && f.categoryIds.includes(activeCategoryId)
    );
    return sortFlavorsByDisplayOrder(
      filtered,
      activeCategoryObj?.flavorDisplayOrder,
    );
  }, [allFlavors, activeCategoryId, activeCategoryObj]);

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
    const filtered = allFlavors.filter((f: any) =>
       Array.isArray(f.categoryIds) && f.categoryIds.includes(bentoCategoryId)
    );
    const displayOrder = categories.find(
      (category) => String(category._id) === String(bentoCategoryId),
    )?.flavorDisplayOrder;
    return sortFlavorsByDisplayOrder(filtered, displayOrder);
  }, [allFlavors, bentoCategoryId, filteredFlavors, categories]);

  const treatFlavors = useMemo(() => {
    if (!treatsCategoryId) return filteredFlavors; // Fallback to category defaults
    const filtered = allFlavors.filter((f: any) =>
       Array.isArray(f.categoryIds) && f.categoryIds.includes(treatsCategoryId)
    );
    const displayOrder = categories.find(
      (category) => String(category._id) === String(treatsCategoryId),
    )?.flavorDisplayOrder;
    return sortFlavorsByDisplayOrder(filtered, displayOrder);
  }, [allFlavors, treatsCategoryId, filteredFlavors, categories]);

  const displayableDiameters: DiameterOption[] = useMemo(() => {
    return filteredDiameters.map(d => ({
      id: d._id,
      name: d.name,
      servings: d.servings?.trim() || "",
      illustration: getIllustrationForSize(d.sizeValue || 0),
      imageUrl: d.imageUrl,
      sizeValue: d.sizeValue || 0,
    }));
  }, [filteredDiameters]);

  const selectedStandardDiameter = useMemo(() => {
    if (!standardDiameterId) return null;
    return (
      filteredDiameters.find(
        (d: { _id: unknown }) => String(d._id) === String(standardDiameterId)
      ) ?? null
    );
  }, [filteredDiameters, standardDiameterId]);

  const standardTiersCount = selectedStandardDiameter?.tiersCount ?? 1;

  const standardTierSizes = useMemo((): string[] => {
    if (!selectedStandardDiameter || standardTiersCount <= 1) return [];
    const sizes = selectedStandardDiameter.tierSizes;
    if (Array.isArray(sizes) && sizes.length === standardTiersCount) {
      return sizes;
    }
    return Array.from({ length: standardTiersCount }, (_, index) => `Tier ${index + 1}`);
  }, [selectedStandardDiameter, standardTiersCount]);

  useEffect(() => {
    const previous = previousDiameterId.current;
    previousDiameterId.current = standardDiameterId;
    if (previous && standardDiameterId && previous !== standardDiameterId) {
      flavorTouched.current = true;
      setTierFlavors({});
    }
  }, [standardDiameterId]);

  const availableShapesForDiameter = useMemo(() => {
    if (!selectedStandardDiameter) return [];
    const allowedIds = (selectedStandardDiameter.shapeIds || []).map((id: unknown) =>
      String(id)
    );
    if (allowedIds.length === 0) return allShapes;
    return allShapes.filter((shape) => allowedIds.includes(String(shape._id)));
  }, [selectedStandardDiameter, allShapes]);

  useEffect(() => {
    if (!isStandard || !standardDiameterId || standardTiersCount > 1) {
      if (standardTiersCount > 1 && standardDiameterId) {
        shapeTouched.current = true;
        setStandardShapeId("");
      }
      return;
    }

    if (availableShapesForDiameter.length === 0) {
      setStandardShapeId("");
      return;
    }

    setStandardShapeId((prev) => {
      if (prev && availableShapesForDiameter.some((shape) => String(shape._id) === String(prev))) {
        return prev;
      }
      const savedShape = String(getValues(ip("details.shape")) ?? "");
      if (!shapeTouched.current && savedShape) {
        const mapped = availableShapesForDiameter.find((shape) => shape.name === savedShape);
        if (mapped) return String(mapped._id);
        return prev;
      }
      const defaultShape =
        availableShapesForDiameter.find((shape) => shape.isDefault) ||
        availableShapesForDiameter[0];
      return defaultShape?._id || "";
    });
  }, [isStandard, standardDiameterId, standardTiersCount, availableShapesForDiameter, getValues, itemIndex]);

  const standardShapeSurcharge = useMemo(() => {
    if (standardTiersCount > 1 || !standardShapeId) return 0;
    return allShapes.find((s) => s._id === standardShapeId)?.priceSurcharge ?? 0;
  }, [standardTiersCount, standardShapeId, allShapes]);

  // ── Price computation ──────────────────────────────────────────────────────
  // Formula: basePrice × (1 + diameterIndex × 0.30)
  // Index 0 (smallest diameter) = no markup; each subsequent size adds 30%.
  const basePrice: number = activeCategoryObj?.basePrice || 0;

  const approximatePrice = useMemo(() => {
    if (!isStandard || basePrice <= 0) return 0;
    if (!standardDiameterId) return basePrice; // show base price before selection
    const selectedDiameter = filteredDiameters.find((d: any) => d._id === standardDiameterId);
    // Use fixed diameter base price if set
    if (selectedDiameter?.basePrice && selectedDiameter.basePrice > 0) {
      return selectedDiameter.basePrice + standardShapeSurcharge;
    }
    // Fallback to existing index-based calculation
    const idx = filteredDiameters.findIndex((d: any) => d._id === standardDiameterId);
    if (idx < 0) return basePrice + standardShapeSurcharge;
    if (idx <= 0) return basePrice + standardShapeSurcharge; // smallest size — keep exact base price
    return Math.ceil(basePrice * (1 + idx * 0.30) / 10) * 10 + standardShapeSurcharge;
  }, [isStandard, basePrice, standardDiameterId, filteredDiameters, standardShapeSurcharge]);

  const selectedCatalogSet = useMemo(
    () => catalogSets?.find((set) => String(set._id) === selectedSetId) ?? null,
    [catalogSets, selectedSetId]
  );
  const hasCatalogSets = (catalogSets?.length ?? 0) > 0;

  // Discrete: a catalog set's price, else basePrice × quantity
  const discretePrice = useMemo(() => {
    if (!isDiscrete) return 0;
    if (selectedCatalogSet) return catalogSetPortion(selectedCatalogSet, basePrice);
    if (basePrice <= 0) return 0;
    const qty = Number(discreteQuantity) || Number(BOX_SIZES[0].value);
    return basePrice * qty;
  }, [isDiscrete, basePrice, discreteQuantity, selectedCatalogSet]);

  // Combo: the category base price is the cake. A catalog set adds its own portion.
  const comboEstimate = useMemo(() => {
    if (!isCombo) return 0;
    if (selectedCatalogSet) {
      return customOrderSetEstimate({
        categoryType: "combo",
        categoryBasePrice: basePrice,
        set: selectedCatalogSet,
      });
    }
    return basePrice > 0 ? basePrice : 0;
  }, [isCombo, basePrice, selectedCatalogSet]);

  const standardFlavorUpcharge = useMemo(() => {
    if (!isStandard) return 0;
    const indices =
      standardTiersCount > 1
        ? Array.from({ length: standardTiersCount }, (_, index) => index)
        : [0];

    return indices.reduce((sum, index) => {
      const flavorId = tierFlavors[index];
      if (!flavorId) return sum;
      return sum + (filteredFlavors.find((f: any) => f._id === flavorId)?.price ?? 0);
    }, 0);
  }, [isStandard, standardTiersCount, tierFlavors, filteredFlavors]);

  // ── Price Sync: Forward Math Engine ────────────────────────────────────────────
  // Called whenever size, flavor, or step-3-visible state changes.
  // Addons (Step 4) are read via getValues() — non-reactive — so they are
  // included if the user navigates back to Step 3, without creating a circular dep.
  // Step 4 has its OWN effect that re-runs the engine when addons change.
  useEffect(() => {
    if (!selectionReady || preserveSavedEstimate.current) return;
    if (isStandard) {
      // cakeSizePrice = the size-multiplied cake price (the existing useMemo formula)
      const cakeSizePrice = approximatePrice > 0 ? approximatePrice : (basePrice || 0);
      // Read existing addons non-reactively so they're included in the grand total
      const existingAddons = (getValues(ip("addons")) as any[]) ?? [];

      const result = calculateCustomOrderTotal({
        cakeSizePrice,
        flavorPrice: standardFlavorUpcharge,
        addons: existingAddons,
      });

      setValue(ip("approximatePrice"), result.grandTotal > 0 ? result.grandTotal : undefined);
      setValue(ip("priceBreakdown"), result);

    } else if (isDiscrete) {
      const cakeSizePrice = discretePrice > 0 ? discretePrice : 0;
      const existingAddons = (getValues(ip("addons")) as any[]) ?? [];

      const result = calculateCustomOrderTotal({
        cakeSizePrice,
        flavorPrice: 0,  // Discrete (cupcakes/sets) don't have per-flavor upcharges
        addons: existingAddons,
      });

      setValue(ip("approximatePrice"), result.grandTotal > 0 ? result.grandTotal : undefined);
      setValue(ip("priceBreakdown"), result);
    } else if (isCombo) {
      // The cake is the category base price. A catalog set adds its own portion;
      // without one the whole estimate stays the category base price.
      const cakeSizePrice = comboEstimate > 0 ? comboEstimate : 0;
      const existingAddons = (getValues(ip("addons")) as any[]) ?? [];

      const result = calculateCustomOrderTotal({
        cakeSizePrice,
        flavorPrice: 0,
        addons: existingAddons,
      });

      setValue(ip("approximatePrice"), result.grandTotal > 0 ? result.grandTotal : undefined);
      setValue(ip("priceBreakdown"), result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approximatePrice, discretePrice, comboEstimate, isStandard, isDiscrete, isCombo, standardFlavorUpcharge, basePrice, itemIndex, selectionReady]);


  // --- COMPILATION LOGIC ---
  const compilePayload = useCallback(() => {
      let finalSize = "";
      let finalFlavor = "";
      let finalTiers: CakeTierSelection[] | undefined;
      let finalDiameterId: string | undefined;

      if (isCombo) {
          finalSize = selectedCatalogSet
            ? customOrderSetSizeText(selectedCatalogSet, "combo")
            : `Combo Box: ${comboPieceQuantity || "TBD"} pieces + 4" Pick`;
          
          const tFlavors = comboTreatFlavorIds
            .map((id) => nameForFlavorId(treatFlavors, id))
            .filter(Boolean)
            .join(", ");
          const cFlavor = nameForFlavorId(bentoFlavors, comboCakeFlavorId);
          
          finalFlavor = `Treats: [${tFlavors || "None"}]. Cake: ${cFlavor || "None"}`;

      } else if (isDiscrete) {
          finalSize = selectedCatalogSet
            ? customOrderSetSizeText(selectedCatalogSet, "set")
            : discreteQuantity ? `Quantity: ${discreteQuantity}` : "";
          finalFlavor = discreteFlavorIds
            .map((id) => nameForFlavorId(filteredFlavors, id))
            .filter(Boolean)
            .join(", ");
          
      } else {
          // Standard
          const diameter = filteredDiameters.find(
            (d: { _id: unknown }) => String(d._id) === String(standardDiameterId)
          );
          finalSize = diameter?.name || "";
          const tiersCount = diameter?.tiersCount ?? 1;
          const tierSizes: string[] =
            tiersCount > 1 && Array.isArray(diameter?.tierSizes)
              ? diameter.tierSizes
              : Array.from({ length: tiersCount }, (_, index) => `Tier ${index + 1}`);

          const allTiersSelected = Array.from(
            { length: tiersCount },
            (_, index) => tierFlavors[index]
          ).every(Boolean);

          if (standardDiameterId) {
            finalDiameterId = String(standardDiameterId);
          }

          if (tiersCount > 1) {
            if (allTiersSelected) {
              finalTiers = Array.from({ length: tiersCount }, (_, index) => {
                const flavorId = tierFlavors[index];
                const flavorDoc = filteredFlavors.find(
                  (flavor: { _id?: unknown }) => String(flavor._id) === String(flavorId)
                );
                const sizeLabel = tierSizes[index] ?? `Tier ${index + 1}`;
                return {
                  tierIndex: index,
                  sizeLabel,
                  flavorId,
                  flavorName: flavorDoc?.name,
                };
              });
              finalFlavor = finalTiers
                .map(
                  (tier) =>
                    `Tier ${tier.tierIndex + 1} (${tier.sizeLabel}): ${tier.flavorName ?? ""}`
                )
                .join(" | ");
            } else {
              finalFlavor = "";
              finalTiers = undefined;
            }
          } else {
            const flavorId = tierFlavors[0];
            finalFlavor = nameForFlavorId(filteredFlavors, flavorId) || "";
            finalTiers = undefined;
          }
      }

      const finalShape =
        isStandard && standardTiersCount <= 1
          ? allShapes.find((s) => s._id === standardShapeId)?.name || ""
          : "";

      // A category with no catalog diameters keeps whatever the customer typed.
      if (isStandard && filteredDiameters.length === 0) {
        return;
      }

      if (finalSize || sizeTouched.current) {
        setValue(ip("details.size"), finalSize, { shouldValidate: true });
      }
      if (selectedCatalogSet) {
        setValue(ip("details.setId"), String(selectedCatalogSet._id), { shouldValidate: false });
      } else if ((isDiscrete || isCombo) && sizeTouched.current) {
        setValue(ip("details.setId"), undefined, { shouldValidate: false });
      }
      if (isDiscrete || isCombo) {
        const setImage = selectedCatalogSet?.imageUrl?.trim();
        setValue(ip("details.setImageUrl"), setImage || undefined, { shouldValidate: false });
      }
      if (finalFlavor || flavorTouched.current) {
        setValue(ip("details.flavor"), finalFlavor, { shouldValidate: true });
      }
      if (finalShape || shapeTouched.current) {
        setValue(ip("details.shape"), finalShape, { shouldValidate: true });
      }

      if (isStandard && finalDiameterId) {
        setValue(ip("details.diameterId"), finalDiameterId, { shouldValidate: true });
        if (finalTiers || flavorTouched.current) {
          setValue(ip("details.tiers"), finalTiers, { shouldValidate: true });
        }
      } else if (!isStandard && sizeTouched.current) {
        setValue(ip("details.diameterId"), undefined, { shouldValidate: false });
        setValue(ip("details.tiers"), undefined, { shouldValidate: false });
      }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCombo, isDiscrete, comboPieceQuantity, comboTreatFlavorIds, comboCakeFlavorId, discreteQuantity, discreteFlavorIds, selectedCatalogSet, standardDiameterId, tierFlavors, standardShapeId, standardTiersCount, filteredFlavors, filteredDiameters, allShapes, isStandard, setValue, treatFlavors, bentoFlavors, itemIndex]);

  // Sync back local state compilation
  useEffect(() => {
      if (!selectionReady || preserveSavedEstimate.current) return;
      compilePayload();
  }, [compilePayload, selectionReady]);

  useEffect(() => {
    if (isLoading || !activeCategoryObj || selectionHydrated.current === itemIndex) return;
    if ((isDiscrete || isCombo) && (catalogSets === null || setsFailed)) return;
    selectionHydrated.current = itemIndex;

    const savedSize = String(getValues(ip("details.size")) ?? "");
    const savedFlavor = String(getValues(ip("details.flavor")) ?? "");
    const savedShape = String(getValues(ip("details.shape")) ?? "");
    const savedSetId = String(getValues(ip("details.setId")) ?? "");
    const savedDiameterId = String(getValues(ip("details.diameterId")) ?? "");
    const savedTiers = getValues(ip("details.tiers")) as CakeTierSelection[] | undefined;
    let restored = false;

    const savedPieceCount = isCombo
      ? savedSize.match(/Combo Box:\s*(\d+)/)?.[1]
      : savedSize.match(/Quantity:\s*(\d+)/)?.[1];
    const restoredSet =
      (catalogSets ?? []).find((set) => String(set._id) === savedSetId) ||
      (savedPieceCount
        ? (catalogSets ?? []).find((set) => String(set.pieceCount) === savedPieceCount)
        : undefined) ||
      (!savedSize ? catalogSets?.[0] : undefined);

    if (restoredSet && (isCombo || isDiscrete)) {
      setSelectedSetId(String(restoredSet._id));
      const pieceCount = String(restoredSet.pieceCount);
      if (isCombo) setComboPieceQuantity(pieceCount);
      else setDiscreteQuantity(pieceCount);
      restored = true;
    }

    if (isCombo) {
      if (!restoredSet) {
        const quantity = savedPieceCount;
        if (quantity) {
          setComboPieceQuantity(quantity);
          restored = true;
        }
      }
      const parsed = savedFlavor.match(/Treats:\s*\[([^\]]*)\]\.\s*Cake:\s*(.*)$/);
      if (parsed) {
        const treatIds = flavorIdsFromSavedNames(treatFlavors, parsed[1]);
        const keptTreats = restoredSet ? treatIds.slice(0, restoredSet.maxFlavors) : treatIds;
        if (keptTreats.length > 0) {
          setComboTreatFlavorIds(keptTreats);
          restored = true;
        }
        const cake = findFlavorBySavedName(bentoFlavors, parsed[2] ?? "");
        if (cake) {
          setComboCakeFlavorId(String(cake._id));
          restored = true;
        }
      }
    } else if (isDiscrete) {
      if (!restoredSet) {
        const quantity = savedPieceCount;
        if (quantity) {
          setDiscreteQuantity(quantity);
          restored = true;
        }
      }
      const flavorIds = flavorIdsFromSavedNames(filteredFlavors, savedFlavor);
      const keptFlavors = restoredSet ? flavorIds.slice(0, restoredSet.maxFlavors) : flavorIds;
      if (keptFlavors.length > 0) {
        setDiscreteFlavorIds(keptFlavors);
        restored = true;
      }
    } else if (filteredDiameters.length > 0) {
      const diameter =
        filteredDiameters.find((item: { _id: unknown }) => String(item._id) === savedDiameterId) ||
        filteredDiameters.find((item: { name?: string }) => item.name === savedSize);
      if (diameter) {
        setStandardDiameterId(String(diameter._id));
        restored = true;
        const tiersCount = diameter.tiersCount ?? 1;
        if (tiersCount > 1 && Array.isArray(savedTiers)) {
          const next: Record<number, string> = {};
          for (const tier of savedTiers) {
            if (tier?.flavorId == null) continue;
            const flavorId = String(tier.flavorId);
            const known = filteredFlavors.some(
              (flavor: { _id: unknown }) => String(flavor._id) === flavorId
            );
            if (known) next[tier.tierIndex] = flavorId;
            else if (tier.flavorName) {
              const named = findFlavorBySavedName(filteredFlavors, tier.flavorName);
              if (named?._id != null) next[tier.tierIndex] = String(named._id);
            }
          }
          if (Object.keys(next).length > 0) setTierFlavors(next);
        } else if (savedFlavor) {
          const flavor = findFlavorBySavedName(filteredFlavors, savedFlavor);
          if (flavor) setTierFlavors({ 0: String(flavor._id) });
        }
      }
      if (savedShape) {
        const shape = allShapes.find((item) => item.name === savedShape);
        if (shape) setStandardShapeId(String(shape._id));
      }
    }

    preserveSavedEstimate.current = Boolean(savedSize || savedFlavor || savedShape) && !restored;
    setSelectionReady(true);
  }, [
    isLoading,
    activeCategoryObj,
    isCombo,
    isDiscrete,
    itemIndex,
    filteredDiameters,
    filteredFlavors,
    treatFlavors,
    bentoFlavors,
    allShapes,
    catalogSets,
    setsFailed,
    getValues,
  ]);


  // Helper Handlers for Arrays (Multi Select)
  const catalogFlavorLimit = hasCatalogSets ? selectedCatalogSet?.maxFlavors ?? 1 : undefined;
  const comboTreatLimit = hasCatalogSets ? catalogFlavorLimit ?? 1 : 3;

  const selectCatalogSet = (setId: string) => {
    noteEdit("size");
    const set = catalogSets?.find((candidate) => String(candidate._id) === setId);
    setSelectedSetId(setId);
    if (!set) return;
    const pieceCount = String(set.pieceCount);
    if (isCombo) setComboPieceQuantity(pieceCount);
    else setDiscreteQuantity(pieceCount);
    const current = isCombo ? comboTreatFlavorIds : discreteFlavorIds;
    if (current.length > set.maxFlavors) {
      const kept = current.slice(0, set.maxFlavors);
      if (isCombo) setComboTreatFlavorIds(kept);
      else setDiscreteFlavorIds(kept);
      noteEdit("flavor");
      showAlert(
        `${set.name} takes up to ${set.maxFlavors} ${flavorWord(set.maxFlavors)}, so we kept your first ${set.maxFlavors}.`,
        "info"
      );
    }
  };

  const handleToggleDiscreteFlavor = (id: string) => {
     noteEdit("flavor");
     setDiscreteFlavorIds(prev => {
        if (prev.includes(id)) return prev.filter(f => f !== id);
        if (catalogFlavorLimit && prev.length >= catalogFlavorLimit) return prev;
        return [...prev, id];
     });
  };
  
  const handleToggleComboTreatFlavor = (id: string) => {
     noteEdit("flavor");
     setComboTreatFlavorIds(prev => {
        if (prev.includes(id)) return prev.filter(f => f !== id);
        if (prev.length >= comboTreatLimit) return prev;
        return [...prev, id];
     });
  };

  const handleTierFlavorSelect = (tierIndex: number, flavorId: string) => {
    noteEdit("flavor");
    setTierFlavors((prev) => ({ ...prev, [tierIndex]: flavorId }));
  };

  const isFlavorSelected = useMemo(() => {
    if (isCombo) {
      return !!comboCakeFlavorId || comboTreatFlavorIds.length > 0;
    }
    if (isDiscrete) {
      return discreteFlavorIds.length > 0;
    }
    if (standardTiersCount > 1) {
      return Array.from({ length: standardTiersCount }, (_, index) => tierFlavors[index]).every(
        Boolean
      );
    }
    return !!tierFlavors[0] || (filteredFlavors.length === 0 && !!currentFlavor);
  }, [
    isCombo,
    isDiscrete,
    comboCakeFlavorId,
    comboTreatFlavorIds,
    discreteFlavorIds,
    standardTiersCount,
    tierFlavors,
    filteredFlavors.length,
    currentFlavor,
  ]);

  if (isLoading) {
      return (
           <LoadingSpinner />
      );
  }

  const catalogSetButtons = (catalogSets ?? []).map((set) => {
    const setId = String(set._id);
    const selected = selectedSetId === setId;
    return (
      <button
        key={setId}
        type="button"
        aria-pressed={selected}
        onClick={() => selectCatalogSet(setId)}
        className={`flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
          selected
            ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
            : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground hover:shadow-sm"
        }`}
      >
        <div className="relative flex h-24 w-24 items-center justify-center pointer-events-none">
          {set.imageUrl ? (
            <Image src={set.imageUrl} alt="" fill sizes="96px" className="object-contain" />
          ) : (
            <SetBoxIcon pieceCount={set.pieceCount} className={`h-full w-full ${selected ? "text-accent" : "text-primary"}`} />
          )}
        </div>
        <p className="font-body text-body font-bold text-primary">{set.name}</p>
        <p className="text-xs text-primary/60">
          {set.pieceCount} pieces · up to {set.maxFlavors} {flavorWord(set.maxFlavors)}
        </p>
        <p className="font-body text-body font-bold text-accent">
          ${catalogSetPortion(set, basePrice)}
        </p>
      </button>
    );
  });

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
                {hasCatalogSets ? "1. Choose your set" : "1. Choose Box Size"}
              </h3>
              <p className="text-sm text-primary/60 mb-4">
                How many treats should be included alongside the mini cake?
              </p>
              {hasCatalogSets && selectedCatalogSet && (
                <p className="text-sm text-primary/60 mb-4">
                  Estimate ${comboEstimate}: cake ${basePrice} + {selectedCatalogSet.name} $
                  {catalogSetPortion(selectedCatalogSet, basePrice)}
                </p>
              )}
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {setsFailed ? (
                  <p className="text-sm text-primary/60">
                    The sets for this category could not be loaded. Go back and open this step again.
                  </p>
                ) : catalogSets === null ? (
                  <LoadingSpinner />
                ) : hasCatalogSets ? catalogSetButtons : BOX_SIZES.map((box) => (
                  <button
                    key={box.value}
                    type="button"
                    onClick={() => {
                      noteEdit("size");
                      setComboPieceQuantity(String(Number(box.value) - 1));
                    }}
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
                Choose up to {comboTreatLimit} {flavorWord(comboTreatLimit)} for the treats in your box.
              </p>
              <div className="bg-background rounded-2xl shadow-sm border p-4">
                <FlavorSelector
                  mode="multiple"
                  flavors={treatFlavors}
                  selectedIds={comboTreatFlavorIds}
                  onToggleId={handleToggleComboTreatFlavor}
                  maxSelection={comboTreatLimit}
                  hidePrice={true}
                  onInfoClick={onFlavorInfoClick}
                />
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl text-primary mb-4">
                3. Cake Flavor
              </h3>
              <div className="mb-6 flex gap-4 items-center bg-accent/5 p-4 rounded-xl border border-accent/20">
                <div className="w-16 h-16 shrink-0 bg-white rounded-lg shadow-sm flex items-center justify-center relative p-1">
                  {(() => {
                    const bentoImage = filteredDiameters.find((d: any) => d.sizeValue <= 4)?.imageUrl || filteredDiameters[0]?.imageUrl;
                    return bentoImage ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={bentoImage}
                          alt="Combo Cake"
                          fill
                          quality={90}
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <FourInchBentoIcon className="w-10 h-10 text-primary" />
                    );
                  })()}
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
                  onSelectId={(id) => {
                    noteEdit("flavor");
                    setComboCakeFlavorId(id);
                  }}
                  hidePrice={true}
                  onInfoClick={onFlavorInfoClick}
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
              {(basePrice > 0 || selectedCatalogSet) && (
                <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/40">
                      Estimate, not final
                    </p>
                    <p className="text-sm text-primary/60 mt-0.5">
                      Final after review
                    </p>
                    <p className="text-sm text-primary/60 mt-0.5">
                      {selectedCatalogSet
                        ? typeof selectedCatalogSet.basePrice === "number"
                          ? selectedCatalogSet.name
                          : `${selectedCatalogSet.pieceCount} pieces × $${basePrice} each`
                        : discreteQuantity
                          ? `${discreteQuantity} pieces × $${basePrice} each`
                          : "Select a quantity to see your price"}
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-accent tabular-nums">
                    $
                    {discretePrice > 0
                      ? discretePrice
                      : selectedCatalogSet
                        ? discretePrice
                        : basePrice * Number(BOX_SIZES[0].value)}
                  </p>
                </div>
              )}
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {setsFailed ? (
                  <p className="text-sm text-primary/60">
                    The sets for this category could not be loaded. Go back and open this step again.
                  </p>
                ) : catalogSets === null ? (
                  <LoadingSpinner />
                ) : hasCatalogSets ? catalogSetButtons : BOX_SIZES.map((box) => (
                  <button
                    key={box.value}
                    type="button"
                    onClick={() => {
                      noteEdit("size");
                      setDiscreteQuantity(box.value);
                    }}
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
                  maxSelection={catalogFlavorLimit}
                  hidePrice={true}
                  onInfoClick={onFlavorInfoClick}
                />
              </div>
              <p className="text-sm text-primary/60 mb-4">
                {catalogFlavorLimit
                  ? `Choose up to ${catalogFlavorLimit} ${flavorWord(catalogFlavorLimit)}.`
                  : "Select multiple flavors for a mixed set, or pick one."}
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
                <div data-field-name={`items.${itemIndex}.details.size`}>
                  <DiameterSelector
                    diameters={displayableDiameters}
                    selectedDiameterId={standardDiameterId}
                    onSelectDiameter={(id) => {
                      noteEdit("size");
                      noteEdit("flavor");
                      setStandardDiameterId(id);
                    }}
                  />
                  {availableShapesForDiameter.length > 0 && standardTiersCount <= 1 && (
                    <ShapeSelector
                      shapes={availableShapesForDiameter}
                      selectedShapeId={standardShapeId}
                      onChange={(id) => {
                        noteEdit("shape");
                        setStandardShapeId(id);
                      }}
                      className="mt-md"
                    />
                  )}
                </div>
              ) : (
                <div data-field-name={`items.${itemIndex}.details.size`}>
                  <h3 className="font-heading text-xl text-primary mb-2">
                    Custom Yield / Size
                  </h3>
                  <p className="text-sm text-primary/60 mb-4">
                    Describe the dimensional requirements or guest count.
                  </p>
                  <Input
                    placeholder="e.g. 15 guests, 3-tiers"
                    value={currentSize || ""} // Fallback if no DB configs exist
                    onChange={(e) => {
                      noteEdit("size");
                      setValue(ip("details.size"), e.target.value, {
                        shouldValidate: true,
                      });
                    }}
                    className="w-full max-w-sm bg-white"
                  />
                </div>
              )}
              {itemErrors?.details?.size && (
                <p className="text-primary/60 text-sm mt-3 flex items-center font-medium">
                  {" "}
                  {itemErrors.details.size.message}
                </p>
              )}
            </div>

            <div data-field-name={`items.${itemIndex}.details.flavor`}>
              {filteredFlavors.length > 0 ? (
                <div className="space-y-6">
                  {standardTiersCount > 1 ? (
                    <>
                      <div>
                        <h3 className="font-heading text-xl text-primary mb-1">
                          Choose a flavor for each tier
                        </h3>
                        <p className="text-sm text-primary/60 mb-4">
                          Select one flavor per tier. Notes about flavors can be added below once all tiers are chosen.
                        </p>
                      </div>
                      {Array.from({ length: standardTiersCount }, (_, index) => (
                        <div key={index}>
                          <h4 className="text-sm font-semibold mb-2 text-primary">
                            Tier {index + 1} ({standardTierSizes[index]})
                          </h4>
                          <div className="bg-background rounded-2xl shadow-sm border p-4">
                            <FlavorSelector
                              mode="single"
                              flavors={filteredFlavors}
                              selectedId={tierFlavors[index] ?? null}
                              onSelectId={(id) => handleTierFlavorSelect(index, id)}
                              hidePrice={true}
                              hideHeading={true}
                              onInfoClick={onFlavorInfoClick}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="bg-background rounded-2xl shadow-sm border p-4">
                      <FlavorSelector
                        mode="single"
                        flavors={filteredFlavors}
                        selectedId={tierFlavors[0] ?? null}
                        onSelectId={(id) => handleTierFlavorSelect(0, id)}
                        hidePrice={true}
                        onInfoClick={onFlavorInfoClick}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  placeholder="e.g. Vanilla Bean with Jam"
                  value={currentFlavor || ""}
                  onChange={(e) => {
                    noteEdit("flavor");
                    setValue(ip("details.flavor"), e.target.value, {
                      shouldValidate: true,
                    });
                  }}
                  className="w-full max-w-sm bg-white"
                />
              )}
              {itemErrors?.details?.flavor && (
                <p className="text-primary/60 text-sm mt-3 flex items-center font-medium">
                  {" "}
                  {itemErrors.details.flavor.message}
                </p>
              )}
            </div>
          </div>
        )}

        <FlavorNoteSection
          isVisible={isFlavorSelected && activeCategoryObj?.categoryType !== "set"}
          isMultiTier={isStandard && standardTiersCount > 1}
          itemIndex={itemIndex}
        />
        <AllergySection />
      </div>
    </div>
  );
}


function AllergySection() {
  const { setValue, watch, formState: { errors } } = useFormContext<CustomOrderRequestData>();
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

  // ARCHITECTURAL FIX: Decouple CSS transition frame timing from synchronous state updates.
  // This allows the DOM content (value="") to update in Frame 1, and the grid animation to start in Frame 2,
  // completely eliminating layout thrashing while maintaining a single source of truth.
  const [animatedYesActive, setAnimatedYesActive] = React.useState(yesActive);

  React.useEffect(() => {
    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setAnimatedYesActive(yesActive);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [yesActive]);

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


        {/* Conditional text input — CSS grid transition */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out overflow-hidden",
            animatedYesActive
              ? "grid-rows-[1fr] opacity-100 mt-4"
              : "grid-rows-[0fr] opacity-0 mt-0",
          )}
        >
          <div className="min-h-0">
            <Input
              placeholder="Please list your allergies (e.g. nuts, dairy, gluten...)"
              value={currentAllergies === "No" ? "" : (currentAllergies || "")}
              onChange={handleTextChange}
              className="w-full bg-white"
            />
          </div>
        </div>

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

function FlavorNoteSection({
  isVisible,
  isMultiTier = false,
  itemIndex,
}: {
  isVisible: boolean;
  isMultiTier?: boolean;
  itemIndex: number;
}) {
  const { setValue, watch } = useFormContext<CustomOrderRequestData>();
  const ip = (sub: string): any => `items.${itemIndex}.${sub}`;
  const currentFlavorNote = watch(ip("details.flavorNote"));

  const handleNo = () => {
    setValue(ip("details.flavorNote"), "No", { shouldValidate: true });
  };

  const handleYes = () => {
    // Switch to YES mode — clear "No" so the input shows and user must type
    if (currentFlavorNote === "No" || currentFlavorNote === undefined) {
      setValue(ip("details.flavorNote"), "", { shouldValidate: false });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(ip("details.flavorNote"), e.target.value, { shouldValidate: true });
  };

  // Determine active button
  const noActive  = currentFlavorNote === "No";
  const yesActive = currentFlavorNote !== undefined && currentFlavorNote !== "No";

  // ARCHITECTURAL FIX: Decouple CSS transition frame timing from synchronous state updates.
  const [animatedYesActive, setAnimatedYesActive] = React.useState(yesActive);

  React.useEffect(() => {
    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setAnimatedYesActive(yesActive);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [yesActive]);

  return (
    <div
      inert={!isVisible}
      aria-hidden={!isVisible}
      className={cn(
        "grid transition-all duration-300 ease-in-out overflow-hidden",
        isVisible
          ? "grid-rows-[1fr] opacity-100 mt-4"
          : "grid-rows-[0fr] opacity-0 mt-0",
      )}
    >
      <div className="min-h-0">
        <div className="pt-8 space-y-4">
          <div>
            <h3 className="font-heading text-xl text-primary mb-1">
              {isMultiTier
                ? "Any notes about your tier flavors?"
                : "Any notes about your selected flavor?"}
            </h3>
            <p className="text-sm text-primary/60 mb-4">
              {isMultiTier
                ? "Optional — one note for the whole cake (e.g. less sweet overall, or tier-specific requests in one message)."
                : "Optional — add notes like sweetness level, ingredients to include or avoid, or any special requests."}
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleNo}
                className={`w-32 h-12 text-lg rounded-xl transition-all active:scale-95 ${
                  noActive
                    ? ""
                    : "bg-white border border-primary/20 text-primary/70 hover:bg-subtleBackground"
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
                    ? ""
                    : "bg-white border border-primary/20 text-primary/70 hover:bg-subtleBackground"
                }`}
                variant={yesActive ? "primary" : "outline"}
              >
                Yes
              </Button>
            </div>

            {/* Conditional text input — CSS grid transition */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out overflow-hidden",
                animatedYesActive
                  ? "grid-rows-[1fr] opacity-100 mt-4"
                  : "grid-rows-[0fr] opacity-0 mt-0",
              )}
            >
              <div className="min-h-0">
                <Input
                  placeholder="e.g. Can it be less sweet? Or any other inquiry..."
                  value={currentFlavorNote === "No" ? "" : (currentFlavorNote || "")}
                  onChange={handleTextChange}
                  className="w-full bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
