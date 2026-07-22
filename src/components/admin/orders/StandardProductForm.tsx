"use client";

import { useState, useEffect, useMemo } from "react";
import { ProductWithCategory, Flavor, Diameter, CartItem, IShape } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { calculateUnitPrice, calculateItemPrice } from "@/utils/priceCalculator";
import { Plus } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { AddonAdminSelector } from "@/components/admin/addons/AddonAdminSelector";
import { SelectedAddon } from "@/types";
import { AdminTierFlavorEditor } from "@/components/admin/shared/AdminTierFlavorEditor";
import {
  allTierFlavorsSelected,
  buildTierSelections,
  compileCatalogFlavorLabel,
  getTierSizeLabels,
  sumFlavorUpcharges,
} from "@/lib/tierSelections";

interface StandardProductFormProps {
  product: ProductWithCategory;
  allFlavors: Flavor[]; // Global list if product-specific missing
  allDiameters: Diameter[]; // Global list
  allShapes?: IShape[]; // Active shapes for optional shape selection
  onAdd: (item: any) => void;
  onCancel: () => void;
}

export const StandardProductForm = ({
  product,
  allFlavors,
  allDiameters,
  allShapes = [],
  onAdd,
  onCancel
}: StandardProductFormProps) => {
  const { showAlert } = useAlert();
  
  // --- Local State ---
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [tierFlavorIds, setTierFlavorIds] = useState<Record<number, string>>({});
  const [selectedDiameterId, setSelectedDiameterId] = useState("");
  const [selectedShapeId, setSelectedShapeId] = useState("");
  const [qty, setQty] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");
  const [inscription, setInscription] = useState("");
  const [flavorNote, setFlavorNote] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // --- Derived Lists ---
  const availableFlavors = product.availableFlavors && Array.isArray(product.availableFlavors) && product.availableFlavors.length > 0
     ? product.availableFlavors 
     : allFlavors.filter(f => product.availableFlavorIds?.includes(f._id));

  const availableDiameters = product.availableDiameters && Array.isArray(product.availableDiameters) && product.availableDiameters.length > 0
     ? product.availableDiameters
     : allDiameters.filter(d => product.availableDiameterConfigs?.some(c => c.diameterId === d._id));

  const selectedDiameter = useMemo(
    () =>
      allDiameters.find((d) => d._id === selectedDiameterId) ||
      availableDiameters.find((d) => d._id === selectedDiameterId),
    [allDiameters, availableDiameters, selectedDiameterId]
  );

  const tiersCount = selectedDiameter?.tiersCount ?? 1;
  const isMultiTier = tiersCount > 1;
  const tierSizes = useMemo(
    () => getTierSizeLabels(selectedDiameter),
    [selectedDiameter]
  );

  // Reset tier flavors when diameter changes
  useEffect(() => {
    setTierFlavorIds({});
    if (!isMultiTier) {
      setSelectedFlavorId("");
    }
  }, [selectedDiameterId]); // eslint-disable-line react-hooks/exhaustive-deps
  const availableShapes = useMemo(() => {
      if (!selectedDiameterId) return [];
      const diam = allDiameters.find(d => d._id === selectedDiameterId)
         || availableDiameters.find(d => d._id === selectedDiameterId);
      const linkedIds = diam?.shapeIds;
      if (linkedIds && linkedIds.length > 0) {
          return allShapes.filter(s => linkedIds.includes(s._id));
      }
      return allShapes;
  }, [selectedDiameterId, allDiameters, availableDiameters, allShapes]);

  // Cascade reset: keep the selected shape valid whenever the diameter changes
  useEffect(() => {
      if (availableShapes.length === 0) {
          if (selectedShapeId) setSelectedShapeId("");
          return;
      }
      const stillValid = availableShapes.some(s => s._id === selectedShapeId);
      if (!stillValid) {
          const fallback = availableShapes.find(s => s.isDefault) || availableShapes[0];
          setSelectedShapeId(fallback?._id || "");
      }
  }, [availableShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedShapeSurcharge = availableShapes.find(s => s._id === selectedShapeId)?.priceSurcharge || 0;


  const handleAdd = () => {
      if (!selectedDiameterId) {
          showAlert("Please select a size.", "warning");
          return;
      }

      if (isMultiTier && !allTierFlavorsSelected(tiersCount, tierFlavorIds)) {
          showAlert("Please select a flavor for each tier.", "warning");
          return;
      }

      if (!isMultiTier && !selectedFlavorId && availableFlavors.length > 0) {
          showAlert("Please select a flavor.", "warning");
          return;
      }

      const tierUpcharge = isMultiTier
        ? sumFlavorUpcharges(Object.values(tierFlavorIds), availableFlavors)
        : 0;

      // Unit Price Calculation
      const unitPrice = priceOverride 
         ? parseFloat(priceOverride)
         : calculateUnitPrice({
            product,
            flavorId: isMultiTier ? undefined : selectedFlavorId,
            diameterId: selectedDiameterId,
            quantity: qty,
            availableFlavors: availableFlavors,
            inscriptionAvailable: product.inscriptionSettings?.isAvailable,
            inscriptionPrice: product.inscriptionSettings?.price,
            hasInscription: !!(inscription && product.inscriptionSettings?.isAvailable)
         }) + (isMultiTier ? tierUpcharge : 0);

      const AddonsTotal = selectedAddons.reduce((sum, d) => sum + d.price, 0);
      const finalUnitPrice = priceOverride ? unitPrice : unitPrice + AddonsTotal + (isMultiTier ? 0 : selectedShapeSurcharge);

      let flavName = availableFlavors.find(f => f._id === selectedFlavorId)?.name || "Standard";
      let tiers = undefined;

      if (isMultiTier) {
        tiers = buildTierSelections(
          tiersCount,
          tierSizes,
          tierFlavorIds,
          availableFlavors
        );
        flavName = compileCatalogFlavorLabel(tiers, tiersCount);
      }

      // Construct Payload
      const newItem = {
          id: `manual-${Date.now()}`,
          productId: product._id,
          productName: product.name,
          categoryId: product.categoryId,
          diameterId: selectedDiameterId,
          shapeId: isMultiTier ? undefined : selectedShapeId || undefined,
          name: product.name,
          flavor: flavName,
          tiers,
          flavorNote: flavorNote,
          price: finalUnitPrice,
          quantity: qty,
          imageUrl: product.imageUrls?.[0] || "",
          inscription: inscription,
          isCustom: false,
          addons: selectedAddons,
          selectedConfig: null
      };

      onAdd(newItem);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border p-4 rounded-lg bg-white relative">
        <h3 className="font-bold text-gray-700">Configure Standard Cake</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Flavor */}
             <div className={isMultiTier ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium mb-1">
                  {isMultiTier ? "Tier Flavors" : "Flavor"}
                </label>
                {isMultiTier ? (
                  <AdminTierFlavorEditor
                    tiersCount={tiersCount}
                    tierSizes={tierSizes}
                    tierFlavors={tierFlavorIds}
                    flavors={availableFlavors}
                    onTierFlavorChange={(index, id) =>
                      setTierFlavorIds((prev) => ({ ...prev, [index]: id }))
                    }
                  />
                ) : (
                <Select value={selectedFlavorId} onValueChange={setSelectedFlavorId}>
                    <SelectTrigger>
                        <SelectValue placeholder={availableFlavors.length ? "Select Flavor" : "No flavors"} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableFlavors.map(f => (
                            <SelectItem key={f._id} value={f._id}>{f.name} (+${f.price})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                )}
             </div>
             
             {/* Flavor Note */}
             <div className="md:col-span-1">
                 <label className="block text-sm font-medium mb-1">Flavor Note (Optional)</label>
                 <input 
                    value={flavorNote}
                    onChange={e => setFlavorNote(e.target.value)}
                    placeholder="e.g. less sweet, specific inquiry"
                    className="w-full p-2 border rounded-md"
                 />
             </div>

             {/* Size */}
             <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <Select value={selectedDiameterId} onValueChange={setSelectedDiameterId}>
                    <SelectTrigger>
                        <SelectValue placeholder={availableDiameters.length ? "Select Size" : "No sizes"} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableDiameters.map(d => {
                             const config = product.availableDiameterConfigs?.find(c => c.diameterId === d._id);
                             return (
                                 <SelectItem key={d._id} value={d._id}>
                                     {d.name} {config ? `(x${config.multiplier})` : ""}
                                 </SelectItem>
                             );
                        })}
                    </SelectContent>
                </Select>
             </div>

             {/* Shape (only when the selected size has shapes and is single-tier) */}
             {!isMultiTier && availableShapes.length > 0 && (
             <div>
                <label className="block text-sm font-medium mb-1">Shape</label>
                <Select value={selectedShapeId} onValueChange={setSelectedShapeId}>
                    <SelectTrigger>
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

             {/* Quantity */}
             <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input 
                    type="number" 
                    min="1" 
                    value={qty} 
                    onChange={e => setQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border rounded-md"
                />
             </div>

             {/* Price Override */}
             <div>
                 <label className="block text-sm font-medium mb-1">Price Override ($)</label>
                 <input 
                    type="number"
                    value={priceOverride}
                    onChange={e => setPriceOverride(e.target.value)}
                    placeholder="Auto-calculated"
                    className="w-full p-2 border rounded-md"
                 />
             </div>
             
             {/* Inscription */}
             <div className="md:col-span-2">
                 <label className="block text-sm font-medium mb-1">Inscription</label>
                 <input 
                    value={inscription}
                    onChange={e => setInscription(e.target.value)}
                    disabled={!product.inscriptionSettings?.isAvailable}
                    placeholder={product.inscriptionSettings?.isAvailable ? "Happy Birthday..." : "Not available"}
                    className="w-full p-2 border rounded-md disabled:bg-gray-100"
                 />
             </div>
             
             {/* Addons */}
             <div className="md:col-span-2">
                 <AddonAdminSelector 
                     categoryId={product.categoryId}
                     selectedAddons={selectedAddons}
                     onChange={setSelectedAddons}
                 />
             </div>
        </div>

        <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
            </Button>
        </div>
    </div>
  );
};
