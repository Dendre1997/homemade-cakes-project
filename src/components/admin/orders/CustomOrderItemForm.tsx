"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Flavor, Diameter, OrderItem, ProductCategory, IGalleryImage, IShape, CakeTierSelection } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import HybridSelector from "@/components/admin/custom-orders/HybridSelector";
import ImageSelector from "@/components/admin/custom-orders/ImageSelector";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import { addonsUnitCost } from "@/lib/addons/selectedAddonMath";
import {
  appendCloudinaryUploadPreset,
  cloudinaryUploadUrl,
} from "@/lib/cloudinaryClient";
import { Plus } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { AddonAdminSelector } from "@/components/admin/addons/AddonAdminSelector";
import { SelectedAddon } from "@/types";
import { ComboProductForm } from "@/components/admin/orders/ComboProductForm";
import { AdminTierFlavorEditor } from "@/components/admin/shared/AdminTierFlavorEditor";
import {
  allTierFlavorsSelected,
  buildTierSelections,
  compileCustomOrderFlavorLabel,
  getTierSizeLabels,
  tierFlavorsFromSelections,
} from "@/lib/tierSelections";
import {
  compileComboFlavorLabel,
  compileSetFlavorLabel,
  customOrderCakeFlavorName,
  findFlavorBySavedName,
  flavorIdsFromSavedNames,
} from "@/lib/sets/customOrderSets";
import { BakerFlavorChips } from "@/components/admin/custom-orders/BakerFlavorChips";

// Icons Imports
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";

import { BoxIcon as BoxIconSix } from "@/components/icons/quantityIcons/BoxIconSix";
import { BoxIconTwelve } from "@/components/icons/quantityIcons/BoxIconTwelve";
import { BoxIconTwentyFour } from "@/components/icons/quantityIcons/BoxIconTwentyFour";

const BOX_SIZES = [
  { value: "6", label: "Box of", Icon: BoxIconSix },
  { value: "12", label: "Box of", Icon: BoxIconTwelve },
  { value: "24", label: "Box of", Icon: BoxIconTwentyFour },
];

const getIllustrationForSize = (sizeValue: number) => {
  if (sizeValue <= 4) return FourInchBentoIcon;
  if (sizeValue === 5) return FiveInchBentoIcon;
  if (sizeValue === 6) return SixInchCakeIcon;
  if (sizeValue === 7) return SevenInchCakeIcon;
  return EightInchCakeIcon; // 8+ default
};


interface CustomOrderItemFormProps {
  flavors: Flavor[];
  diameters: Diameter[];
  shapes?: IShape[];
  onSubmit: (item: OrderItem) => void;
  onCancel?: () => void;
  initialValues?: {
      id?: string;
      images: string[];
      selectedImage: string;
      sizeValue: string;
      flavorValue: string;
      shapeId?: string;
      designInstructions?: string;
      inscription?: string;
      addons?: SelectedAddon[];
      price: number;
      flavorNote?: string;
      quantity?: number;
      categoryId?: string;
      tiers?: CakeTierSelection[];
  };
  submitLabel?: string;
}

export default function CustomOrderItemForm({
  flavors,
  diameters,
  shapes = [],
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = "Add to Order",
}: CustomOrderItemFormProps) {
  const { showAlert } = useAlert();
  
  // -- Fetched External Data --
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [galleryImages, setGalleryImages] = useState<IGalleryImage[]>([]);
  
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, galRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/admin/gallery"),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (galRes.ok) setGalleryImages(await galRes.json());
      } catch (e) {
        console.error("Failed to fetch gallery or categories", e);
      }
    }
    loadData();
  }, []);

  // -- State --
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialValues?.categoryId || "");
  const [customBoxSize, setCustomBoxSize] = useState("");
  const [selectedTreatIds, setSelectedTreatIds] = useState<string[]>([]);
  const [cakeFlavorId, setCakeFlavorId] = useState("");
  const flavorHydrated = useRef(false);
  const [images, setImages] = useState<string[]>(initialValues?.images || []);
  const [selectedImage, setSelectedImage] = useState<string>(initialValues?.selectedImage || "");
  const [sizeValue, setSizeValue] = useState<string>(initialValues?.sizeValue || "");
  const [flavorValue, setFlavorValue] = useState<string>(initialValues?.flavorValue || "");
  const [tierFlavors, setTierFlavors] = useState<Record<number, string>>(() =>
    tierFlavorsFromSelections(initialValues?.tiers)
  );
  const [selectedShapeId, setSelectedShapeId] = useState<string>(initialValues?.shapeId || "");
  const [designInstructions, setDesignInstructions] = useState<string>(initialValues?.designInstructions || "");
  const [inscription, setInscription] = useState<string>(initialValues?.inscription || "");
  const [flavorNote, setFlavorNote] = useState<string>(initialValues?.flavorNote || "");
  const [price, setPrice] = useState<number>(initialValues?.price || 0);
  const [quantity, setQuantity] = useState<number>(initialValues?.quantity || 1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(initialValues?.addons || []);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Derived Data --
  const activeCategoryObj = useMemo(() => {
    return categories.find(c => c._id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const activeGalleryImages = useMemo(() => {
    if (!selectedCategoryId) return [];
    return galleryImages.filter(img => img.categories.includes(selectedCategoryId));
  }, [galleryImages, selectedCategoryId]);

  const activeFlavors = useMemo(() => {
    if (!selectedCategoryId) return [];
    const filtered = flavors.filter(f => Array.isArray(f.categoryIds) && f.categoryIds.includes(selectedCategoryId));
    return filtered.length > 0 ? filtered : flavors; // Fallback to all if category has no specific mappings
  }, [flavors, selectedCategoryId]);

  const activeDiameters = useMemo(() => {
    if (!selectedCategoryId) return [];
    return diameters
      .filter(d => Array.isArray(d.categoryIds) && d.categoryIds.includes(selectedCategoryId))
      .sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));
  }, [diameters, selectedCategoryId]);

  // The size field is hybrid (diameter _id, box value, or free text).
  // Shape selection only applies when the size is an actual diameter.
  const selectedDiameterId = useMemo(() => {
    return diameters.some(d => d._id === sizeValue) ? sizeValue : "";
  }, [diameters, sizeValue]);

  const selectedDiameter = useMemo(
    () => diameters.find((d) => d._id === selectedDiameterId),
    [diameters, selectedDiameterId]
  );

  const tiersCount = useMemo(() => {
    if (selectedDiameter?.tiersCount && selectedDiameter.tiersCount > 1) {
      return selectedDiameter.tiersCount;
    }
    if (initialValues?.tiers?.length && initialValues.tiers.length > 1) {
      return initialValues.tiers.length;
    }
    return 1;
  }, [selectedDiameter, initialValues?.tiers]);
  const isMultiTier = tiersCount > 1;
  const tierSizes = useMemo(() => {
    if (
      initialValues?.tiers?.length &&
      initialValues.tiers.length > 1 &&
      (!selectedDiameterId || selectedDiameterId === (initialValues.sizeValue || ""))
    ) {
      return initialValues.tiers.map((t) => t.sizeLabel);
    }
    return getTierSizeLabels(selectedDiameter);
  }, [initialValues?.tiers, initialValues?.sizeValue, selectedDiameter, selectedDiameterId]);

  // Shapes linked to the chosen diameter (fallback to all active shapes for testing)
  const availableShapes = useMemo(() => {
    if (!selectedDiameterId) return [];
    const diam = diameters.find(d => d._id === selectedDiameterId);
    const linkedIds = diam?.shapeIds;
    if (linkedIds && linkedIds.length > 0) {
      return shapes.filter(s => linkedIds.includes(s._id));
    }
    return shapes;
  }, [selectedDiameterId, diameters, shapes]);

  // Cascade reset: keep the selected shape valid whenever the diameter changes
  useEffect(() => {
    if (isMultiTier) {
      if (selectedShapeId) setSelectedShapeId("");
      return;
    }
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

  useEffect(() => {
    if (initialValues?.tiers?.length) {
      setTierFlavors(tierFlavorsFromSelections(initialValues.tiers));
    }
  }, [initialValues?.tiers]);

  useEffect(() => {
    if (!isMultiTier) {
      setTierFlavors({});
    }
  }, [selectedDiameterId, isMultiTier]);

  useEffect(() => {
    if (flavorHydrated.current || !activeCategoryObj) return;
    if (activeCategoryObj.categoryType !== "set" && activeCategoryObj.categoryType !== "combo") return;
    const pool = activeFlavors.length > 0 ? activeFlavors : flavors;
    if (!pool.length) return;
    const source =
      activeCategoryObj.categoryType === "combo"
        ? flavorValue.match(/Treats:\s*\[([^\]]*)\]/)?.[1] ?? ""
        : flavorValue;
    setSelectedTreatIds(flavorIdsFromSavedNames(pool, source));
    if (activeCategoryObj.categoryType === "combo") {
      const cake = findFlavorBySavedName(pool, customOrderCakeFlavorName(flavorValue) ?? "");
      if (cake?._id != null) setCakeFlavorId(String(cake._id));
    }
    flavorHydrated.current = true;
  }, [activeCategoryObj, activeFlavors, flavors, flavorValue]);

  // -- Handlers --

  // 1. Image Hub
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<any>[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      appendCloudinaryUploadPreset(formData);

      const uploadPromise = fetch(
        cloudinaryUploadUrl("image"),
        {
          method: "POST",
          body: formData,
        }
      ).then((response) => {
        if (!response.ok)
          throw new Error(`Image upload failed for ${file.name}`);
        return response.json();
      });
      uploadPromises.push(uploadPromise);
    }

    try {
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((result) => result.secure_url);

      setImages((prev) => [...prev, ...newUrls]);
      if (!selectedImage && newUrls.length > 0) {
          setSelectedImage(newUrls[0]);
      }
      showAlert("Images uploaded successfully", "success");
    } catch (err) {
      console.error(err);
      showAlert("Failed to upload images", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePickFromGallery = (url: string) => {
    if (!images.includes(url)) {
      setImages(prev => [...prev, url]);
      if (!selectedImage) setSelectedImage(url);
    }
  };

  const handleRemoveImage = async (urlToRemove: string) => {
      // Don't delete from cloudinary if it's a gallery image!
      const isGalleryImage = galleryImages.some(img => img.imageUrl === urlToRemove);

      if (isGalleryImage) {
          setImages(prev => prev.filter(u => u !== urlToRemove));
          if (selectedImage === urlToRemove) setSelectedImage("");
          return;
      }

      const publicId = getPublicIdFromUrl(urlToRemove);
      if (!publicId) {
          setImages(prev => prev.filter(u => u !== urlToRemove));
          if (selectedImage === urlToRemove) setSelectedImage("");
          return;
      }

      try {
          await fetch("/api/admin/cloudinary-delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_id: publicId }),
          });
          
          setImages(prev => prev.filter(u => u !== urlToRemove));
          if (selectedImage === urlToRemove) setSelectedImage("");
          
      } catch (err) {
          console.error("Failed to delete image", err);
          showAlert("Failed to delete image from server", "error");
      }
  };

  // 2. Submit
  const handleSubmit = () => {
      if (!selectedCategoryId) {
          showAlert("Please select a base category", "error");
          return;
      }
      if (price <= 0) {
          showAlert("Price must be greater than 0", "error");
          return;
      }
      if (!sizeValue) {
          showAlert("Please specify a size or quantity", "error");
          return;
      }
      if (isMultiTier) {
        if (!allTierFlavorsSelected(tiersCount, tierFlavors)) {
          showAlert("Please select a flavor for each tier", "error");
          return;
        }
      } else if (!flavorValue) {
          showAlert("Please specify a flavor", "error");
          return;
      }

      const isCustomSize = !diameters.some(d => d._id === sizeValue);
      const isCustomFlavor = !isMultiTier && !flavors.some(f => f._id === flavorValue);
      
      let sizeName = sizeValue;
      if (!isCustomSize) {
          sizeName = diameters.find(d => d._id === sizeValue)?.name || "Unknown Size";
      } else {
          // Check if it's a Box size match
          const boxMatch = BOX_SIZES.find(b => b.value === sizeValue);
          if (boxMatch) sizeName = `${boxMatch.label} ${boxMatch.value}`;
      }

      let compiledFlavor = flavorValue;
      let itemTiers: CakeTierSelection[] | undefined;

      if (isMultiTier) {
        itemTiers = buildTierSelections(
          tiersCount,
          tierSizes,
          tierFlavors,
          activeFlavors
        );
        compiledFlavor = compileCustomOrderFlavorLabel(itemTiers);
      }

      const isSetOrCombo =
        activeCategoryObj?.categoryType === "set" || activeCategoryObj?.categoryType === "combo";
      const newItem: any = {
          id: initialValues?.id || `new-custom-${Date.now()}`,
          name: `Custom ${activeCategoryObj?.name || 'Cake'} - ${sizeName}`,
          productType: 'custom',
          price: price,
          originalPrice: price,
          quantity: quantity,
          rowTotal: price * quantity,
          imageUrl: selectedImage || images[0] || "",
          imageUrls: images,
          
          isManualPrice: true,
          isCustom: true,
          designInstructions: designInstructions,
          inscription: inscription,
          flavorNote: flavorNote,
          addons: selectedAddons,
          categoryId: selectedCategoryId,
          
          // Hybrid Logic
          customSize: isCustomSize ? sizeValue : undefined,
          diameterId: !isCustomSize ? sizeValue : undefined,
          shapeId: !isCustomSize && !isMultiTier && selectedShapeId ? selectedShapeId : undefined,
          tiers: itemTiers,
          
          customFlavor: isCustomFlavor || isSetOrCombo ? flavorValue : undefined,
          flavor: isMultiTier ? compiledFlavor : flavorValue,
      };

      if (!isSetOrCombo && !isMultiTier && (!isCustomFlavor || !isCustomSize)) {
        newItem.selectedConfig = {
          cake: {
            flavorId: !isCustomFlavor ? flavorValue : "",
            diameterId: !isCustomSize ? sizeValue : "",
            shapeId: !isCustomSize && selectedShapeId ? selectedShapeId : "",
          },
        };
      }
      
      onSubmit(newItem);
      
      if (!initialValues?.id) {
          setImages([]);
          setSelectedImage("");
          setSizeValue("");
          setFlavorValue("");
          setTierFlavors({});
          setSelectedShapeId("");
          setFlavorNote("");
          setDesignInstructions("");
          setInscription("");
          setPrice(0);
          setQuantity(1);
          setSelectedCategoryId("");
          setSelectedAddons([]);
      }
  };

  const isIconPicked = activeDiameters.some(d => d._id === sizeValue) || BOX_SIZES.some(b => b.value === sizeValue);

  return (
    <div className="p-4 rounded-lg bg-background/50 border w-full min-w-0 max-w-full overflow-hidden">
       <div className="flex justify-between items-center mb-6 border-b pb-4">
           <h3 className="text-lg font-bold text-primary">New Custom Item Design</h3>
       </div>

       {/* STEP 1: CATEGORY SELECTION */}
       <div className="mb-8">
           <Label className="mb-3 block text-md">1. Select Core Category</Label>
           {categories.length === 0 ? (
             <p className="text-sm text-gray-400">Loading categories...</p>
           ) : (
             <div className="flex flex-wrap gap-3">
                 {categories.map((cat) => (
                     <Button
                       key={cat._id.toString()}
                       variant={selectedCategoryId === cat._id ? "primary" : "outline"}
                       className="min-w-[120px]"
                       onClick={() => setSelectedCategoryId(cat._id.toString())}
                     >
                       {cat.name}
                     </Button>
                 ))}
             </div>
           )}
       </div>

       {selectedCategoryId && (
           (activeCategoryObj?.categoryType as string) === 'combo' ? (
               <div className="mt-6 border-t border-primary/10 pt-8 w-full min-w-0 max-w-full overflow-hidden">
                   <ComboProductForm
                       allCategories={categories}
                       allFlavors={flavors}
                       allDiameters={diameters}
                       onAdd={(item) => onSubmit(item)}
                       onCancel={() => setSelectedCategoryId("")}
                   />
               </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-6 border-t border-primary/10 pt-8">
                 {/* LEFT: Images & Description */}
             <div className="space-y-8 min-w-0">
                 
                 {/* GALLERY REFERENCES */}
                 <div className="space-y-3">
                    <Label className="block border-b pb-2">Integrated Portfolio Gallery</Label>
                    {activeGalleryImages.length > 0 ? (
                        <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
                           {activeGalleryImages.map(img => (
                               <div 
                                  key={img._id.toString()}
                                  onClick={() => handlePickFromGallery(img.imageUrl)}
                                  className="w-20 h-20 shrink-0 relative rounded-md overflow-hidden cursor-pointer hover:border-accent hover:border-2 hover:scale-105 transition-all"
                                  title="Click to add as reference"
                               >
                                  <Image src={img.imageUrl} alt={img.title} fill quality={90} className="object-cover" />
                               </div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No gallery images available for this category.</p>
                    )}
                 </div>

                 {/* FINAL IMAGES IN CART */}
                 <div className="pt-4 border-t">
                     <Label className="mb-2 flex items-center justify-between">
                        Active Order References
                        <span className="text-xs font-normal text-muted-foreground">{images.length} images</span>
                     </Label>
                     <ImageSelector 
                         images={images}
                         selectedImage={selectedImage}
                         onSelect={setSelectedImage}
                         onRemove={handleRemoveImage}
                         onUpload={() => fileInputRef.current?.click()}
                     />
                     <input 
                         type="file"
                         ref={fileInputRef}
                         className="hidden"
                         multiple
                         accept="image/*"
                         onChange={handleFileChange}
                     />
                     {isUploading && <p className="text-xs text-primary mt-1 animate-pulse">Uploading...</p>}
                 </div>

                 <div className="space-y-4">
                     <div>
                         <Label className="mb-2 block">Inscription (Text on Cake)</Label>
                         <Input 
                             placeholder="e.g., Happy Birthday John"
                             value={inscription}
                             onChange={(e) => setInscription(e.target.value)}
                             className="bg-white"
                         />
                     </div>
                     <div>
                         <Label className="mb-2 block">Design Instructions</Label>
                         <Textarea 
                             placeholder="Internal notes on how to build/decorate the item..."
                             rows={4}
                             value={designInstructions}
                             onChange={(e) => setDesignInstructions(e.target.value)}
                             className="bg-yellow-50 border-yellow-200 focus:border-yellow-400"
                         />
                     </div>
                 </div>
             </div>

             {/* RIGHT: Specs & Price */}
             <div className="space-y-6 min-w-0 flex flex-col">
                 
                 {/* SIZE SELECTION UI */}
                 <div className="space-y-3">
                     <Label className="block text-md border-b pb-2">Size / Quantity Config</Label>
                     
                     <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                         {(activeCategoryObj?.categoryType as string) === "combo" || activeCategoryObj?.categoryType === "set" ? (
                             <div className="flex flex-col gap-4 w-full">
                               <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                 <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar flex-1">
                                   {BOX_SIZES.map((box) => (
                                     <button
                                       key={box.value}
                                       type="button"
                                       onClick={() => {
                                         setSizeValue(box.value);
                                         setCustomBoxSize("");
                                       }}
                                       className={`flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-200 ${
                                         sizeValue === box.value
                                           ? "border-accent bg-accent/5 shadow-sm shadow-accent/10"
                                           : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground"
                                       }`}
                                     >
                                       <div className="flex h-16 w-16 items-center justify-center pointer-events-none">
                                         <box.Icon className={`h-full w-full ${sizeValue === box.value ? "text-accent" : "text-primary"}`} />
                                       </div>
                                       <p className="font-bold text-sm text-primary">
                                         {box.label} {box.value}
                                       </p>
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             </div>
                         ) : (
                             activeDiameters.map((d) => {
                               const IconComp = getIllustrationForSize(d.sizeValue || 0);
                               return (
                                 <button
                                     key={d._id}
                                     type="button"
                                     onClick={() => setSizeValue(d._id)}
                                     className={`flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all duration-200 ${
                                       sizeValue === d._id
                                         ? "border-accent bg-accent/5 shadow-sm shadow-accent/10"
                                         : "border-primary/10 bg-white hover:border-accent/50 hover:bg-subtleBackground"
                                     }`}
                                 >
                                     <div className="flex h-16 w-16 items-center justify-center pointer-events-none">
                                       <IconComp className={`h-full w-full ${sizeValue === d._id ? "text-accent" : "text-primary"}`} />
                                     </div>
                                     <p className="font-bold text-sm text-primary line-clamp-1">{d.name}</p>
                                 </button>
                               )
                             })
                         )}
                     </div>

                     
                        <div className="mt-2 animate-in slide-in-from-top-2 duration-300">
                          <Label className="text-xs text-muted-foreground mb-1 block">Or Manual Type Override</Label>
                          <Input 
                            placeholder="Type custom size (e.g., 3-Tier Tall, 12x12 Slab)" 
                            value={sizeValue}
                            onChange={(e) => setSizeValue(e.target.value)}
                            className="bg-white border-dashed"
                          />
                        </div>
                     
                 </div>

                 {/* SHAPE SELECTION UI (only when a real diameter is chosen and single-tier) */}
                 {!isMultiTier && availableShapes.length > 0 && (
                     <div className="space-y-2">
                         <Label className="block text-md border-b pb-2">Shape</Label>
                         <Select value={selectedShapeId} onValueChange={setSelectedShapeId}>
                             <SelectTrigger className="bg-white">
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

                 {/* FLAVOR SELECTION UI */}
                 <div className="pt-2">
                     {activeCategoryObj?.categoryType === "set" || activeCategoryObj?.categoryType === "combo" ? (
                         <div className="mt-2 space-y-3 rounded-xl border border-primary/15 bg-background/40 p-4">
                             {activeCategoryObj.categoryType === "combo" && (
                               <div className="space-y-2">
                                 <Label>Cake flavor</Label>
                                 <Select value={cakeFlavorId || undefined} onValueChange={(value) => {
                                   setCakeFlavorId(value);
                                   const cake = activeFlavors.find((flavor) => String(flavor._id) === value);
                                   const names = selectedTreatIds
                                     .map((id) => activeFlavors.find((flavor) => String(flavor._id) === id)?.name ?? "")
                                     .filter(Boolean);
                                   setFlavorValue(compileComboFlavorLabel(names, cake?.name ?? ""));
                                 }}>
                                   <SelectTrigger className="h-11 rounded-xl bg-white sm:h-10">
                                     <SelectValue placeholder="Select cake flavor" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {activeFlavors.map((flavor) => (
                                       <SelectItem key={String(flavor._id)} value={String(flavor._id)}>
                                         {(flavor.name ?? "").trim()}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                             )}
                             <div className="space-y-2">
                               <Label>{activeCategoryObj.categoryType === "combo" ? "Treat flavors" : "Set flavors"}</Label>
                               <BakerFlavorChips
                                 flavors={activeFlavors}
                                 selectedIds={selectedTreatIds}
                                 onToggle={(flavorId) => {
                                   const next = selectedTreatIds.includes(flavorId)
                                     ? selectedTreatIds.filter((id) => id !== flavorId)
                                     : [...selectedTreatIds, flavorId];
                                   setSelectedTreatIds(next);
                                   const names = next
                                     .map((id) => activeFlavors.find((flavor) => String(flavor._id) === id)?.name ?? "")
                                     .filter(Boolean);
                                   if (activeCategoryObj.categoryType === "combo") {
                                     const cake = activeFlavors.find((flavor) => String(flavor._id) === cakeFlavorId);
                                     setFlavorValue(compileComboFlavorLabel(names, cake?.name ?? customOrderCakeFlavorName(flavorValue) ?? ""));
                                   } else {
                                     setFlavorValue(compileSetFlavorLabel(names));
                                   }
                                 }}
                               />
                             </div>
                         </div>
                     ) : isMultiTier ? (
                         <div className="space-y-2">
                             <Label className="block text-md border-b pb-2">
                               Tier Flavors ({activeFlavors.length} available)
                             </Label>
                             <AdminTierFlavorEditor
                               tiersCount={tiersCount}
                               tierSizes={tierSizes}
                               tierFlavors={tierFlavors}
                               flavors={activeFlavors}
                               onTierFlavorChange={(index, id) =>
                                 setTierFlavors((prev) => ({ ...prev, [index]: id }))
                               }
                               variant="cards"
                             />
                         </div>
                     ) : (
                         <HybridSelector 
                             label={`Flavor Profile (${activeFlavors.length} detected)`}
                             options={activeFlavors}
                             value={flavorValue}
                             onChange={(val) => setFlavorValue(val)}
                         />
                     )}
                 </div>
                 
                 <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                     <Label className="text-xs text-muted-foreground mb-1 block">Flavor Note (Optional)</Label>
                     <Input 
                         placeholder="e.g. less sweet, specific inquiry" 
                         value={flavorNote}
                         onChange={(e) => setFlavorNote(e.target.value)}
                         className="bg-white border-dashed"
                     />
                 </div>
                 
                 <div className="bg-gray-50 p-3 rounded-md border text-xs text-gray-500 mt-2">
                     <p>Use the visual buttons or selectors above. If a standard option doesn't fit, simply type the exact requirements.</p>
                 </div>

                 <div className="pt-4 border-t mt-4">
                     <AddonAdminSelector 
                         selectedAddons={selectedAddons}
                         onChange={setSelectedAddons}
                     />
                 </div>

                 <div className="pt-4 border-t mt-4">
                     <div className="gap-4">
                         <div>
                             <Label className="mb-2 block">Quantity Multiplier</Label>
                             <Input 
                                 type="number"
                                 min="1"
                                 className="text-2xl font-bold w-full"
                                 value={quantity}
                                 onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                             />
                         </div>
                         <div>
                             <Label className="mb-2 block">Fixed Unit Price ($)</Label>
                             <Input 
                                 type="number" 
                                 min="0"
                                 step="0.01"
                                 className="text-2xl font-bold w-full"
                                 placeholder="0.00"
                                 value={price || ""}
                                 onChange={(e) => setPrice(parseFloat(e.target.value))}
                             />
                         </div>
                     </div>
                 </div>

                 <div className="mt-auto pt-4 border-t border-primary/10">
                     {/* Pushes to bottom if right column is shorter */}
                 </div>
             </div>

             {/* BOTTOM: Action Buttons */}
             <div className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-4 pt-6 mt-4 border-t border-primary/20 bg-primary/5 p-4 rounded-xl w-full">
                 <div className="font-bold text-2xl text-primary shrink-0 sm:w-1/3 text-center sm:text-left flex flex-col">
                     <span>Total: ${(price * quantity).toFixed(2)}</span>
                     {selectedAddons.length > 0 && (
                         <span className="text-xs font-normal text-muted-foreground">
                             Addons total: +${addonsUnitCost(selectedAddons).toFixed(2)} (Must be manually added to Fixed Price if desired)
                         </span>
                     )}
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-2/3 justify-end">
                     {onCancel && (
                         <Button onClick={onCancel} className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 py-6 text-lg" variant="outline">
                             Cancel
                         </Button>
                     )}
                     <Button onClick={handleSubmit} disabled={isUploading} className="w-full sm:w-auto shadow-md py-6 text-lg">
                         <Plus className="w-5 h-5 mr-2" />
                         {submitLabel}
                     </Button>
                 </div>
             </div>
         </div>
         )
       )}
    </div>
  );
}
