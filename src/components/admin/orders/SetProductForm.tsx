"use client";

import { useState } from "react";
import { ProductWithCategory, Flavor, CartItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Plus, Minus } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

interface SetProductFormProps {
  product: ProductWithCategory;
  allFlavors: Flavor[];
  onAdd: (item: any) => void;
  onCancel: () => void;
}

export const SetProductForm = ({
  product,
  allFlavors,
  onAdd,
  onCancel
}: SetProductFormProps) => {
  const { showAlert } = useAlert();
  
  // Identifiers
  const isCombo = product.productType === 'set' && product.comboConfig?.hasCake;

  // --- State ---
  // 1. Box Size (Quantity Config)
  const [selectedQtyConfigId, setSelectedQtyConfigId] = useState<string>(""); 
  
  // 2. Flavor Distribution: { flavorId: count }
  const [flavorCounts, setFlavorCounts] = useState<Record<string, number>>({});
  
  // 3. Combo Specifics
  const [comboFlavorId, setComboFlavorId] = useState("");
  const [comboInscription, setComboInscription] = useState("");
  
  // 4. General
  const [qty, setQty] = useState(1); // How many SETS
  const [priceOverride, setPriceOverride] = useState("");

  // Helpers
  const selectedConfig = product.availableQuantityConfigs?.find(c => c.label === selectedQtyConfigId || c._id === selectedQtyConfigId);
  const maxItemsPerBox = selectedConfig?.quantity || 0;
  
  const currentTotalItems = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
  const remainingItems = maxItemsPerBox - currentTotalItems;

  const availableFlavors = product.availableFlavors && Array.isArray(product.availableFlavors) && product.availableFlavors.length > 0
    ? product.availableFlavors
    : allFlavors.filter(f => product.availableFlavorIds?.includes(f._id));

  // Handlers
  const handleIncrementFlavor = (flavorId: string) => {
      if (remainingItems <= 0) return;
      setFlavorCounts(prev => ({
          ...prev,
          [flavorId]: (prev[flavorId] || 0) + 1
      }));
  };

  const handleDecrementFlavor = (flavorId: string) => {
      setFlavorCounts(prev => {
          const newCount = (prev[flavorId] || 0) - 1;
          if (newCount <= 0) {
              const copy = { ...prev };
              delete copy[flavorId];
              return copy;
          }
          return { ...prev, [flavorId]: newCount };
      });
  };

  const handleAddSet = () => {
       if (!selectedQtyConfigId || !selectedConfig) {
           showAlert("Please select a box size.", "warning");
           return;
       }
       if (remainingItems !== 0) {
           showAlert(`Please select exactly ${maxItemsPerBox} items (Remaining: ${Math.abs(remainingItems)})`, "warning");
           return;
       }
       if (isCombo && !comboFlavorId) {
           showAlert("Please select a Bento Cake flavor.", "warning");
           return;
       }

      let calculatedPrice = selectedConfig.price;
      
       const finalPrice = priceOverride ? parseFloat(priceOverride) : calculatedPrice;

       // Construct `items` array
       const selectedItemsArray = Object.entries(flavorCounts).map(([fId, count]) => ({
           flavorId: fId,
           count
       }));

       const newItem = {
           id: `manual-${Date.now()}`,
           productId: product._id,
           productName: product.name,
           categoryId: product.categoryId,
           name: product.name,
           flavor: isCombo 
             ? `Combo: ${selectedQtyConfigId} + Bento` 
             : `Set: ${selectedQtyConfigId}`,
           price: finalPrice,
           quantity: qty,
           imageUrl: product.imageUrls?.[0] || "",
           isCustom: false,
           
           // POLYMORPHIC DATA
           selectedConfig: {
               quantityConfigId: selectedConfig.label, // Label is ID
               items: selectedItemsArray,
               cake: isCombo ? {
                   flavorId: comboFlavorId,
                   diameterId: "4-inch-fixed", // Virtual ID
                   inscription: comboInscription
               } : undefined
           }
       };
       
       onAdd(newItem);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 border p-6 rounded-lg bg-gray-50 relative">
        <h3 className="font-bold text-gray-800 text-lg flex items-center justify-between">
            <span>Configure {isCombo ? "Combo Set" : "Box Set"}</span>
            <span className="text-xs bg-accent text-white px-2 py-1 rounded">New</span>
        </h3>

        {/* 1. Box Size */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Box Size / Quantity</label>
            <Select value={selectedQtyConfigId} onValueChange={(val) => {
                setSelectedQtyConfigId(val);
                setFlavorCounts({}); // Reset counts on size change
            }}>
                <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Select Box Size" />
                </SelectTrigger>
                <SelectContent>
                    {product.availableQuantityConfigs?.map(c => (
                        <SelectItem key={c.label} value={c.label}>
                            {c.label} ({c.quantity} items) - ${c.price}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* 2. Flavor Distributor */}
        {selectedQtyConfigId && (
            <div className="bg-white p-4 rounded-md border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">Distribute Flavors</label>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${remainingItems === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {remainingItems === 0 ? "Box Full" : `${remainingItems} remaining`}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                    {availableFlavors.map(f => {
                         const count = flavorCounts[f._id] || 0;
                         return (
                             <div key={f._id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                 <span className="text-sm truncate mr-2" title={f.name}>{f.name}</span>
                                 <div className="flex items-center gap-2">
                                     <button 
                                        type="button"
                                        onClick={() => handleDecrementFlavor(f._id)}
                                        className="h-6 w-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                                        disabled={count === 0}
                                     >
                                        <Minus className="w-3 h-3" />
                                     </button>
                                     <span className="w-4 text-center text-sm font-bold">{count}</span>
                                     <button 
                                        type="button"
                                        onClick={() => handleIncrementFlavor(f._id)}
                                        className="h-6 w-6 flex items-center justify-center rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                                        disabled={remainingItems <= 0}
                                     >
                                        <Plus className="w-3 h-3" />
                                     </button>
                                 </div>
                             </div>
                         );
                    })}
                </div>
            </div>
        )}

        {/* 3. Combo Details */}
        {isCombo && (
            <div className="bg-white p-4 rounded-md border border-dotted border-accent/50">
                <span className="text-xs font-bold text-accent uppercase tracking-wide mb-2 block">
                    + Bento Cake Configuration
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Cake Flavor</label>
                        <Select value={comboFlavorId} onValueChange={setComboFlavorId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Cake Flavor" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableFlavors.map(f => (
                                    <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Cake Inscription</label>
                        <input 
                            value={comboInscription}
                            onChange={e => setComboInscription(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Optional..."
                        />
                    </div>
                </div>
            </div>
        )}

        {/* 4. Quantity & Price */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
                 <label className="block text-sm font-medium mb-1">Order Qty (Sets)</label>
                 <input 
                    type="number"
                    min="1"
                    value={qty}
                    onChange={e => setQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border rounded-md"
                 />
            </div>
            <div>
                 <label className="block text-sm font-medium mb-1">Total Price ($)</label>
                 <input 
                    type="number"
                    value={priceOverride}
                    onChange={e => setPriceOverride(e.target.value)}
                    placeholder={`Default: $${(selectedConfig?.price || 0).toFixed(2)}`}
                    className="w-full p-2 border rounded-md"
                 />
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSet} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Bundle
            </Button>
        </div>
    </div>
  );
};
