"use client";

import { useState, useEffect, useMemo } from "react";
import { Order, Diameter, CartItem, ProductWithCategory, Flavor, IShape, CatalogSet } from "@/types";
import { addonsUnitCost } from "@/lib/addons/selectedAddonMath";
import { setLineIdentifier, setLinePrice } from "@/lib/sets/setLinePrice";
import {
  customOrderCakeFlavorName,
  findFlavorBySavedName,
  flavorIdsFromSavedNames,
} from "@/lib/sets/customOrderSets";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { calculateItemPrice, calculateUnitPrice } from "@/utils/priceCalculator";
import { AdminOrderItem } from "@/components/admin/orders/AdminOrderItem";
import { useAlert } from "@/contexts/AlertContext";
import { useParams } from "next/navigation";
import CustomOrderItemForm from "./CustomOrderItemForm";
import { ComboProductForm } from "@/components/admin/orders/ComboProductForm";
import { AddonAdminSelector } from "@/components/admin/addons/AddonAdminSelector";
import { SelectedAddon } from "@/types";
import { AdminTierFlavorEditor } from "@/components/admin/shared/AdminTierFlavorEditor";
import {
  allTierFlavorsSelected,
  buildTierSelections,
  compileCatalogFlavorLabel,
  getTierSizeLabels,
  sumFlavorUpcharges,
  tierFlavorsFromSelections,
} from "@/lib/tierSelections";

interface OrderDetailItemsProps {
  items: Order["items"];
  diameters: Diameter[];
  shapes?: IShape[];
  totalAmount: number;
  onUpdate?: () => void;
  referenceImages?: string[];
  flavorMap?: Record<string, string>;
}

const OrderDetailItems = ({
  items,
  diameters,
  shapes = [],
  totalAmount,
  onUpdate,
  referenceImages,
  flavorMap: externalFlavorMap,
}: OrderDetailItemsProps) => {
  const { showAlert } = useAlert();
  const params = useParams();
  const orderId = params.id as string;

  // --- Edit State ---
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form Data
  const [draftProduct, setDraftProduct] = useState<ProductWithCategory | null>(null);
  const [draftFlavorId, setDraftFlavorId] = useState("");
  const [draftTierFlavors, setDraftTierFlavors] = useState<Record<number, string>>({});
  const [draftDiameterId, setDraftDiameterId] = useState("");
  const [draftShapeId, setDraftShapeId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftInscription, setDraftInscription] = useState("");
  const [draftPriceOverride, setDraftPriceOverride] = useState(""); 
  const [draftSelectedConfig, setDraftSelectedConfig] = useState<any>(null);
  const [editSets, setEditSets] = useState<CatalogSet[]>([]); 
  const [draftAddons, setDraftAddons] = useState<SelectedAddon[]>([]);
  
  // Edit Context Data
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [availableFlavors, setAvailableFlavors] = useState<Flavor[]>([]);
  const [availableDiameters, setAvailableDiameters] = useState<Diameter[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);

  // Fetch Products for the Picker (only once)
  useEffect(() => {
    if (editingItem && products.length === 0) {
      fetch("/api/admin/products?context=admin")
        .then((res) => res.json())
        .then(setProducts)
        .catch(console.error);

      fetch("/api/admin/flavors").then(r => r.json()).then(setAllFlavors);
      fetch("/api/categories").then(r => r.json()).then(setAllCategories);
    }
  }, [editingItem, products.length]);


  const handleEditClick = async (item: CartItem) => {
    setEditingItem(item);
    setIsCustomMode(!!(item.productType === 'custom' || item.isCustom));
    setDraftFlavorId(""); 
    setDraftTierFlavors(item.tiers?.length ? tierFlavorsFromSelections(item.tiers) : {});
    setDraftDiameterId(item.diameterId ? item.diameterId.toString() : "");
    setDraftShapeId(item.shapeId ? item.shapeId.toString() : "");
    setDraftQuantity(item.quantity);
    setDraftInscription(item.inscription || "");
    setDraftPriceOverride(""); 
    setDraftAddons(item.addons || []);
    
    if (item.selectedConfig) {
        setDraftSelectedConfig(JSON.parse(JSON.stringify(item.selectedConfig)));
    } else {
        setDraftSelectedConfig(null);
    }

    if (item.productId) {
      try {
        const res = await fetch(`/api/products/${item.productId}`);
        if (res.ok) {
           const fullProduct: ProductWithCategory = await res.json();
           setDraftProduct(fullProduct);
           
           setAvailableFlavors(fullProduct.availableFlavors || []);
           setAvailableDiameters(diameters); 

           if (item.tiers?.length) {
             setDraftTierFlavors(tierFlavorsFromSelections(item.tiers));
           } else {
             const matchedFlavor = fullProduct.availableFlavors?.find(f => f.name === item.flavor);
             if (matchedFlavor) setDraftFlavorId(matchedFlavor._id);
           }
        }
      } catch (e) {
        console.error("Error loading product details for edit", e);
      }
    } else {
        setDraftProduct(null);
    }
  };

  const handleProductChange = async (newIds: string[]) => {
      const newId = newIds[newIds.length - 1];
      if (!newId) return;

      try {
          const res = await fetch(`/api/products/${newId}`);
          if (res.ok) {
              const fullProduct: ProductWithCategory = await res.json();
              setDraftProduct(fullProduct);
              setAvailableFlavors(fullProduct.availableFlavors || []);
              setAvailableDiameters(fullProduct.availableDiameters || []);
              setDraftFlavorId("");
              setDraftTierFlavors({});
              setDraftDiameterId("");
              setDraftShapeId("");
              setDraftPriceOverride("");
          }
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    const categoryId = draftProduct?.categoryId ? String(draftProduct.categoryId) : "";
    if (draftProduct?.productType !== "set" || !categoryId) {
      setEditSets([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/sets?categoryId=${categoryId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setEditSets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEditSets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [draftProduct?._id, draftProduct?.categoryId, draftProduct?.productType]);

  const assignedEditSets = editSets.filter((set) =>
    (draftProduct?.availableSetConfigs ?? []).some((config) => String(config.setId) === String(set._id))
  );
  const selectedEditSet = assignedEditSets.find(
    (set) => String(set._id) === String(draftSelectedConfig?.setId)
  );
  const chosenFlavorCount = new Set(
    (draftSelectedConfig?.items ?? [])
      .filter((entry: { count?: number }) => (entry.count ?? 0) > 0)
      .map((entry: { flavorId?: string }) => String(entry.flavorId))
  ).size;

  const draftDiameter = diameters.find((d) => d._id === draftDiameterId);
  const draftTiersCount = draftDiameter?.tiersCount ?? (editingItem?.tiers?.length ?? 1);
  const isDraftMultiTier = draftTiersCount > 1;
  const draftTierSizes = useMemo(
    () =>
      editingItem?.tiers?.length && editingItem.tiers.length > 1 && draftDiameterId === editingItem.diameterId?.toString()
        ? editingItem.tiers.map((t) => t.sizeLabel)
        : getTierSizeLabels(draftDiameter),
    [editingItem?.tiers, editingItem?.diameterId, draftDiameter, draftDiameterId]
  );

  const draftTierUpcharge = isDraftMultiTier
    ? sumFlavorUpcharges(Object.values(draftTierFlavors), availableFlavors)
    : 0;

  const currentUnitCost = draftProduct
    ? (draftProduct.productType === 'set' && draftSelectedConfig)
        ? setLinePrice(draftProduct, setLineIdentifier(draftSelectedConfig), {
            match: "label",
            missingBox: "zeroBox",
            rounding: "none",
            cakeFlavorPrice: draftSelectedConfig.cake?.flavorId
              ? availableFlavors.find(f => f._id === draftSelectedConfig.cake?.flavorId)?.price || undefined
              : undefined,
          }).price
        : calculateUnitPrice({
            product: draftProduct,
            flavorId: isDraftMultiTier ? undefined : draftFlavorId,
            diameterId: draftDiameterId,
            quantity: draftQuantity,
            availableFlavors,
            inscriptionAvailable: draftProduct.inscriptionSettings?.isAvailable,
            inscriptionPrice: draftProduct.inscriptionSettings?.price,
            hasInscription: !!draftInscription,
          }) + draftTierUpcharge
    : 0;

  // Shapes linked to the drafted diameter (fallback to all active shapes; hidden for multi-tier)
  const availableShapes = useMemo(() => {
      if (!draftDiameterId || isDraftMultiTier) return [];
      const diam = diameters.find(d => d._id === draftDiameterId);
      const linkedIds = diam?.shapeIds;
      if (linkedIds && linkedIds.length > 0) {
          return shapes.filter(s => linkedIds.includes(s._id));
      }
      return shapes;
  }, [draftDiameterId, diameters, shapes, isDraftMultiTier]);

  // Cascade reset: keep the drafted shape valid when the diameter changes
  useEffect(() => {
      if (availableShapes.length === 0) {
          if (draftShapeId) setDraftShapeId("");
          return;
      }
      const stillValid = availableShapes.some(s => s._id === draftShapeId);
      if (!stillValid) {
          const fallback = availableShapes.find(s => s.isDefault) || availableShapes[0];
          setDraftShapeId(fallback?._id || "");
      }
  }, [availableShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentShapeSurcharge = availableShapes.find(s => s._id === draftShapeId)?.priceSurcharge || 0;

  const currentAddonsTotal = addonsUnitCost(draftAddons);
  const currentTotalUnitCost = currentUnitCost + currentAddonsTotal + currentShapeSurcharge;
    
  const handleSaveChanges = async () => {
    if (!editingItem) return;

    if (isDraftMultiTier && !allTierFlavorsSelected(draftTiersCount, draftTierFlavors)) {
      showAlert("Please select a flavor for each tier.", "warning");
      return;
    }

    setIsSaving(true);
    
    try {
        const isSet = draftProduct?.productType === 'set';
        const baseUnit = draftPriceOverride
            ? parseFloat(draftPriceOverride)
            : currentUnitCost + (isSet || isDraftMultiTier ? 0 : currentShapeSurcharge);

        let standardFlavorFields: Partial<CartItem> = {};

        if (isDraftMultiTier) {
          const tiers = buildTierSelections(
            draftTiersCount,
            draftTierSizes,
            draftTierFlavors,
            availableFlavors
          );
          standardFlavorFields = {
            flavor: compileCatalogFlavorLabel(tiers, draftTiersCount),
            tiers,
            diameterId: draftDiameterId,
            shapeId: undefined,
            selectedConfig: undefined,
          };
        } else {
          standardFlavorFields = {
            flavor: availableFlavors.find(f => f._id === draftFlavorId)?.name || (draftProduct ? "Standard" : editingItem.flavor),
            tiers: undefined,
            diameterId: draftDiameterId,
            shapeId: draftShapeId || undefined,
            selectedConfig: undefined,
          };
        }
        
        const updatedItem: CartItem = {
            ...editingItem,
            productId: draftProduct?._id, 
            categoryId: draftProduct?.categoryId,
            name: draftProduct?.name || editingItem.name,
            quantity: draftQuantity,
            inscription: draftInscription,
            price: baseUnit, 
            imageUrl: draftProduct?.imageUrls?.[0] || editingItem.imageUrl,
            rowTotal: baseUnit * draftQuantity,
            ...(isSet ? {
                flavor: isSet ? `Set: ${draftSelectedConfig?.quantityConfigId}` : "Set Product", 
                selectedConfig: draftSelectedConfig,
                shapeId: undefined,
                tiers: undefined,
            } : standardFlavorFields),
            addons: draftAddons
        };
        
        const newItems = items.map(i => i.id === editingItem.id ? updatedItem : i);
        
        const newTotalAmount = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        const res = await fetch(`/api/admin/orders/${orderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: newItems,
                totalAmount: newTotalAmount
            })
        });

        if (!res.ok) throw new Error("Failed to update order items");
        
        showAlert("Item updated successfully", "success");
        setEditingItem(null);
        if (onUpdate) onUpdate();

    } catch (e) {
        console.error(e);
        showAlert("Failed to save changes", "error");
    } finally {
        setIsSaving(false);
    }
  };

  // Helper for Set Editing
  const handleConfigFlavorChange = (flavorId: string, delta: number) => {
      if (!draftSelectedConfig) return;
      const currentItems = draftSelectedConfig.items || [];
      const flavorIndex = currentItems.findIndex((i: any) => i.flavorId === flavorId);
      
      let newItems = [...currentItems];
      if (flavorIndex > -1) {
          const newCount = newItems[flavorIndex].count + delta;
          if (newCount <= 0) {
              newItems.splice(flavorIndex, 1);
          } else {
              newItems[flavorIndex].count = newCount;
          }
      } else if (delta > 0) {
          newItems.push({ flavorId, count: delta });
      }
      
      setDraftSelectedConfig({ ...draftSelectedConfig, items: newItems });
  };
  
  const handleBentoChange = (field: string, value: string) => {
      if (!draftSelectedConfig?.cake) return;
      setDraftSelectedConfig({
          ...draftSelectedConfig,
          cake: { ...draftSelectedConfig.cake, [field]: value }
      });
  };


  // --- Data for Rendering ---
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({});

  useEffect(() => {
      fetch("/api/admin/flavors")
        .then(res => res.json())
        .then((flavors: Flavor[]) => {
            const map: Record<string, string> = {};
            flavors.forEach(f => map[f._id] = f.name);
            setFlavorMap(map);
            setAllFlavors(flavors);
        })
        .catch(err => console.warn(err));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-primary">Line items</h2>
      <div className="flex flex-col">
        {(() => {
            const orderSubtotal = items.reduce((sum, it) => sum + (it.rowTotal || (it.price * it.quantity)), 0);
            const totalDiscount = Math.max(0, orderSubtotal - totalAmount);
            const discountedItemsSubtotal = items.filter(it => it.discountId || it.discountName).reduce((sum, it) => sum + (it.rowTotal || (it.price * it.quantity)), 0);

            const getDiscountedLineTotal = (item: CartItem) => {
                const itemBaseTotal = item.rowTotal || (item.price * item.quantity);
                if (totalDiscount <= 0.01) return itemBaseTotal;
                
                if (item.discountId || item.discountName) {
                    if (discountedItemsSubtotal > 0) {
                         return itemBaseTotal - (totalDiscount * (itemBaseTotal / discountedItemsSubtotal));
                    }
                } else if (discountedItemsSubtotal === 0) {
                    return itemBaseTotal - (totalDiscount * (itemBaseTotal / orderSubtotal));
                }
                return itemBaseTotal;
            };

            return items.map((item) => (
                <AdminOrderItem
                    key={item.id || item.productId?.toString() || Math.random().toString()}
                    item={item}
                    flavorMap={externalFlavorMap || flavorMap}
                    diameters={diameters}
                    shapes={shapes}
                    onEdit={handleEditClick}
                    referenceImages={referenceImages}
                    discountedLineTotal={getDiscountedLineTotal(item)}
                />
            ));
        })()}
      </div>
      <div className="mt-4 border-t border-primary/10 pt-4 text-right">
        <p className="font-body text-lg font-bold text-primary">
          Total: ${totalAmount.toFixed(2)}
        </p>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl border-primary/15 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-h-[88vh] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl lg:max-w-3xl [&>button]:hidden">
            <header className="flex shrink-0 items-start gap-3 border-b border-primary/10 px-4 py-3.5 sm:px-6 sm:py-4">
                <div className="min-w-0 flex-1 space-y-2">
                    <DialogTitle className="min-w-0 break-words text-left">Edit Item</DialogTitle>
                    <p className="min-w-0 break-words text-sm text-primary/70">{editingItem?.name}</p>
                    {editingItem && (
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Label className="text-xs font-bold uppercase text-primary/50">
                                {isCustomMode ? "Custom Mode" : "Standard Mode"}
                            </Label>
                            <Button
                                variant={isCustomMode ? "default" : "outline"}
                                onClick={() => setIsCustomMode(!isCustomMode)}
                                className={isCustomMode ? "h-11 rounded-xl border-accent bg-accent px-4 sm:h-10" : "h-11 rounded-xl px-4 sm:h-10"}
                            >
                                Switch to {isCustomMode ? "Standard" : "Custom"}
                            </Button>
                        </div>
                    )}
                </div>
                <DialogClose
                    aria-label="Close"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 text-primary transition-colors hover:bg-background/60 sm:h-10 sm:w-10"
                >
                    <X className="h-4 w-4 shrink-0" />
                </DialogClose>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            
             {editingItem?.isCombo === true ? (
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
                  <ComboProductForm
                    pinnedActions
                    insetSafeArea={isCustomMode}
                    allCategories={allCategories}
                    allFlavors={allFlavors}
                    allDiameters={diameters}
                    initialValues={editingItem}
                    onAdd={(updatedItem) => {
                         const newItem = {
                             ...editingItem,
                             ...updatedItem,
                             id: editingItem.id
                         };
                         const newItems = items.map(i => i.id === editingItem.id ? newItem : i);
                         const newTotalAmount = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                         
                         setIsSaving(true);
                         fetch(`/api/admin/orders/${orderId}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: newItems, totalAmount: newTotalAmount })
                         })
                         .then(res => {
                             if(!res.ok) throw new Error("Failed");
                             showAlert("Combo Item Updated", "success");
                             setEditingItem(null);
                             if (onUpdate) onUpdate();
                         })
                         .catch(err => {
                             console.error(err);
                             showAlert("Failed to update", "error");
                         })
                         .finally(() => setIsSaving(false));
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                </div>
            ) : editingItem && isCustomMode ? (
                  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
                      <CustomOrderItemForm 
                         flavors={allFlavors} 
                         diameters={diameters}
                         shapes={shapes}
                        submitLabel="Save Changes"
                        pinnedActions
                        
                        initialValues={{
                            id: editingItem.id,
                            price: editingItem.price,
                            quantity: editingItem.quantity,
                            images: editingItem.imageUrls?.length
                              ? editingItem.imageUrls
                              : editingItem.imageUrl
                                ? [editingItem.imageUrl]
                                : referenceImages?.length
                                  ? referenceImages
                                  : [],
                            selectedImage: editingItem.imageUrl || "",
                            sizeValue: editingItem.customSize || (editingItem.diameterId ? editingItem.diameterId.toString() : "") || "",
                            flavorValue: editingItem.customFlavor || (editingItem.selectedConfig?.cake?.flavorId) || editingItem.flavor || "", 
                            tiers: editingItem.tiers,
                            shapeId: (editingItem.shapeId || editingItem.selectedConfig?.cake?.shapeId)?.toString() || "",
                            designInstructions: editingItem.designInstructions || "",
                            inscription: editingItem.inscription || "",
                            addons: editingItem.addons || [],
                            categoryId: editingItem.categoryId || "",
                        }}
                        onSubmit={(newItem) => {
                             const flavorText = String(newItem.customFlavor || newItem.flavor || "");
                             const category = allCategories.find(
                               (entry) => String(entry._id) === String(newItem.categoryId || editingItem.categoryId)
                             );
                             const categoryType =
                               category?.categoryType === "combo" || flavorText.includes("Treats:")
                                 ? "combo"
                                 : category?.categoryType === "set" || flavorText.includes(",")
                                   ? "set"
                                   : "single";
                             const updatedItem = {
                                 ...editingItem,
                                 ...newItem,
                                 id: editingItem.id,
                             };
                             if (
                               editingItem.selectedConfig &&
                               (categoryType === "set" || categoryType === "combo")
                             ) {
                               const treatSource =
                                 categoryType === "combo"
                                   ? flavorText.match(/Treats:\s*\[([^\]]*)\]/)?.[1] ?? ""
                                   : flavorText;
                               const treatIds = flavorIdsFromSavedNames(allFlavors, treatSource);
                               const nextConfig = {
                                 ...editingItem.selectedConfig,
                                 items: treatIds.map((flavorId) => ({ flavorId, count: 1 })),
                               };
                               if (categoryType === "combo") {
                                 const cake = findFlavorBySavedName(
                                   allFlavors,
                                   customOrderCakeFlavorName(flavorText) ?? ""
                                 );
                                 nextConfig.cake = {
                                   ...(editingItem.selectedConfig.cake ?? { diameterId: "" }),
                                   flavorId: cake?._id != null
                                     ? String(cake._id)
                                     : editingItem.selectedConfig.cake?.flavorId || "",
                                   diameterId: editingItem.selectedConfig.cake?.diameterId || "",
                                 };
                               }
                               updatedItem.selectedConfig = nextConfig;
                               updatedItem.customFlavor = flavorText;
                             }
                             const newItems = items.map(i => i.id === editingItem.id ? updatedItem : i);
                             const newTotalAmount = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                             
                             setIsSaving(true);
                             fetch(`/api/admin/orders/${orderId}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ items: newItems, totalAmount: newTotalAmount })
                             })
                             .then(res => {
                                 if(!res.ok) throw new Error("Failed");
                                 showAlert("Custom Item Updated", "success");
                                 setEditingItem(null);
                                 if (onUpdate) onUpdate();
                             })
                             .catch(err => {
                                 console.error(err);
                                 showAlert("Failed to update", "error");
                             })
                             .finally(() => setIsSaving(false));
                        }}
                        onCancel={() => setEditingItem(null)}
                     />
                 </div>
            ) : editingItem && !isCustomMode && (
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                    {/* Common Product Selection (Caution advised changing this mid-edit) */}
                    <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                        <Label>Product Context (Read Only logic preferred but picker kept for swapping)</Label>
                        <ProductPicker 
                            availableProducts={products}
                            selectedIds={draftProduct ? [draftProduct._id] : []}
                            onChange={handleProductChange}
                            themeColor="#D4A373"
                        />
                    </div>

                    {/* POLYMORPHIC FORM */}
                    {draftProduct?.productType === 'set' ? (
                        <>
                        <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                            <h3 className="font-bold text-accent">Edit Set Configuration</h3>
                            
                            {/* Box Size */}
                            <div>
                                <Label>{assignedEditSets.length > 0 ? "Set" : "Box Size (Quantity Config)"}</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="Custom piece count"
                                    className="h-11 rounded-xl bg-white sm:h-10 sm:w-40"
                                    onChange={(e) => {
                                      const count = e.target.value;
                                      if (!count) return;
                                      setDraftSelectedConfig({
                                        ...draftSelectedConfig,
                                        setId: undefined,
                                        setName: undefined,
                                        pieceCount: count ? Number(count) : undefined,
                                        quantityConfigId: count,
                                      });
                                    }}
                                  />
                                  <Select 
                                    value={draftSelectedConfig?.setId || draftSelectedConfig?.quantityConfigId} 
                                    onValueChange={(val) => {
                                      const set = assignedEditSets.find((candidate) => String(candidate._id) === val);
                                      if (set) {
                                        setDraftSelectedConfig({
                                          ...draftSelectedConfig,
                                          setId: String(set._id),
                                          setName: set.name,
                                          pieceCount: set.pieceCount,
                                          quantityConfigId: set.name,
                                        });
                                        return;
                                      }
                                      setDraftSelectedConfig({
                                        ...draftSelectedConfig,
                                        setId: undefined,
                                        setName: undefined,
                                        pieceCount: undefined,
                                        quantityConfigId: val,
                                      });
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-white sm:h-10">
                                        <SelectValue placeholder={assignedEditSets.length > 0 ? "Select a set" : "Select Size"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignedEditSets.length > 0
                                          ? assignedEditSets.map((set) => (
                                              <SelectItem key={String(set._id)} value={String(set._id)}>
                                                {set.name} ({set.pieceCount} pieces)
                                              </SelectItem>
                                            ))
                                          : draftProduct.availableQuantityConfigs?.map(c => (
                                              <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                                            ))}
                                        {draftSelectedConfig?.quantityConfigId &&
                                          !assignedEditSets.some((set) => set.name === draftSelectedConfig.quantityConfigId || String(set._id) === draftSelectedConfig.setId) &&
                                          !draftProduct.availableQuantityConfigs?.some((config) => config.label === draftSelectedConfig.quantityConfigId) && (
                                            <SelectItem value={draftSelectedConfig.quantityConfigId}>
                                              {draftSelectedConfig.quantityConfigId}
                                            </SelectItem>
                                          )}
                                    </SelectContent>
                                </Select>
                                </div>
                                {selectedEditSet && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    This set allows up to {selectedEditSet.maxFlavors}{" "}
                                    {selectedEditSet.maxFlavors === 1 ? "flavor" : "flavors"}.
                                    {chosenFlavorCount > selectedEditSet.maxFlavors
                                      ? ` ${chosenFlavorCount} are chosen.`
                                      : " You can choose more."}
                                  </p>
                                )}
                            </div>
                        </div>

                            <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                                <Label>Treat Flavors Distribution</Label>
                                <div className="mt-2 grid max-h-60 min-w-0 grid-cols-1 gap-2 overflow-y-auto overscroll-contain rounded-xl border border-primary/10 bg-background/60 p-2 sm:grid-cols-2">
                                    {availableFlavors.map(f => {
                                        const count = draftSelectedConfig?.items?.find((i: any) => i.flavorId === f._id)?.count || 0;
                                        return (
                                            <div key={f._id} className="flex min-w-0 items-center justify-between gap-2 border-b border-primary/10 p-2">
                                                <span className="min-w-0 flex-1 break-words text-sm">{f.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <Button className="h-11 w-11 shrink-0 rounded-xl p-0 sm:h-10 sm:w-10" variant="outline" aria-label="Remove one flavor" onClick={() => handleConfigFlavorChange(f._id, -1)}>-</Button>
                                                    <span className="w-6 text-center font-bold">{count}</span>
                                                    <Button className="h-11 w-11 shrink-0 rounded-xl p-0 sm:h-10 sm:w-10" variant="outline" aria-label="Add one flavor" onClick={() => handleConfigFlavorChange(f._id, 1)}>+</Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Bento Details */}
                            {draftProduct.comboConfig?.hasCake && (
                                <div className="p-3 border rounded bg-white mt-2">
                                    <Label className="uppercase text-xs font-bold text-gray-500">Bento Cake Details</Label>
                                <div className="mt-2 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Cake Flavor</Label>
                                            <Select 
                                                value={draftSelectedConfig?.cake?.flavorId} 
                                                onValueChange={(val) => handleBentoChange('flavorId', val)}
                                            >
                                                <SelectTrigger className="h-11 rounded-xl sm:h-10">
                                                    <SelectValue placeholder="Select Flavor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableFlavors.map(f => (
                                                        <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Inscription</Label>
                                            <Input 
                                                className="h-11 rounded-xl sm:h-10"
                                                value={draftSelectedConfig?.cake?.inscription || ""}
                                                onChange={(e) => handleBentoChange('inscription', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </>
                    ) : (
                        /* STANDARD CAKE FORM */
                        <>
                        <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                             <div className="space-y-2">
                                 <Label>{isDraftMultiTier ? "Tier Flavors" : "Flavor"}</Label>
                                 {isDraftMultiTier ? (
                                   <AdminTierFlavorEditor
                                     tiersCount={draftTiersCount}
                                     tierSizes={draftTierSizes}
                                     tierFlavors={draftTierFlavors}
                                     flavors={availableFlavors}
                                     onTierFlavorChange={(index, id) =>
                                       setDraftTierFlavors((prev) => ({ ...prev, [index]: id }))
                                     }
                                   />
                                 ) : (
                                 <Select value={draftFlavorId} onValueChange={setDraftFlavorId} disabled={!draftProduct || availableFlavors.length === 0}>
                                    <SelectTrigger className="h-11 rounded-xl sm:h-10">
                                        <SelectValue placeholder="Select Flavor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFlavors.map(f => (
                                            <SelectItem key={f._id} value={f._id}>{f.name} (+${f.price})</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                                 )}
                             </div>
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:grid-cols-2 sm:p-4">
                             <div className="space-y-2">
                                 <Label>Size</Label>
                                 <Select
                                   value={draftDiameterId}
                                   onValueChange={(val) => {
                                     setDraftDiameterId(val);
                                     const diam = diameters.find((d) => d._id === val);
                                     if ((diam?.tiersCount ?? 1) <= 1) {
                                       setDraftTierFlavors({});
                                     }
                                   }}
                                   disabled={!draftProduct || availableDiameters.length === 0}
                                 >
                                    <SelectTrigger className="h-11 rounded-xl sm:h-10">
                                        <SelectValue placeholder="Select Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDiameters.map(d => (
                                            <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                             </div>

                             {availableShapes.length > 0 && (
                             <div className="space-y-2">
                                 <Label>Shape</Label>
                                 <Select value={draftShapeId} onValueChange={setDraftShapeId}>
                                    <SelectTrigger className="h-11 rounded-xl sm:h-10">
                                        <SelectValue placeholder="Select Shape" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableShapes.map(s => (
                                            <SelectItem key={s._id} value={s._id}>
                                                {s.name}{s.priceSurcharge > 0 ? ` (+$${s.priceSurcharge})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                             </div>
                             )}
                        </div>
                        </>
                    )}

                    {/* Common Fields */}
                    <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                         <div className="space-y-2">
                             <Label>Quantity</Label>
                             <Input 
                                className="h-11 rounded-xl sm:h-10"
                                type="number" 
                                min="1" 
                                value={draftQuantity} 
                                onChange={e => setDraftQuantity(parseInt(e.target.value) || 1)} 
                             />
                         </div>
                    </div>
                    <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                         <div className="space-y-2">
                             <Label>Unit Price Override ($)</Label>
                             <Input 
                                className="h-11 rounded-xl sm:h-10"
                                type="number" 
                                placeholder={`Calc: $${currentTotalUnitCost.toFixed(2)}`}
                                value={draftPriceOverride} 
                                onChange={e => setDraftPriceOverride(e.target.value)} 
                             />
                             <p className="text-xs text-muted-foreground">Standard: ${currentTotalUnitCost.toFixed(2)} (incl. Addons)</p>
                         </div>
                    </div>

                    <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                        <Label>Global Inscription / Notes</Label>
                        <Input 
                            className="h-11 rounded-xl sm:h-10"
                            value={draftInscription} 
                            onChange={e => setDraftInscription(e.target.value)}
                            placeholder="Optional notes or inscription…"
                        />
                        <AddonAdminSelector 
                            categoryId={draftProduct?.categoryId}
                            selectedAddons={draftAddons}
                            onChange={setDraftAddons}
                        />
                    </div>
                </div>
            )}

            {!isCustomMode && (
            <DialogFooter className="shrink-0 border-t border-primary/10 bg-background/95 px-4 py-3 backdrop-blur-md pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:py-4 sm:pb-4">
                <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-words font-bold text-lg">New Total: ${(draftQuantity * (draftPriceOverride ? parseFloat(draftPriceOverride) : currentTotalUnitCost)).toFixed(2)}</p>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" className="h-11 rounded-xl sm:h-10" onClick={() => setEditingItem(null)}>Cancel</Button>
                        <Button className="h-11 rounded-xl sm:h-10" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? "Saving…" : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogFooter>
            )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailItems;
