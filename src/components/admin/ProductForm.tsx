"use client";

import { useState, useEffect } from "react";
import {
  Allergen,
  Diameter,
  Flavor,
  Product,
  ProductCategory,
  AvailableDiameterConfig,
  ProductFormData,
  Collection
} from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import SortableImage from "./SortableImage";

import { Button } from "../ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { Textarea } from "../ui/Textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { cn } from "@/lib/utils";
interface ProductFormProps {
  existingProduct?: Product | null;
  onFormSubmit: (productData: ProductFormData) => Promise<void> | void;
  flavors: Flavor[];
  diameters: Diameter[];
  allergens: Allergen[];
  categories: ProductCategory[];
  collections: Collection[];
  categoryId?: string;
  onCategoryChange: (newCategoryId: string) => void;
  isSubmitting?: boolean;
}
import FlavorSelector from "../ui/FlavorSelector";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import QuantityConfigSelector, { QuantityConfig } from "../ui/QuantityConfigSelector";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";

import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";

import { X } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

const ProductForm = ({
  existingProduct,
  flavors,
  diameters,
  allergens,
  collections,
  categoryId,
  onFormSubmit,
  onCategoryChange,
  categories,
  isSubmitting,
}: ProductFormProps) => {
  const {showAlert} = useAlert()
  const isEditMode = !!existingProduct;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [structureBasePrice, setStructureBasePrice] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [availableFlavorIds, setAvailableFlavorIds] = useState<string[]>([]);
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [availableDiameterConfigs, setAvailableDiameterConfigs] = useState<AvailableDiameterConfig[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  
  // Sets & Combo State
  const [productType, setProductType] = useState<'cake' | 'set' | 'custom'>('cake');
  const [availableQuantityConfigs, setAvailableQuantityConfigs] = useState<QuantityConfig[]>([]);
  
  const [isCombo, setIsCombo] = useState(false);
  const [comboCakeFlavorIds, setComboCakeFlavorIds] = useState<string[]>([]);
  const [comboCakeDiameterIds, setComboCakeDiameterIds] = useState<string[]>([]); 
  const [comboAllowInscription, setComboAllowInscription] = useState(false);

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [imageToDeleteIndex, setImageToDeleteIndex] = useState<number | null>(null);
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [inscriptionAvailable, setInscriptionAvailable] = useState(false);
  const [inscriptionPrice, setInscriptionPrice] = useState("");
  const [inscriptionMaxLength, setInscriptionMaxLength] = useState("");

  const iconMap: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    FourInchBentoIcon: FourInchBentoIcon,
    FiveInchBentoIcon: FiveInchBentoIcon,
    SixInchCakeIcon: SixInchCakeIcon,
    SevenInchCakeIcon: SevenInchCakeIcon,
    EightInchCakeIcon: EightInchCakeIcon,
  };
  const sortedDiameters = [...diameters].sort(
    (a, b) => a.sizeValue - b.sizeValue
  );
  const assignedIds = availableDiameterConfigs.map((c) => c.diameterId);
  const unassignedDiameters = sortedDiameters.filter(
    (d) => !assignedIds.includes(d._id)
  );
  const assignedDiameters = availableDiameterConfigs
    .map((config) => {
      const details = sortedDiameters.find((d) => d._id === config.diameterId);
      return { ...details, ...config };
    })
    .sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));

  const addDiameter = (diameterId: string) => {
    setAvailableDiameterConfigs((prev) => [
      ...prev,
      { diameterId, multiplier: 1 },
    ]);
  };
  const removeDiameter = (diameterId: string) => {
    setAvailableDiameterConfigs((prev) =>
      prev.filter((c) => c.diameterId !== diameterId)
    );
  };
  const handleMultiSelectChange = (
    idToToggle: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(idToToggle)
        ? prev.filter((id) => id !== idToToggle)
        : [...prev, idToToggle]
    );
  };

  const handleDiameterConfigChange = (
    diameterId: string,
    multiplier: string
  ) => {
    const numericMultiplier = parseFloat(multiplier);
    setAvailableDiameterConfigs((prev) => {
      const existingConfig = prev.find((c) => c.diameterId === diameterId);
      if (multiplier === "" || isNaN(numericMultiplier)) {
        return prev.filter((c) => c.diameterId !== diameterId);
      }
      if (existingConfig) {
        return prev.map((c) =>
          c.diameterId === diameterId
            ? { ...c, multiplier: numericMultiplier }
            : c
        );
      } else {
        return [...prev, { diameterId, multiplier: numericMultiplier }];
      }
    });
  };

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name || "");
      setDescription(existingProduct.description || "");
      let displayPrice = existingProduct.structureBasePrice || 0;
      
      // FIX: Decouple Bento Price from Total Price for Combo Sets
      if (existingProduct.productType === 'set' && existingProduct.comboConfig?.hasCake) {
          const boxConfig = existingProduct.availableQuantityConfigs?.[0];
          if (boxConfig) {
             displayPrice = displayPrice - Number(boxConfig.price);
          }
      }

      setStructureBasePrice(
        displayPrice.toString()
      );
      setIsActive(existingProduct.isActive);

      setAvailableFlavorIds(
        existingProduct.availableFlavorIds?.map((id) => id.toString()) || []
      );
      // setCategoryIds(existingProduct.categoryId?.toString() || '');
      setAllergenIds(
        existingProduct.allergenIds?.map((id) => id.toString()) || []
      );
      setAvailableDiameterConfigs(
        existingProduct.availableDiameterConfigs?.map((config) => ({
          ...config,
          diameterId: config.diameterId.toString(),
        })) || []
      );
      setImageUrls(existingProduct.imageUrls || []);
      setCollectionIds(
        existingProduct.collectionIds?.map((id) => id.toString()) || []
      );
      
      // Populate Sets & Combo Data
      if (existingProduct.productType) {
        setProductType(existingProduct.productType);
      }
      if (existingProduct.availableQuantityConfigs) {
        setAvailableQuantityConfigs(existingProduct.availableQuantityConfigs);
      }
      if (existingProduct.comboConfig) {
        setIsCombo(existingProduct.comboConfig.hasCake);
        setComboCakeFlavorIds(existingProduct.comboConfig.cakeFlavorIds || []);
        // Strict Rule: Ensure 4-inch is selected for existing combos if not already
        if (existingProduct.comboConfig.hasCake) {
             const fourInch = diameters.find(d => d.sizeValue === 4);
             if (fourInch) {
                 setComboCakeDiameterIds([fourInch._id]);
             }
        } else {
             setComboCakeDiameterIds(existingProduct.comboConfig.cakeDiameterIds || []);
        }
        setComboAllowInscription(existingProduct.comboConfig.allowInscription);
      }
    }
    if (existingProduct?.inscriptionSettings) {
      setInscriptionAvailable(existingProduct.inscriptionSettings.isAvailable);
      setInscriptionPrice(existingProduct.inscriptionSettings.price.toString());
      setInscriptionMaxLength(
        existingProduct.inscriptionSettings.maxLength.toString()
      );
    } else {
      setInscriptionAvailable(false);
      setInscriptionPrice("");
      setInscriptionMaxLength("");
    }
  }, [existingProduct]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const uploadPromises: Promise<any>[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "homemade_cakes_preset");

      const uploadPromise = fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
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

      setImageUrls((prevUrls) => [...prevUrls, ...newUrls]);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An image upload error occurred");
    } finally {
      setIsUploading(false);
    }
  };
  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prevUrls) =>
      prevUrls.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSaveClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryId) {
      showAlert("Please select a category before submitting.", "error");
      return;
    }
    setIsSaveConfirmationOpen(true);
  };

  const confirmSave = async () => {
    if (!categoryId) {
        showAlert("Category is required", "error");
        return;
    }
    setIsSaveConfirmationOpen(false);
    
    // Determine strict sort order for dependencies or just allow backend to handle?
    // Sorting by diameter size value
    const sortedConfigsToSubmit = [...availableDiameterConfigs].sort((a, b) => {
      const diameterA = diameters.find((d) => d._id === a.diameterId);
      const diameterB = diameters.find((d) => d._id === b.diameterId);
      return (diameterA?.sizeValue || 0) - (diameterB?.sizeValue || 0);
    });
    
    const productData: ProductFormData = {
      name,
      description,
      categoryId,
      structureBasePrice: parseFloat(structureBasePrice),
      isActive,
      availableFlavorIds,
      allergenIds,
      availableDiameterConfigs: sortedConfigsToSubmit,
      imageUrls: imageUrls,
      inscriptionSettings: (productType === 'set' && isCombo) ? {
        isAvailable: comboAllowInscription,
        price: 0,
        maxLength: 20
      } : {
        isAvailable: inscriptionAvailable,
        price: parseFloat(inscriptionPrice) || 0,
        maxLength: parseInt(inscriptionMaxLength) || 0,
      },
      collectionIds: collectionIds,
      
      // New Fields
      productType,
      ...(productType === 'set' && {
        availableQuantityConfigs,
        comboConfig: {
            hasCake: isCombo,
            cakeFlavorIds: isCombo ? comboCakeFlavorIds : [],
            cakeDiameterIds: isCombo ? comboCakeDiameterIds : [],
            allowInscription: isCombo ? comboAllowInscription : false,
        }
      }),
    };

    try {
        await onFormSubmit(productData);
        showAlert(isEditMode ? "Product updated successfully!" : "Product created successfully!", "success");
    } catch (err) {
        console.error("Submission error:", err);
        showAlert("Failed to save product. Please try again.", "error");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImageUrls((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const iconSizeClass = "h-8 w-8 text-primary shrink-0";

  return (
    <form onSubmit={handleSaveClick} className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* --- LEFT COLUMN (2/3 width) --- */}
        <div className="space-y-8 lg:col-span-2">
          {/* PRODUCT TYPE */}
          <Card>
            <CardHeader>
              <CardTitle>Product Type</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
               <div className={cn("cursor-pointer border-2 rounded-lg p-4 flex-1 text-center transition-all", productType === 'cake' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")} onClick={() => setProductType('cake')}>
                  <div className="font-bold block text-lg">Cake</div>
                  <div className="text-sm text-muted-foreground">Standard configurable cake</div>
               </div>
               <div className={cn("cursor-pointer border-2 rounded-lg p-4 flex-1 text-center transition-all", productType === 'set' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")} onClick={() => setProductType('set')}>
                  <div className="font-bold block text-lg">Set / Combo</div>
                  <div className="text-sm text-muted-foreground">Box of items or Bento Combo</div>
               </div>
            </CardContent>
          </Card>

          {/* 1. BASIC INFORMATION */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>Core product information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Product Name
                </label>
                <Input
                  id="name"
                  placeholder="e.g. Strawberry Vanity Cake"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Describe the taste, texture, and inspiration..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="price" className="text-sm font-medium">
                    Base Price ($)
                  </label>
                  <Input
                    type="number"
                    id="price"
                    value={structureBasePrice}
                    onChange={(e) => setStructureBasePrice(e.target.value)}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. MEDIA SECTION */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload images. The first image will be the main
                cover. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={imageUrls}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2  sm:grid-cols-3 md:grid-cols-4">
                      {imageUrls.map((url, index) => (
                        <SortableImage
                          key={url}
                          url={url}
                          index={index}
                          handleRemoveImage={handleRemoveImage}
                          
                        />
                      ))}

                      {/* Upload Button */}
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:bg-subtleBackground hover:border-primary/50 transition-colors">
                        <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                          {isUploading ? (
                            <span className="animate-pulse">Uploading...</span>
                          ) : (
                            <>
                              <span className="text-2xl">+</span>
                              <span>Add Image</span>
                            </>
                          )}
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </SortableContext>
                </DndContext>
                {error && <p className="text-sm text-error">{error}</p>}
              </div>
            </CardContent>
          </Card>

          {/* 3. ATTRIBUTES (Flavors & Allergens) */}
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-medium">{productType === 'set' ? "Cupcake / Item Flavors" : "Available Flavors"}</h4>
                <FlavorSelector
                  mode="multiple"
                  flavors={flavors}
                  selectedIds={availableFlavorIds}
                  onToggleId={(flavorId) =>
                    handleMultiSelectChange(flavorId, setAvailableFlavorIds)
                  }
                />
              </div>

              <div>
                <h4 className="mb-3 text-sm font-medium">Allergens</h4>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((allergen) => (
                    <ChipCheckbox
                      key={allergen._id.toString()}
                      checked={allergenIds.includes(allergen._id.toString())}
                      onCheckedChange={() =>
                        handleMultiSelectChange(
                          allergen._id.toString(),
                          setAllergenIds
                        )
                      }
                    >
                      {allergen.name}
                    </ChipCheckbox>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SET CONFIGURATION */}
          {productType === 'set' && (
            <Card>
              <CardHeader>
                <CardTitle>Set Configuration</CardTitle>
                <CardDescription>Define box sizes and combo options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 {/* Quantity Configs */}
                 <QuantityConfigSelector 
                    configs={availableQuantityConfigs}
                    onChange={setAvailableQuantityConfigs}
                 />

                 <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Combo Set (Bento + Items)</Label>
                            <p className="text-sm text-muted-foreground">Does this set include a bento-cake?</p>
                        </div>
                        <Switch checked={isCombo} onCheckedChange={(checked) => {
                            setIsCombo(checked);
                            if (checked) {
                                // Rule: Auto-select 4-inch diameter
                                const fourInch = diameters.find(d => d.sizeValue === 4);
                                if (fourInch) {
                                    setComboCakeDiameterIds([fourInch._id]);
                                }
                            }
                        }} />
                    </div>

                    {isCombo && (
                        <div className="space-y-4 p-4 bg-subtleBackground/30 rounded-md border animate-in slide-in-from-top-2">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Cake Settings</h4>
                            
                            {/* Cake Flavors */}
                            <div>
                                <Label className="mb-2 block">Cake Flavors</Label>
                                <FlavorSelector
                                    mode="multiple"
                                    flavors={flavors}
                                    selectedIds={comboCakeFlavorIds}
                                    onToggleId={(id) => handleMultiSelectChange(id, setComboCakeFlavorIds)}
                                />
                            </div>

                            {/* Cake Diameters - HIDDEN/LOCKED for Combo */}
                            <div>
                                <Label className="mb-2 block">Cake Size</Label>
                                <div className="p-3 bg-muted/50 rounded-md border border-dashed border-primary/30 text-sm text-muted-foreground">
                                    <span className="font-semibold text-primary">Fixed Size: </span> 
                                    4-inch Bento Cake (Standard for Combos)
                                </div>
                                {/* Hidden input or state is handled automatically */}
                            </div>

                            {/* Inscription */}
                            <div className="flex items-center gap-2 pt-2">
                                <Switch id="comboInscription" checked={comboAllowInscription} onCheckedChange={setComboAllowInscription} />
                                <Label htmlFor="comboInscription">Allow Custom Inscription on Cake?</Label>
                            </div>
                        </div>
                    )}
                 </div>
              </CardContent>
            </Card>
          )}

          {/* 4. DIAMETERS CONFIG */}
          {productType === 'cake' && (
          <Card>
            <CardHeader>
              <CardTitle>Size Configuration</CardTitle>
              <CardDescription>
                Select available sizes and their price multipliers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AVAILABLE */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Available Sizes
                  </h4>
                  <div className="space-y-2">
                    {unassignedDiameters.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded-md">
                        No more sizes available.
                      </p>
                    ) : (
                      unassignedDiameters.map((diameter) => {
                        const Icon = diameter.illustration
                          ? iconMap[diameter.illustration]
                          : null;
                        return (
                          <div
                            key={diameter._id}
                            className="flex items-center justify-between p-3 border rounded-md bg-subtleBackground/50 hover:bg-subtleBackground transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {Icon && <Icon className={iconSizeClass} />}
                              <span className="font-medium text-sm">
                                {diameter.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => addDiameter(diameter._id)}
                              className="h-8 px-3"
                            >
                              Add
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ASSIGNED */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned Sizes
                  </h4>
                  <div className="space-y-2">
                    {assignedDiameters.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded-md">
                        No sizes added yet.
                      </p>
                    ) : (
                      assignedDiameters.map((diameter) => {
                        const Icon = diameter.illustration
                          ? iconMap[diameter.illustration]
                          : null;
                        return (
                          <div
                            key={diameter.diameterId}
                            className="flex items-center gap-2 p-3 border border-primary/20 bg-primary/5 rounded-md"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {Icon && (
                                <Icon className="h-6 w-6 text-primary" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-primary">
                                  {diameter.name}
                                </span>
                                <span className="text-[10px] text-primary/70">
                                  {diameter.sizeValue}"
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                x
                              </span>
                              <Input
                                type="number"
                                placeholder="1.0"
                                step="0.1"
                                className="w-20 h-8 text-right bg-white"
                                value={diameter.multiplier}
                                onChange={(e) =>
                                  handleDiameterConfigChange(
                                    diameter.diameterId,
                                    e.target.value
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeDiameter(diameter.diameterId)
                                }
                                className="text-red-400 hover:text-red-600 ml-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryId} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat._id.toString()}
                        value={cat._id.toString()}
                      >
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Collections</label>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {collections.map((collection) => (
                    <div
                      key={collection._id.toString()}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-subtleBackground transition-colors"
                    >
                      <Checkbox
                        id={`collection-${collection._id.toString()}`}
                        checked={collectionIds.includes(
                          collection._id.toString()
                        )}
                        onCheckedChange={() =>
                          handleMultiSelectChange(
                            collection._id.toString(),
                            setCollectionIds
                          )
                        }
                      />
                      <label
                        htmlFor={`collection-${collection._id.toString()}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {collection.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CUSTOMIZATION SETTINGS */}
          {productType === 'cake' && (
          <Card>
            <CardHeader>
              <CardTitle>Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md bg-subtleBackground">
                <Label
                  htmlFor="inscriptionAvailable"
                  className="text-sm font-medium cursor-pointer"
                >
                  Allow Custom Text?
                </Label>
                <Switch
                  id="inscriptionAvailable"
                  checked={inscriptionAvailable}
                  onCheckedChange={(checked) =>
                    setInscriptionAvailable(Boolean(checked))
                  }
                />
              </div>

              {inscriptionAvailable && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                  <div className="grid gap-1">
                    <label
                      htmlFor="inscriptionPrice"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Extra Cost ($)
                    </label>
                    <Input
                      id="inscriptionPrice"
                      type="number"
                      value={inscriptionPrice}
                      onChange={(e) => setInscriptionPrice(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label
                      htmlFor="inscriptionMaxLength"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Max Characters
                    </label>
                    <Input
                      id="inscriptionMaxLength"
                      type="number"
                      value={inscriptionMaxLength}
                      onChange={(e) => setInscriptionMaxLength(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        <div className="space-y-8">
          {/* ACTION CARD */}
          <Card className="sticky top-6 bg-subtleBackground">
            <CardHeader className="pb-4">
              <CardTitle>
                {isEditMode ? "Update Product" : "Publish Product"}
              </CardTitle>
              <CardDescription>Review settings before saving.</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label className="text-base">Status</Label>
                  <div className="text-sm text-muted-foreground">
                     {isActive ? "Active (Visible to customers)" : "Draft (Hidden)"}
                  </div>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Product"}
              </Button>
            </CardFooter>
          </Card>

          {/* ORGANIZATION */}
        </div>
      </div>

      {/* Confirmation Modal - Remove Image */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          if (imageToDeleteIndex !== null) {
            handleRemoveImage(imageToDeleteIndex);
            setImageToDeleteIndex(null);
            setIsConfirmationOpen(false);
            showAlert("Image removed successfully", "success");
          }
        }}
        title="Remove Image?"
        variant="danger"
        confirmText="Remove"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to remove this image? This action cannot be
          undone if you save the product.
        </p>
      </ConfirmationModal>

      {/* Confirmation Modal - Save Product */}
      <ConfirmationModal
        isOpen={isSaveConfirmationOpen}
        onClose={() => setIsSaveConfirmationOpen(false)}
        onConfirm={confirmSave}
        title={isEditMode ? "Save Changes?" : "Create Product?"}
        variant="primary"
        confirmText={isEditMode ? "Save" : "Create"}
        cancelText="Review"
      >
        <p>
          Are you sure you want to{" "}
          {isEditMode ? "save these changes" : "create this product"}? Please
          review all details before confirming.
        </p>
      </ConfirmationModal>
    </form>
  );
};

export default ProductForm;
