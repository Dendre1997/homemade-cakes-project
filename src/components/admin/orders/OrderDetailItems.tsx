"use client";

import { useState, useEffect } from "react";
import { Order, Diameter, CartItem, ProductWithCategory, Flavor } from "@/types";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
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

interface OrderDetailItemsProps {
  items: Order["items"];
  diameters: Diameter[];
  totalAmount: number;
  onUpdate?: () => void;
  referenceImages?: string[];
}

const OrderDetailItems = ({
  items,
  diameters,
  totalAmount,
  onUpdate,
  referenceImages,
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
  const [draftDiameterId, setDraftDiameterId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftInscription, setDraftInscription] = useState("");
  const [draftPriceOverride, setDraftPriceOverride] = useState(""); 
  const [draftSelectedConfig, setDraftSelectedConfig] = useState<any>(null); 
  
  // Edit Context Data
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [availableFlavors, setAvailableFlavors] = useState<Flavor[]>([]);
  const [availableDiameters, setAvailableDiameters] = useState<Diameter[]>([]);

  // Fetch Products for the Picker (only once)
  useEffect(() => {
    if (editingItem && products.length === 0) {
      fetch("/api/admin/products?context=admin")
        .then((res) => res.json())
        .then(setProducts)
        .catch(console.error);
    }
  }, [editingItem, products.length]);


  const handleEditClick = async (item: CartItem) => {
    setEditingItem(item);
    setIsCustomMode(!!(item.productType === 'custom' || item.isCustom));
    setDraftFlavorId(""); 
    setDraftDiameterId(item.diameterId || "");
    setDraftQuantity(item.quantity);
    setDraftInscription(item.inscription || "");
    setDraftPriceOverride(""); 
    
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

           const matchedFlavor = fullProduct.availableFlavors?.find(f => f.name === item.flavor);
           if (matchedFlavor) setDraftFlavorId(matchedFlavor._id);
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
              setDraftDiameterId("");
              setDraftPriceOverride("");
          }
      } catch (e) {
          console.error(e);
      }
  };

  const currentUnitCost = draftProduct
    ? (draftProduct.productType === 'set' && draftSelectedConfig)
        ? (() => {
            const quantityConfigId = draftSelectedConfig.quantityConfigId;
            const config = quantityConfigId ? draftProduct.availableQuantityConfigs?.find(c => c.label === quantityConfigId) : undefined;
            const selectedBoxPrice = config?.price || 0;
            
            // Default pricing (Simple Set)
            let finalPrice = selectedBoxPrice;

            // Combo Logic
            if (draftProduct.comboConfig?.hasCake) {
                const base = draftProduct.structureBasePrice || 0;
                const defaultBox = draftProduct.availableQuantityConfigs?.[0]?.price || 0;
                // Formula: (Base - DefaultBox) + SelectedBox
                finalPrice = (base - defaultBox) + selectedBoxPrice;

                // Flavor Surcharge
                const flavorId = draftSelectedConfig.cake?.flavorId;
                if (flavorId) {
                    const flavor = availableFlavors.find(f => f._id === flavorId);
                    if (flavor?.price) {
                        finalPrice += flavor.price;
                    }
                }
            }
            return finalPrice;
        })()
        : calculateUnitPrice({
            product: draftProduct,
            flavorId: draftFlavorId,
            diameterId: draftDiameterId,
            quantity: draftQuantity,
            availableFlavors,
            inscriptionAvailable: draftProduct.inscriptionSettings?.isAvailable,
            inscriptionPrice: draftProduct.inscriptionSettings?.price,
            hasInscription: !!draftInscription,
          })
    : 0;
    
  const handleSaveChanges = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    
    try {
        const isSet = draftProduct?.productType === 'set';
        
        const updatedItem: CartItem = {
            ...editingItem,
            productId: draftProduct?._id, 
            categoryId: draftProduct?.categoryId,
            name: draftProduct?.name || editingItem.name,
            quantity: draftQuantity,
            inscription: draftInscription,
            price: draftPriceOverride ? parseFloat(draftPriceOverride) : currentUnitCost, 
            imageUrl: draftProduct?.imageUrls?.[0] || editingItem.imageUrl,
            rowTotal: (draftPriceOverride ? parseFloat(draftPriceOverride) : currentUnitCost) * draftQuantity,
            ...(isSet ? {
                flavor: isSet ? `Set: ${draftSelectedConfig?.quantityConfigId}` : "Set Product", 
                selectedConfig: draftSelectedConfig
            } : {
                flavor: availableFlavors.find(f => f._id === draftFlavorId)?.name || (draftProduct ? "Standard" : editingItem.flavor),
                diameterId: draftDiameterId,
                selectedConfig: undefined // Strict undefined for Standard
            })
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
        })
        .catch(err => console.warn(err));
  }, []);

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md">
      <h2 className="font-heading text-h3 text-primary mb-md">Items</h2>
      <div className="flex flex-col">
        {items.map((item) => (
            <AdminOrderItem
                key={item.id || item.productId?.toString() || Math.random().toString()}
                item={item}
                flavorMap={flavorMap}
                diameters={diameters}
                onEdit={handleEditClick}
                referenceImages={referenceImages}
            />
        ))}
      </div>
      <div className="mt-md pt-md border-t border-border text-right">
        <p className="font-body text-lg font-bold text-primary">
          Total: ${totalAmount.toFixed(2)}
        </p>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>Edit Item: {editingItem?.name}</DialogTitle>
                {editingItem && (
                    <div className="flex items-center gap-2 py-6">
                        <Label className="text-xs font-bold text-gray-500 uppercase">
                            {isCustomMode ? "Custom Mode" : "Standard Mode"}
                        </Label>
                        <Button 
                            size="sm" 
                            variant={isCustomMode ? "default" : "outline"}
                            onClick={() => setIsCustomMode(!isCustomMode)}
                            className={isCustomMode ? "bg-accent border-accent" : ""}
                        >
                            Switch to {isCustomMode ? "Standard" : "Custom"}
                        </Button>
                    </div>
                )}
            </DialogHeader>
            
            {editingItem && isCustomMode ? (
                 <div className="py-4">
                     <CustomOrderItemForm 
                        flavors={availableFlavors.length > 0 ? availableFlavors : []} 
                        diameters={diameters}
                        submitLabel="Save Changes"
                        
                        initialValues={{
                            id: editingItem.id,
                            price: editingItem.price,
                            images: editingItem.imageUrl ? [editingItem.imageUrl] : [],
                            selectedImage: editingItem.imageUrl || "",
                            sizeValue: editingItem.customSize || (editingItem.diameterId ? editingItem.diameterId.toString() : "") || "",
                            flavorValue: editingItem.customFlavor || (editingItem.selectedConfig?.cake?.flavorId) || editingItem.flavor || "", 
                            description: editingItem.adminNotes || ""
                        }}
                        onSubmit={(newItem) => {
                             const updatedItem = {
                                 ...editingItem,
                                 ...newItem,
                                 id: editingItem.id
                             };
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
                <div className="space-y-6 py-4">
                    {/* Common Product Selection (Caution advised changing this mid-edit) */}
                    <div className="space-y-2">
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
                        <div className="border p-4 rounded bg-gray-50 flex flex-col gap-4">
                            <h3 className="font-bold text-accent">Edit Set Configuration</h3>
                            
                            {/* Box Size */}
                            <div>
                                <Label>Box Size (Quantity Config)</Label>
                                <Select 
                                    value={draftSelectedConfig?.quantityConfigId} 
                                    onValueChange={(val) => setDraftSelectedConfig({...draftSelectedConfig, quantityConfigId: val})}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {draftProduct.availableQuantityConfigs?.map(c => (
                                            <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Flavor Editor */}
                            <div>
                                <Label>Treat Flavors Distribution</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border p-2 bg-white rounded">
                                    {availableFlavors.map(f => {
                                        const count = draftSelectedConfig?.items?.find((i: any) => i.flavorId === f._id)?.count || 0;
                                        return (
                                            <div key={f._id} className="flex justify-between items-center p-2 border-b">
                                                <span className="text-sm">{f.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleConfigFlavorChange(f._id, -1)}>-</Button>
                                                    <span className="w-6 text-center font-bold">{count}</span>
                                                    <Button size="sm" variant="outline" onClick={() => handleConfigFlavorChange(f._id, 1)}>+</Button>
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
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <Label>Cake Flavor</Label>
                                            <Select 
                                                value={draftSelectedConfig?.cake?.flavorId} 
                                                onValueChange={(val) => handleBentoChange('flavorId', val)}
                                            >
                                                <SelectTrigger>
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
                                                value={draftSelectedConfig?.cake?.inscription || ""}
                                                onChange={(e) => handleBentoChange('inscription', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        /* STANDARD CAKE FORM */
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                 <Label>Flavor</Label>
                                 <Select value={draftFlavorId} onValueChange={setDraftFlavorId} disabled={!draftProduct || availableFlavors.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Flavor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFlavors.map(f => (
                                            <SelectItem key={f._id} value={f._id}>{f.name} (+${f.price})</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                             </div>

                             <div className="space-y-2">
                                 <Label>Size</Label>
                                 <Select value={draftDiameterId} onValueChange={setDraftDiameterId} disabled={!draftProduct || availableDiameters.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDiameters.map(d => (
                                            <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                 </Select>
                             </div>
                        </div>
                    )}

                    {/* Common Fields */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label>Quantity</Label>
                             <Input 
                                type="number" 
                                min="1" 
                                value={draftQuantity} 
                                onChange={e => setDraftQuantity(parseInt(e.target.value) || 1)} 
                             />
                         </div>

                         <div className="space-y-2">
                             <Label>Unit Price Override ($)</Label>
                             <Input 
                                type="number" 
                                placeholder={`Calc: $${currentUnitCost.toFixed(2)}`}
                                value={draftPriceOverride} 
                                onChange={e => setDraftPriceOverride(e.target.value)} 
                             />
                             <p className="text-xs text-muted-foreground">Standard: ${currentUnitCost.toFixed(2)}</p>
                         </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Global Inscription / Notes</Label>
                        <Input 
                            value={draftInscription} 
                            onChange={e => setDraftInscription(e.target.value)}
                            // Standard cakes use inscriptionSettings, Sets usually use global notes? 
                            // Or allow it anyway for flexibility.
                            placeholder="Optional notes or inscription..."
                        />
                    </div>
                </div>
            )}

            {!isCustomMode && (
            <DialogFooter>
                <div className="flex justify-between w-full items-center">
                    <p className="font-bold text-lg">New Total: ${(draftQuantity * (draftPriceOverride ? parseFloat(draftPriceOverride) : currentUnitCost)).toFixed(2)}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailItems;
