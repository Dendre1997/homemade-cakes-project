"use client";

import { useState, useRef } from "react";
import { Flavor, Diameter, OrderItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import HybridSelector from "@/components/admin/custom-orders/HybridSelector";
import ImageSelector from "@/components/admin/custom-orders/ImageSelector";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import {  Plus } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

interface CustomOrderItemFormProps {
  flavors: Flavor[];
  diameters: Diameter[];
  onSubmit: (item: OrderItem) => void;
  onCancel?: () => void;
  initialValues?: {
      id?: string;
      images: string[];
      selectedImage: string;
      sizeValue: string;
      flavorValue: string;
      description: string;
      price: number;
  };
  submitLabel?: string;
}

export default function CustomOrderItemForm({
  flavors,
  diameters,
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = "Add to Order",
}: CustomOrderItemFormProps) {
  const { showAlert } = useAlert();
  
  // -- State --
  const [images, setImages] = useState<string[]>(initialValues?.images || []);
  const [selectedImage, setSelectedImage] = useState<string>(initialValues?.selectedImage || "");
  const [sizeValue, setSizeValue] = useState<string>(initialValues?.sizeValue || "");
  const [flavorValue, setFlavorValue] = useState<string>(initialValues?.flavorValue || "");
  const [description, setDescription] = useState<string>(initialValues?.description || "");
  const [price, setPrice] = useState<number>(initialValues?.price || 0);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Handlers --

  // 1. Image Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
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

  const handleRemoveImage = async (urlToRemove: string) => {
      
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
      if (price <= 0) {
          showAlert("Price must be greater than 0", "error");
          return;
      }
      if (!sizeValue) {
          showAlert("Please specify a size", "error");
          return;
      }
      if (!flavorValue) {
          showAlert("Please specify a flavor", "error");
          return;
      }

      const isCustomSize = !diameters.some(d => d._id === sizeValue);
      const isCustomFlavor = !flavors.some(f => f._id === flavorValue);
      
      const sizeName = isCustomSize 
          ? sizeValue 
          : diameters.find(d => d._id === sizeValue)?.name || "Unknown Size";
      

      const newItem: any = {
          id: initialValues?.id || `new-custom-${Date.now()}`, // Preserve ID on edit
          name: `Custom Cake - ${sizeName}`,
          productType: 'custom',
          price: price,
          originalPrice: price,
          quantity: 1,
          imageUrl: selectedImage || images[0] || "",
          
          isManualPrice: true,
          isCustom: true,
          adminNotes: description,
          
          // Hybrid Logic
          customSize: isCustomSize ? sizeValue : undefined,
          diameterId: !isCustomSize ? sizeValue : undefined,
          
          customFlavor: isCustomFlavor ? flavorValue : undefined,
          flavor: isCustomFlavor ? flavorValue : undefined,
          selectedConfig: (!isCustomFlavor || !isCustomSize) ? {
              cake: {
                  flavorId: !isCustomFlavor ? flavorValue : "",
                  diameterId: !isCustomSize ? sizeValue : ""
              }
          } : undefined
      };
      
      newItem.flavor = flavorValue; 
      
      onSubmit(newItem);
  };

  return (
    <div className=" p-4 rounded-lg  ">
       <div className="flex justify-between items-center mb-6  pb-4">
           <h3 className="text-lg font-bold text-primary">New Custom Item Design</h3>
           {/* {onCancel && (
               <Button variant="ghost" size="sm" onClick={onCancel}>
                   <X className="w-4 h-4" />
               </Button>
           )} */}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           {/* LEFT: Images & Description (5 cols) */}
           <div className="md:col-span-5 space-y-6">
               <div>
                   <Label className="mb-2 block">Reference Images</Label>
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

               <div>
                   <Label className="mb-2 block">Admin Notes / Specs</Label>
                   <Textarea 
                       placeholder="Detailed requirements, colors, theme, etc..."
                       rows={6}
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       className="bg-yellow-50 border-yellow-200 focus:border-yellow-400"
                   />
               </div>
           </div>

           {/* RIGHT: Specs & Price (7 cols) */}
           <div className="md:col-span-7 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                   <HybridSelector 
                       label="Size / Configuration"
                       options={diameters}
                       value={sizeValue}
                       onChange={(val) => setSizeValue(val)}
                   />
                   <HybridSelector 
                       label="Flavor Profile"
                       options={flavors}
                       value={flavorValue}
                       onChange={(val) => setFlavorValue(val)}
                   />
               </div>
               
               <div className="bg-gray-50 p-4 rounded-md border text-sm text-gray-600">
                   <p>Use the selectors above to choose a stock Option (ID) or type a Custom Value.</p>
               </div>

               <div className="pt-4 border-t">
                   <Label className="mb-2 block">Manual Price ($)</Label>
                   <div className="flex items-center gap-4">
                       <Input 
                           type="number" 
                           min="0"
                           step="0.01"
                           className="text-2xl font-bold w-48"
                           placeholder="0.00"
                           value={price || ""}
                           onChange={(e) => setPrice(parseFloat(e.target.value))}
                       />
                       <div className="text-sm text-gray-500">
                           * Override any calculated pricing.
                       </div>
                   </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                   {onCancel && (
                       <Button variant="ghost" onClick={onCancel}>
                           Cancel
                       </Button>
                   )}
                   <Button onClick={handleSubmit} disabled={isUploading}>
                       <Plus className="w-4 h-4 mr-2" />
                       Add to Order
                   </Button>
               </div>
           </div>
       </div>
    </div>
  );
}
