"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ProductCategory, Flavor, Diameter, SelectedAddon, IGalleryImage } from "@/types";
import { Button } from "@/components/ui/Button";
import { Plus, Minus, ArrowLeft, ArrowRight } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { AddonAdminSelector } from "@/components/admin/addons/AddonAdminSelector";
import ImageSelector from "@/components/admin/custom-orders/ImageSelector";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import { appendCloudinaryUploadPreset, cloudinaryUploadUrl } from "@/lib/cloudinaryClient";
import Image from "next/image";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

import { BoxIcon as BoxIconSix } from "@/components/icons/quantityIcons/BoxIconSix";
import { BoxIconTwelve } from "@/components/icons/quantityIcons/BoxIconTwelve";
import { BoxIconTwentyFour } from "@/components/icons/quantityIcons/BoxIconTwentyFour";

const BOX_SIZES = [
  { value: "6", label: "Box of", Icon: BoxIconSix },
  { value: "12", label: "Box of", Icon: BoxIconTwelve },
  { value: "24", label: "Box of", Icon: BoxIconTwentyFour },
];

interface ComboProductFormProps {
  allCategories: ProductCategory[];
  allFlavors: Flavor[];
  allDiameters: Diameter[];
  onAdd: (item: any) => void;
  onCancel: () => void;
  initialValues?: any;
}

export const ComboProductForm = ({
  allCategories,
  allFlavors,
  allDiameters,
  onAdd,
  onCancel,
  initialValues
}: ComboProductFormProps) => {
  const { showAlert } = useAlert();

  const [step, setStep] = useState<1 | 2>(1);

  // --- Image Reference State ---
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<IGalleryImage[]>([]);

  useEffect(() => {
    fetch("/api/admin/gallery")
      .then(r => r.json())
      .then(setGalleryImages)
      .catch(console.error);
  }, []);

  // --- Step 1 State (The Cake) ---
  const [selectedSingleCategoryId, setSelectedSingleCategoryId] = useState("");
  const [selectedSingleDiameterId, setSelectedSingleDiameterId] = useState("");
  const [selectedSingleFlavorId, setSelectedSingleFlavorId] = useState("");
  const [inscription, setInscription] = useState("");
  const [singleAddons, setSingleAddons] = useState<SelectedAddon[]>([]);

  // --- Step 2 State (The Box) ---
  const [selectedSetCategoryId, setSelectedSetCategoryId] = useState("");
  const [selectedBoxSize, setSelectedBoxSize] = useState("");
  const [customBoxSize, setCustomBoxSize] = useState("");
  const [designDescription, setDesignDescription] = useState("");
  const [flavorCounts, setFlavorCounts] = useState<Record<string, number>>({});
  const [flavorNote, setFlavorNote] = useState("");
  const [setAddons, setSetAddons] = useState<SelectedAddon[]>([]);
  
  // Shared Output State
  const [qty, setQty] = useState(1);
  const [priceOverride, setPriceOverride] = useState("");

  // --- Derived Step 1 ---
  const singleCategories = useMemo(() => allCategories.filter(c => c.categoryType === 'single'), [allCategories]);
  
  const singleFlavors = useMemo(() => {
    if (!selectedSingleCategoryId) return [];
    return allFlavors.filter(f => f.categoryIds?.includes(selectedSingleCategoryId));
  }, [allFlavors, selectedSingleCategoryId]);

  const singleDiameters = useMemo(() => {
    if (!selectedSingleCategoryId) return [];
    return allDiameters.filter(d => d.categoryIds?.includes(selectedSingleCategoryId));
  }, [allDiameters, selectedSingleCategoryId]);

  const singleGalleryImages = useMemo(() => {
    if (!selectedSingleCategoryId) return [];
    return galleryImages.filter(img => img.categories?.includes(selectedSingleCategoryId));
  }, [galleryImages, selectedSingleCategoryId]);

  const isStep1Complete = selectedSingleCategoryId && selectedSingleDiameterId && selectedSingleFlavorId;

  // --- Derived Step 2 ---
  const setCategories = useMemo(() => allCategories.filter(c => c.categoryType === 'set'), [allCategories]);
  
  const setFlavors = useMemo(() => {
    if (!selectedSetCategoryId) return [];
    return allFlavors.filter(f => f.categoryIds?.includes(selectedSetCategoryId));
  }, [allFlavors, selectedSetCategoryId]);

  const setGalleryImagesList = useMemo(() => {
    if (!selectedSetCategoryId) return [];
    return galleryImages.filter(img => img.categories?.includes(selectedSetCategoryId));
  }, [galleryImages, selectedSetCategoryId]);

  const maxItemsPerBox = selectedBoxSize ? parseInt(selectedBoxSize) : 0;
  const currentTotalItems = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
  const remainingItems = maxItemsPerBox - currentTotalItems;
  const currentFlavorCount = Object.keys(flavorCounts).length;

  useEffect(() => {
    if (initialValues) {
      if (initialValues.selectedConfig) {
        const config = initialValues.selectedConfig;
        if (config.cake) {
          setSelectedSingleFlavorId(config.cake.flavorId || "");
          setSelectedSingleDiameterId(config.cake.diameterId || "");
          setInscription(config.cake.inscription || "");
        }
        if (config.items) {
          const counts: Record<string, number> = {};
          config.items.forEach((it: any) => { counts[it.flavorId] = it.count; });
          setFlavorCounts(counts);
          
          if (config.setCategoryId) {
              setSelectedSetCategoryId(config.setCategoryId);
          } else if (config.items.length > 0) {
              const firstFlavorId = config.items[0].flavorId;
              const matchedFlavor = allFlavors.find(f => f._id === firstFlavorId);
              if (matchedFlavor && matchedFlavor.categoryIds) {
                  const setCategory = allCategories.find(c => 
                      c.categoryType === 'set' && matchedFlavor.categoryIds?.includes(c._id)
                  );
                  if (setCategory) setSelectedSetCategoryId(setCategory._id);
              }
          }
        }
        setSelectedBoxSize(config.quantityConfigId || "");
        setCustomBoxSize(config.quantityConfigId || "");
      }
      setDesignDescription(initialValues.designInstructions || "");
      setPriceOverride(initialValues.price?.toString() || "");
      setQty(initialValues.quantity || 1);
      if (initialValues.categoryId) setSelectedSingleCategoryId(initialValues.categoryId);
      
      if (initialValues.referenceImages?.length) {
          setImages(initialValues.referenceImages);
      } else if (initialValues.imageUrl) {
          setImages([initialValues.imageUrl]);
      }
      if (initialValues.imageUrl) {
          setSelectedImage(initialValues.imageUrl);
      }
      if (initialValues.addons?.length) {
          setSingleAddons(initialValues.addons);
      }
    }
  }, [initialValues, allFlavors, allCategories]);

  // --- Handlers ---
  const handlePickFromGallery = (url: string) => {
    if (!images.includes(url)) {
      setImages(prev => [...prev, url]);
      if (!selectedImage) setSelectedImage(url);
    }
  };

  const handleRemoveImage = async (urlToRemove: string) => {
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

  const handleNextStep = () => {
    if (!isStep1Complete) {
      showAlert("Please select category, diameter, and flavor for the cake.", "warning");
      return;
    }
    setStep(2);
  };

  const handleIncrementFlavor = (flavorId: string) => {
      if (remainingItems <= 0) return;
      
      const count = flavorCounts[flavorId] || 0;
      if (count === 0 && currentFlavorCount >= 5) {
          showAlert("Maximum of 5 different flavors allowed.", "warning");
          return;
      }

      setFlavorCounts(prev => ({
          ...prev,
          [flavorId]: count + 1
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

  const handleAddCombo = () => {
       if (!selectedSetCategoryId) {
           showAlert("Please select a category for the box items.", "warning");
           return;
       }
       if (!selectedBoxSize) {
           showAlert("Please select a box size.", "warning");
           return;
       }
       if (remainingItems !== 0) {
           showAlert(`Please select exactly ${maxItemsPerBox} box items (Remaining: ${Math.abs(remainingItems)})`, "warning");
           return;
       }

       const finalPrice = parseFloat(priceOverride) || 0;
       if (finalPrice <= 0 && !priceOverride) {
           showAlert("Please enter a unit price for the combo.", "warning");
           return;
       }

       const selectedItemsArray = Object.entries(flavorCounts).map(([fId, count]) => ({
           flavorId: fId,
           count
       }));

       const singleCategoryName = allCategories.find(c => c._id === selectedSingleCategoryId)?.name || 'Cake';
       const setCategoryName = allCategories.find(c => c._id === selectedSetCategoryId)?.name || 'Box';
       const singleFlavorName = allFlavors.find(f => f._id === selectedSingleFlavorId)?.name || '';

       const newItem = {
           id: `manual-${Date.now()}`,
           name: `Combo: ${singleCategoryName} + ${setCategoryName}`,
           categoryId: selectedSingleCategoryId,
           flavor: `${singleFlavorName} cake + ${setCategoryName} box`,
           price: finalPrice,
           quantity: qty,
           isCustom: true,
           isCombo: true,
           designInstructions: designDescription,
           referenceImages: images,
           imageUrl: selectedImage || images[0] || "",
           addons: [...singleAddons, ...setAddons],
           selectedConfig: {
               setCategoryId: selectedSetCategoryId,
               quantityConfigId: selectedBoxSize,
               items: selectedItemsArray,
               cake: {
                   flavorId: selectedSingleFlavorId,
                   diameterId: selectedSingleDiameterId,
                   inscription: inscription
               }
           }
       };
       
       onAdd(newItem);
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden space-y-6 animate-in fade-in slide-in-from-top-2 border p-3 sm:p-6 rounded-lg bg-gray-50 relative">
        <h3 className="font-bold text-gray-800 text-lg flex items-center justify-between min-w-0 gap-2">
            <span className="min-w-0 truncate">Configure Combo Item</span>
            <span className="text-xs bg-accent text-white px-2 py-1 rounded">Combo</span>
        </h3>

        {step === 1 ? (
          <div className="w-full min-w-0 max-w-full overflow-hidden space-y-4">
              <h4 className="font-bold text-gray-700 uppercase text-sm">Step 1: Center Cake</h4>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cake Category</label>
                  <Select value={selectedSingleCategoryId} onValueChange={(val) => {
                      setSelectedSingleCategoryId(val);
                      setSelectedSingleDiameterId("");
                      setSelectedSingleFlavorId("");
                  }}>
                      <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue placeholder="Select Cake Category" />
                      </SelectTrigger>
                      <SelectContent>
                          {singleCategories.map(c => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {selectedSingleCategoryId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0 max-w-full w-full">
                      <div className="min-w-0">
                          <label className="block text-sm font-medium mb-1">Cake Size</label>
                          <Select value={selectedSingleDiameterId} onValueChange={setSelectedSingleDiameterId}>
                              <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={singleDiameters.length ? "Select Size" : "No sizes"} />
                              </SelectTrigger>
                              <SelectContent>
                                  {singleDiameters.map(d => (
                                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="min-w-0">
                          <label className="block text-sm font-medium mb-1">Cake Flavor</label>
                          <Select value={selectedSingleFlavorId} onValueChange={setSelectedSingleFlavorId}>
                              <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={singleFlavors.length ? "Select Flavor" : "No flavors"} />
                              </SelectTrigger>
                              <SelectContent>
                                  {singleFlavors.map(f => (
                                      <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              )}

              {selectedSingleCategoryId && (
                  <div className="w-full min-w-0 max-w-full overflow-hidden">
                  <div className="space-y-3 mt-4 min-w-0 max-w-full w-full overflow-hidden">
                     <Label className="block border-b pb-2">Integrated Portfolio Gallery</Label>
                     {singleGalleryImages.length > 0 ? (
                         <div className="min-w-0 w-full max-w-full overflow-hidden">
                           <div className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2 gap-3">
                            {singleGalleryImages.map(img => (
                                <div 
                                   key={img._id.toString()}
                                   onClick={() => handlePickFromGallery(img.imageUrl)}
                                   className="relative shrink-0 w-24 h-24 overflow-hidden rounded-md border border-border cursor-pointer hover:border-accent hover:border-2 hover:scale-105 transition-all"
                                   title="Click to add as reference"
                                >
                                   <Image src={img.imageUrl} alt={img.title} fill quality={90} className="object-cover" sizes="96px" />
                                </div>
                            ))}
                           </div>
                         </div>
                     ) : (
                         <p className="text-xs text-gray-400 italic">No gallery images available for this category.</p>
                     )}
                  </div>
                  <div className="pt-4 border-t mt-4 mb-6 min-w-0 max-w-full w-full overflow-hidden">
                      <Label className="mb-2 flex items-center justify-between min-w-0">
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
                  </div>
              )}

              <div>
                  <label className="block text-sm font-medium mb-1">Cake Inscription</label>
                  <input 
                      value={inscription}
                      onChange={e => setInscription(e.target.value)}
                      placeholder="Happy Birthday..."
                      className="w-full p-2 border rounded-md bg-white"
                  />
              </div>

              <AddonAdminSelector 
                  categoryId={selectedSingleCategoryId}
                  selectedAddons={singleAddons}
                  onChange={setSingleAddons}
              />

              <div className="flex gap-2 pt-4 min-w-0 w-full">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                      Cancel
                  </Button>
                  <Button variant="primary" onClick={handleNextStep} disabled={!isStep1Complete} className="flex-1">
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
              </div>
          </div>
        ) : (
          <div className="w-full min-w-0 max-w-full overflow-hidden space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-3 rounded border min-w-0 max-w-full">
                  <div className="text-sm min-w-0">
                      <span className="font-bold block">Cake Selected:</span>
                      <span className="text-gray-600">
                          {allDiameters.find(d => d._id === selectedSingleDiameterId)?.name} • {allFlavors.find(f => f._id === selectedSingleFlavorId)?.name}
                      </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep(1)} className="self-start sm:self-auto">
                      <ArrowLeft className="w-3 h-3 mr-1" /> Edit
                  </Button>
              </div>

              <h4 className="font-bold text-gray-700 uppercase text-sm mt-6">Step 2: Box Items</h4>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Box Category</label>
                  <Select value={selectedSetCategoryId} onValueChange={(val) => {
                      setSelectedSetCategoryId(val);
                      setFlavorCounts({});
                  }}>
                      <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue placeholder="Select Box Category" />
                      </SelectTrigger>
                      <SelectContent>
                          {setCategories.map(c => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {selectedSetCategoryId && (
                <div className="w-full min-w-0 max-w-full overflow-hidden">
                  <div className="space-y-3 mt-4 min-w-0 max-w-full w-full overflow-hidden">
                     <Label className="block border-b pb-2">Integrated Portfolio Gallery</Label>
                     {setGalleryImagesList.length > 0 ? (
                         <div className="min-w-0 w-full max-w-full overflow-hidden">
                           <div className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2 gap-3">
                            {setGalleryImagesList.map(img => (
                                <div 
                                   key={img._id.toString()}
                                   onClick={() => handlePickFromGallery(img.imageUrl)}
                                   className="relative shrink-0 w-24 h-24 overflow-hidden rounded-md border border-border cursor-pointer hover:border-accent hover:border-2 hover:scale-105 transition-all"
                                   title="Click to add as reference"
                                >
                                   <Image src={img.imageUrl} alt={img.title} fill quality={90} className="object-cover" sizes="96px" />
                                </div>
                            ))}
                           </div>
                         </div>
                     ) : (
                         <p className="text-xs text-gray-400 italic">No gallery images available for this category.</p>
                     )}
                  </div>

                  <div className="pt-4 border-t mt-4 mb-6 min-w-0 max-w-full w-full overflow-hidden">
                      <Label className="mb-2 flex items-center justify-between min-w-0">
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

                  <div className="mb-6">
                    <Label className="block text-sm font-medium mb-1">Design Description</Label>
                    <Textarea
                      placeholder="Any special design instructions for the combo..."
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      rows={3}
                      className="bg-white"
                    />
                  </div>

                  <div>
                      <Label className="block text-sm font-medium mb-2">Box Size</Label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Or enter custom quantity"
                          value={customBoxSize}
                          onChange={(e) => {
                            setCustomBoxSize(e.target.value);
                            setSelectedBoxSize(e.target.value);
                            setFlavorCounts({});
                          }}
                          className="w-full sm:w-56 bg-white"
                        />
                        <span className="text-muted-foreground text-sm hidden sm:inline">or pick:</span>
                        <Select value={selectedBoxSize} onValueChange={(val) => {
                            setSelectedBoxSize(val);
                            setCustomBoxSize("");
                            setFlavorCounts({});
                        }}>
                            <SelectTrigger className="bg-white w-full sm:min-w-[150px]">
                                <SelectValue placeholder="Select box size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">Box of 6</SelectItem>
                                <SelectItem value="12">Box of 12</SelectItem>
                                <SelectItem value="24">Box of 24</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                  </div>

                  {selectedBoxSize && (
                      <div className="bg-white p-4 rounded-md border border-gray-200 mt-4">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-bold text-gray-700">Distribute Flavors (Max 5)</label>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${remainingItems === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {remainingItems === 0 ? "Box Full" : `Remaining slots: ${remainingItems}`}
                              </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                               {setFlavors.map(f => {
                                   const count = flavorCounts[f._id] || 0;
                                   return (
                                       <div key={f._id} className="flex items-center justify-between p-2 bg-gray-50 rounded border gap-2">
                                           <span className="text-sm truncate flex-1 min-w-0 mr-2" title={f.name}>{f.name}</span>
                                           <div className="flex items-center gap-2 flex-shrink-0">
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
                                                  disabled={remainingItems <= 0 || (count === 0 && currentFlavorCount >= 5)}
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

                  <div className="mt-4">
                       <label className="block text-sm font-medium mb-1">Flavor Note (Optional)</label>
                       <input 
                          value={flavorNote}
                          onChange={e => setFlavorNote(e.target.value)}
                          placeholder="e.g. less sweet, specific inquiry"
                          className="w-full p-2 border rounded-md"
                       />
                  </div>

                  <AddonAdminSelector 
                      categoryId={selectedSetCategoryId}
                      selectedAddons={setAddons}
                      onChange={setSetAddons}
                  />

                  <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                           <label className="block text-sm font-medium mb-1">Order Qty (Combos)</label>
                           <input 
                              type="number"
                              min="1"
                              value={qty}
                              onChange={e => setQty(parseInt(e.target.value) || 1)}
                              className="w-full p-2 border rounded-md"
                           />
                      </div>
                      <div>
                           <label className="block text-sm font-medium mb-1">Total Unit Price ($)</label>
                           <input 
                              type="number"
                              value={priceOverride}
                              onChange={e => setPriceOverride(e.target.value)}
                              placeholder="Enter price..."
                              className="w-full p-2 border rounded-md"
                           />
                      </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-6 min-w-0 w-full">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                      Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddCombo} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Order
                  </Button>
              </div>
          </div>
        )}
    </div>
  );
};
