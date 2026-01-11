"use client";

import { useState, useEffect } from "react";
import { ProductWithCategory, Flavor, Diameter, CartItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { calculateUnitPrice, calculateItemPrice } from "@/utils/priceCalculator";
import { Plus } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

interface StandardProductFormProps {
  product: ProductWithCategory;
  allFlavors: Flavor[]; // Global list if product-specific missing
  allDiameters: Diameter[]; // Global list
  onAdd: (item: any) => void;
  onCancel: () => void;
}

export const StandardProductForm = ({
  product,
  allFlavors,
  allDiameters,
  onAdd,
  onCancel
}: StandardProductFormProps) => {
  const { showAlert } = useAlert();
  
  // --- Local State ---
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [selectedDiameterId, setSelectedDiameterId] = useState("");
  const [qty, setQty] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");
  const [inscription, setInscription] = useState("");

  // --- Derived Lists ---
  const availableFlavors = product.availableFlavors && Array.isArray(product.availableFlavors) && product.availableFlavors.length > 0
     ? product.availableFlavors 
     : allFlavors.filter(f => product.availableFlavorIds?.includes(f._id));

  const availableDiameters = product.availableDiameters && Array.isArray(product.availableDiameters) && product.availableDiameters.length > 0
     ? product.availableDiameters
     : allDiameters.filter(d => product.availableDiameterConfigs?.some(c => c.diameterId === d._id));


  const handleAdd = () => {
      if (!selectedDiameterId) {
          showAlert("Please select a size.", "warning");
          return;
      }

      // Unit Price Calculation
      const unitPrice = priceOverride 
         ? parseFloat(priceOverride)
         : calculateUnitPrice({
            product,
            flavorId: selectedFlavorId,
            diameterId: selectedDiameterId,
            quantity: qty,
            availableFlavors: availableFlavors,
            inscriptionAvailable: product.inscriptionSettings?.isAvailable,
            inscriptionPrice: product.inscriptionSettings?.price,
            hasInscription: !!(inscription && product.inscriptionSettings?.isAvailable)
         });

      const flavName = availableFlavors.find(f => f._id === selectedFlavorId)?.name || "Standard";

      // Construct Payload
      const newItem = {
          id: `manual-${Date.now()}`,
          productId: product._id,
          productName: product.name,
          categoryId: product.categoryId,
          diameterId: selectedDiameterId,
          name: product.name,
          flavor: flavName,
          price: unitPrice,
          quantity: qty,
          imageUrl: product.imageUrls?.[0] || "",
          inscription: inscription,
          isCustom: false,
          // Explicit nulls for strict typing
          selectedConfig: null
      };

      onAdd(newItem);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border p-4 rounded-lg bg-white relative">
        <h3 className="font-bold text-gray-700">Configure Standard Cake</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Flavor */}
             <div>
                <label className="block text-sm font-medium mb-1">Flavor</label>
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
