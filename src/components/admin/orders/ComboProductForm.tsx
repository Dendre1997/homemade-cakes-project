"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ProductCategory, Flavor, Diameter, SelectedAddon, IGalleryImage, CatalogSet } from "@/types";
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
  pinnedActions?: boolean;
  insetSafeArea?: boolean;
}

export const ComboProductForm = ({
  allCategories,
  allFlavors,
  allDiameters,
  onAdd,
  onCancel,
  initialValues,
  pinnedActions = false,
  insetSafeArea = true,
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
  const [selectedSetId, setSelectedSetId] = useState("");
  const [categorySets, setCategorySets] = useState<CatalogSet[]>([]);
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

  const selectedCategorySet = categorySets.find((set) => String(set._id) === selectedSetId);
  const maxItemsPerBox = selectedCategorySet?.pieceCount || (selectedBoxSize ? parseInt(selectedBoxSize) : 0);
  const currentTotalItems = Object.values(flavorCounts).reduce((a, b) => a + b, 0);
  const remainingItems = maxItemsPerBox - currentTotalItems;
  const currentFlavorCount = Object.keys(flavorCounts).length;

  useEffect(() => {
    if (!selectedSetCategoryId) {
      setCategorySets([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/sets?categoryId=${selectedSetCategoryId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setCategorySets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCategorySets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSetCategoryId]);

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
        if (config.setId) setSelectedSetId(String(config.setId));
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
      if (count === 0 && !selectedCategorySet && currentFlavorCount >= 5) {
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
               ...(selectedCategorySet
                 ? {
                     setId: String(selectedCategorySet._id),
                     setName: selectedCategorySet.name,
                     pieceCount: selectedCategorySet.pieceCount,
                     quantityConfigId: selectedCategorySet.name,
                   }
                 : { quantityConfigId: selectedBoxSize }),
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

  const sheetScroll = pinnedActions
    ? "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
    : "space-y-5";
  const sheetActions = pinnedActions
    ? `flex w-full min-w-0 shrink-0 gap-2 border-t border-primary/10 bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 ${insetSafeArea ? "pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4" : ""}`
    : "flex w-full min-w-0 gap-2 border-t border-primary/10 pt-4";

  return (
    <div className={pinnedActions ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden" : "w-full min-w-0 space-y-5"}>
        {step === 1 ? (
          <>
          <div className={sheetScroll}>
              <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
              <h4 className="text-sm font-bold uppercase text-primary/70">Step 1: Center Cake</h4>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cake Category</label>
                  <Select value={selectedSingleCategoryId} onValueChange={(val) => {
                      setSelectedSingleCategoryId(val);
                      setSelectedSingleDiameterId("");
                      setSelectedSingleFlavorId("");
                  }}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-300 bg-white sm:h-10">
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
                  <div className="grid min-w-0 w-full grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="min-w-0">
                          <label className="block text-sm font-medium mb-1">Cake Size</label>
                          <Select value={selectedSingleDiameterId} onValueChange={setSelectedSingleDiameterId}>
                              <SelectTrigger className="h-11 rounded-xl bg-white sm:h-10">
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
                              <SelectTrigger className="h-11 rounded-xl bg-white sm:h-10">
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
              </section>

              {selectedSingleCategoryId && (
                  <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                  <div className="space-y-3 mt-4 min-w-0 max-w-full w-full overflow-hidden">
                     <Label className="block border-b pb-2">Integrated Portfolio Gallery</Label>
                     {singleGalleryImages.length > 0 ? (
                         <div className="min-w-0 w-full max-w-full overflow-hidden">
                           <div className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2 gap-3">
                            {singleGalleryImages.map(img => (
                                <div 
                                   key={img._id.toString()}
                                   onClick={() => handlePickFromGallery(img.imageUrl)}
                                   className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border transition-[border-color] hover:border-accent"
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
                      {isUploading && <p className="text-xs text-primary mt-1 animate-pulse">Uploading…</p>}
                  </div>
                  </section>
              )}

              <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                  <label className="block text-sm font-medium mb-1">Cake Inscription</label>
                  <input 
                      value={inscription}
                      onChange={e => setInscription(e.target.value)}
                      placeholder="Happy Birthday…"
                      className="h-11 w-full rounded-xl border bg-white sm:h-10"
                  />

              <AddonAdminSelector 
                  categoryId={selectedSingleCategoryId}
                  selectedAddons={singleAddons}
                  onChange={setSingleAddons}
              />
              </section>
          </div>
              <div className={sheetActions}>
                  <Button variant="outline" onClick={onCancel} className="h-11 flex-1 rounded-xl sm:h-10">
                      Cancel
                  </Button>
                  <Button variant="primary" onClick={handleNextStep} disabled={!isStep1Complete} className="h-11 flex-1 rounded-xl sm:h-10">
                      Next Step <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
              </div>
          </>
        ) : (
          <>
          <div className={sheetScroll}>
              <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm min-w-0">
                      <span className="font-bold block">Cake Selected:</span>
                      <span className="text-gray-600">
                          {allDiameters.find(d => d._id === selectedSingleDiameterId)?.name} • {allFlavors.find(f => f._id === selectedSingleFlavorId)?.name}
                      </span>
                  </div>
                  <Button variant="outline" onClick={() => setStep(1)} className="h-11 self-start rounded-xl sm:h-10 sm:self-auto">
                      <ArrowLeft className="mr-1 h-4 w-4 shrink-0" /> Edit
                  </Button>
              </div>
              </section>

              <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
              <h4 className="text-sm font-bold uppercase text-primary/70">Step 2: Treats</h4>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Box Category</label>
                  <Select value={selectedSetCategoryId} onValueChange={(val) => {
                      setSelectedSetCategoryId(val);
                      setFlavorCounts({});
                  }}>
                      <SelectTrigger className="h-11 rounded-xl border-gray-300 bg-white sm:h-10">
                          <SelectValue placeholder="Select Box Category" />
                      </SelectTrigger>
                      <SelectContent>
                          {setCategories.map(c => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              </section>

              {selectedSetCategoryId && (
                <div className="flex w-full min-w-0 max-w-full flex-col gap-5">
                  <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                     <Label className="block border-b pb-2">Integrated Portfolio Gallery</Label>
                     {setGalleryImagesList.length > 0 ? (
                         <div className="min-w-0 w-full max-w-full overflow-hidden">
                           <div className="flex w-full min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin pb-2 gap-3">
                            {setGalleryImagesList.map(img => (
                                <div 
                                   key={img._id.toString()}
                                   onClick={() => handlePickFromGallery(img.imageUrl)}
                                   className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border transition-[border-color] hover:border-accent"
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
                  </section>

                  <section className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                      <Label className="mb-2 flex min-w-0 items-center justify-between">
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
                      {isUploading && <p className="text-xs text-primary mt-1 animate-pulse">Uploading…</p>}
                  </section>

                  <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                    <Label className="block text-sm font-medium mb-1">Design Description</Label>
                    <Textarea
                      placeholder="Any special design instructions for the combo…"
                      value={designDescription}
                      onChange={(e) => setDesignDescription(e.target.value)}
                      rows={3}
                      className="min-h-[96px] rounded-xl bg-white"
                    />
                  </div>

                  <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
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
                            setSelectedSetId("");
                            setFlavorCounts({});
                          }}
                          className="h-11 w-full rounded-xl bg-white sm:h-10 sm:w-56"
                        />
                        <span className="text-muted-foreground text-sm hidden sm:inline">or pick:</span>
                        <Select value={selectedCategorySet ? selectedSetId : selectedBoxSize} onValueChange={(val) => {
                            const set = categorySets.find((candidate) => String(candidate._id) === val);
                            if (set) {
                              setSelectedSetId(String(set._id));
                              setSelectedBoxSize(String(set.pieceCount));
                            } else {
                              setSelectedSetId("");
                              setSelectedBoxSize(val);
                            }
                            setCustomBoxSize("");
                            setFlavorCounts({});
                        }}>
                            <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:h-10 sm:min-w-[150px]">
                                <SelectValue placeholder="Select box size" />
                            </SelectTrigger>
                            <SelectContent>
                                {categorySets.length > 0
                                  ? categorySets.map((set) => (
                                      <SelectItem key={String(set._id)} value={String(set._id)}>
                                        {set.name} ({set.pieceCount} pieces)
                                      </SelectItem>
                                    ))
                                  : (
                                    <>
                                      <SelectItem value="6">Box of 6</SelectItem>
                                      <SelectItem value="12">Box of 12</SelectItem>
                                      <SelectItem value="24">Box of 24</SelectItem>
                                    </>
                                  )}
                            </SelectContent>
                        </Select>
                      </div>
                  </div>

                  {selectedBoxSize && (
                      <div className="min-w-0 rounded-xl border border-primary/10 bg-background/60 p-3">
                          <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                              <label className="text-sm font-bold text-gray-700">
                                {selectedCategorySet
                                  ? `Distribute flavors. This set allows up to ${selectedCategorySet.maxFlavors} ${selectedCategorySet.maxFlavors === 1 ? "flavor" : "flavors"}; you can choose more.`
                                  : "Distribute Flavors (Max 5)"}
                              </label>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${remainingItems === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {remainingItems === 0 ? "Box Full" : `Remaining slots: ${remainingItems}`}
                              </span>
                          </div>
                          <div className="grid max-h-60 min-w-0 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-2">
                               {setFlavors.map(f => {
                                   const count = flavorCounts[f._id] || 0;
                                   return (
                                       <div key={f._id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background/80 p-2">
                                           <span className="min-w-0 flex-1 break-words text-sm" title={f.name}>{f.name}</span>
                                           <div className="flex items-center gap-2 flex-shrink-0">
                                               <button 
                                                  type="button"
                                                  onClick={() => handleDecrementFlavor(f._id)}
                                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 hover:bg-gray-300 disabled:opacity-50 sm:h-10 sm:w-10"
                                                  disabled={count === 0}
                                               >
                                                  <Minus className="h-4 w-4 shrink-0" />
                                               </button>
                                               <span className="w-4 text-center text-sm font-bold">{count}</span>
                                               <button 
                                                  type="button"
                                                  onClick={() => handleIncrementFlavor(f._id)}
                                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:w-10"
                                                  disabled={remainingItems <= 0 || (!selectedCategorySet && count === 0 && currentFlavorCount >= 5)}
                                               >
                                                  <Plus className="h-4 w-4 shrink-0" />
                                               </button>
                                           </div>
                                       </div>
                                   );
                              })}
                          </div>
                      </div>
                  )}

                  <div className="min-w-0 space-y-3.5 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:p-4">
                       <label className="block text-sm font-medium mb-1">Flavor Note (Optional)</label>
                       <input 
                          value={flavorNote}
                          onChange={e => setFlavorNote(e.target.value)}
                          placeholder="e.g. less sweet, specific inquiry"
                          className="h-11 w-full rounded-xl border sm:h-10"
                       />
                  <AddonAdminSelector 
                      categoryId={selectedSetCategoryId}
                      selectedAddons={setAddons}
                      onChange={setSetAddons}
                  />
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-primary/10 bg-background/40 p-3.5 sm:grid-cols-2 sm:p-4">
                      <div>
                           <label className="block text-sm font-medium mb-1">Order Qty (Combos)</label>
                           <input 
                              type="number"
                              min="1"
                              value={qty}
                              onChange={e => setQty(parseInt(e.target.value) || 1)}
                              className="h-11 w-full rounded-xl border sm:h-10"
                           />
                      </div>
                      <div>
                           <label className="block text-sm font-medium mb-1">Total Unit Price ($)</label>
                           <input 
                              type="number"
                              value={priceOverride}
                              onChange={e => setPriceOverride(e.target.value)}
                              placeholder="Enter price…"
                              className="h-11 w-full rounded-xl border sm:h-10"
                           />
                      </div>
                  </div>
                </div>
              )}
          </div>
              <div className={sheetActions}>
                  <Button variant="outline" onClick={onCancel} className="h-11 flex-1 rounded-xl sm:h-10">
                      Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddCombo} className="h-11 flex-1 rounded-xl sm:h-10">
                      <Plus className="mr-2 h-4 w-4 shrink-0" />
                      Add to Order
                  </Button>
              </div>
          </>
        )}
    </div>
  );
};
