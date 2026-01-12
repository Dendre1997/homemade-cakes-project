"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Mail, Phone, User, Save, ArrowRight, Lock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAlert } from "@/contexts/AlertContext";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Flavor, Diameter } from "@/types";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";
import HybridSelector from "./HybridSelector";
import ImageSelector from "./ImageSelector";



// Extended type for Admin view (includes _id, status, etc that aren't in form schema)
interface AdminCustomOrder extends Omit<CustomOrderFormData, "status" | "createdAt"> {
  _id: string;
  status: string;
  convertedOrderId?: string;
  adminSelectedImage?: string;
  adminNotes?: string;
  agreedPrice?: number;
  finalDescription?: string;
  finalSize?: string; // or ID
  finalFlavor?: string; // or ID
  createdAt?: string | Date;
}

interface CustomOrderDesignerProps {
  customOrder: AdminCustomOrder;
  flavors: Flavor[];
  diameters: Diameter[];
}

export default function CustomOrderDesigner({
  customOrder,
  flavors,
  diameters, 
}: CustomOrderDesignerProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const isConverted = customOrder.status === "converted";
  
  // State
  const [agreedPrice, setAgreedPrice] = useState<number | "">(customOrder.agreedPrice || "");
  const [adminNotes, setAdminNotes] = useState(customOrder.adminNotes || "");
  const [imageUrls, setImageUrls] = useState<string[]>(customOrder.referenceImageUrls || []);
  const [selectedImage, setSelectedImage] = useState(
    customOrder.adminSelectedImage || customOrder.referenceImageUrls?.[0] || ""
  );
  
  // Design Specs
  // Design Specs
  const [finalDescription, setFinalDescription] = useState(customOrder.finalDescription || customOrder.description || "");
  
  // Hybrid Selectors
  // Try to match flavor by ID (if it's an ID) or Name if it's text
  const initialFlavor = (() => {
      if (customOrder.finalFlavor) return customOrder.finalFlavor;
      
      const pref = customOrder.flavorPreferences;
      if (!pref) return "";

      // Check if pref matches any flavor ID directly
      if (flavors.some(f => f._id === pref)) return pref;

      // Check if pref matches any flavor Name (case-insensitive)
      const matcheFlavor = flavors.find(f => f.name.toLowerCase() === pref.toLowerCase());
      if (matcheFlavor) return matcheFlavor._id;

      return pref;
  })();

  const [sizeValue, setSizeValue] = useState(customOrder.finalSize || customOrder.servingSize || "");
  const [flavorValue, setFlavorValue] = useState(initialFlavor);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  // -- Delete Confirmation State --
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // -- Image Logic --
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setImageUrls((prevUrls) => [...prevUrls, ...newUrls]);
      if (!selectedImage && newUrls.length > 0) {
          setSelectedImage(newUrls[0]);
      }
      showAlert("Images uploaded successfully", "success");
    } catch (err) {
      console.error(err);
      showAlert("Failed to upload images", "error");
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = "";
    }
  };

  // 1. Trigger Modal
  const handleRemoveImage = (url: string) => {
      setImageToDelete(url);
      setShowDeleteModal(true);
  };

  // 2. Execute Delete
  const confirmDeleteImage = async () => {
      if (!imageToDelete) return;

      const urlToRemove = imageToDelete;
      setShowDeleteModal(false);
      setImageToDelete(null);

      // Optimistic Update
      const oldImageUrls = imageUrls;
      const oldSelectedImage = selectedImage;

      setImageUrls((prev) => prev.filter((u) => u !== urlToRemove));
      if (selectedImage === urlToRemove) {
          setSelectedImage("");
      }

      const publicId = getPublicIdFromUrl(urlToRemove);
      console.log("Attempting to delete image via API. Public ID:", publicId);

      if (!publicId) {
          console.error("Failed to extract ID from URL:", urlToRemove);
          showAlert("Invalid image URL structure", "error");
          // Revert
          setImageUrls(oldImageUrls);
          setSelectedImage(oldSelectedImage);
          return;
      }

      try {
          const res = await fetch("/api/admin/cloudinary-delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_id: publicId }),
          });

          const data = await res.json();
          
          if (res.ok) {
             console.log("Cloudinary Delete Success", data);
             showAlert("Image deleted.", "info");
             
             // Update DB
             const newUrls = oldImageUrls.filter(u => u !== urlToRemove);
             const payload = { referenceImageUrls: newUrls };
             
             await fetch(`/api/custom-orders/${customOrder._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
             });

          } else {
             console.error("Delete failed:", data);
             showAlert(`Failed to delete: ${data.message || "Unknown error"}`, "error");
             // Revert
             setImageUrls(oldImageUrls);
             setSelectedImage(oldSelectedImage);
          }
      } catch (err) {
          console.error("Failed to delete image from cloud:", err);
          showAlert("Delete function failed (Network?)", "error");
          // Revert
          setImageUrls(oldImageUrls);
          setSelectedImage(oldSelectedImage);
      }
  };

  const triggerUpload = () => {
      document.getElementById("hidden-file-input")?.click();
  };

  // -- Helpers --
  const executeSaveDraft = async () => {
    setIsSaving(true);
    setShowSaveModal(false);
    try {
      const payload = {
        agreedPrice: Number(agreedPrice),
        adminNotes,
        adminSelectedImage: selectedImage,
        finalDescription,
        finalSize: sizeValue,
        finalFlavor: flavorValue,
        referenceImageUrls: imageUrls,
      };

      const res = await fetch(`/api/custom-orders/${customOrder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save draft");
      
      router.refresh(); // Refresh server data
      showAlert("Draft saved successfully", "success");
    } catch (err) {
      console.error(err);
      showAlert("Failed to save draft", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const executeConvert = async () => {
    setIsConverting(true);
    setShowConvertModal(false);
    try {
        // Prepare Hybrid Configs
        const sizeIsId = diameters.some(d => d._id === sizeValue);
        const flavorIsId = flavors.some(f => f._id === flavorValue);

        const payload = {
            agreedPrice: Number(agreedPrice),
            finalDescription,
            selectedImage,
            selectedImageUrls: imageUrls,
            sizeConfig: sizeIsId ? { id: sizeValue } : { text: sizeValue },
            flavorConfig: flavorIsId ? { id: flavorValue } : { text: flavorValue },
        };

        const res = await fetch(`/api/custom-orders/${customOrder._id}/convert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to convert");

        // Redirect to new order
        router.push(`/bakery-manufacturing-orders/orders/${data.newOrderId}`);
        showAlert("Order converted successfully!", "success");

    } catch (err) {
        console.error(err);
        showAlert("Failed to convert order", "error");
        setIsConverting(false);
    }
  };

  const handleConvertClick = () => {
    if (!agreedPrice || Number(agreedPrice) <= 0) {
        showAlert("Please enter a valid Agreed Price before converting.", "warning");
        return;
    }
    setShowConvertModal(true);
  };


  return (
    <div className="min-h-screen pb-20">
      
      {/* Hidden Upload Input */}
      <input 
        type="file" 
        id="hidden-file-input"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        disabled={isUploading || isConverted}
      />

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteImage}
        title="Delete Image?"
        confirmText="Delete"
        variant="danger"
      >
        Are you sure you want to delete this image? This action cannot be undone.
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={executeSaveDraft}
        title="Save Draft?"
        confirmText="Save Changes"
        variant="primary"
      >
        This will update the internal notes and pricing for this request. It will NOT notify the customer yet.
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={executeConvert}
        title="Convert to Order"
        confirmText="Convert Now"
        variant="primary"
      >
        Are you sure you want to convert this request into a Production Order? 
        The customer will be linked, and the request will be locked.
      </ConfirmationModal>


      {/* 1. Converted Banner */}
      {isConverted && (
        <div className="bg-green-600 text-white p-4 text-center font-bold text-lg flex items-center justify-center gap-2 shadow-md">
            <Lock className="w-5 h-5" />
            Converted to Order 
            <a href={`/bakery-manufacturing-orders/orders/${customOrder.convertedOrderId}`} className="underline hover:text-green-100 ml-1">
                #{customOrder.convertedOrderId?.slice(-4)}
            </a>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 2. Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold font-heading text-gray-900">
                {customOrder.customerName}'s Request
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide
                    ${customOrder.status === 'new' ? 'bg-red-100 text-red-800' : 
                      customOrder.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
                      customOrder.status === 'converted' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}
                `}>
                    {customOrder.status}
                </span>
            </div>
            <p className="text-gray-500 flex items-center gap-2 text-sm">
               Received on {customOrder.createdAt ? format(new Date(customOrder.createdAt), "PPP") : "Unknown Date"}
            </p>
          </div>
          
          <div className="flex gap-3">
             {!isConverted && (
                 <>
                   <Button variant="outline" onClick={() => setShowSaveModal(true)} disabled={isSaving || isConverting}>
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                     Save Draft
                   </Button>
                   <Button onClick={handleConvertClick} disabled={isSaving || isConverting}>
                     {isConverting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                     Convert to Order
                   </Button>
                 </>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: SPECS (Size 2) */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* A. Image Manager */}
                <div className={`bg-white rounded-xl shadow-sm border p-6 ${isConverted ? "pointer-events-none opacity-80" : ""}`}>
                    <ImageSelector 
                        images={imageUrls}
                        selectedImage={selectedImage}
                        onSelect={setSelectedImage}
                        onRemove={handleRemoveImage}
                        onUpload={triggerUpload}
                    />
                    {isUploading && <p className="text-xs text-center mt-2 text-primary animate-pulse">Uploading images...</p>}
                </div>

                {/* B. Cake Specs */}
                <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-6 ${isConverted ? "pointer-events-none opacity-80" : ""}`}>
                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Final Specifications</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <div className="space-y-2">
                        <Label>Final Decoration Description</Label>
                        <Textarea 
                            rows={5}
                            value={finalDescription}
                            onChange={(e) => setFinalDescription(e.target.value)}
                            placeholder="Detailed instructions for the baker..."
                            className="resize-none"
                        />
                         <p className="text-xs text-gray-500">
                            Original Request: "{customOrder.description}"
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: DEAL & INFO (Size 1) */}
            <div className="space-y-8">
                
                {/* A. Customer Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Customer Info</h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <div className="font-bold text-primary">{customOrder.customerName}</div>
                                <div className="text-xs text-primary">Client</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-primary" />
                            <a href={`mailto:${customOrder.customerEmail}`} className="text-primary hover:underline text-sm font-medium">
                                {customOrder.customerEmail}
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-primary" />
                            <a href={`tel:${customOrder.customerPhone}`} className="text-gray-700 text-sm font-medium">
                                {customOrder.customerPhone}
                            </a>
                        </div>
                        
                        <div className="pt-4 mt-4 border-t">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-bold text-gray-800">
                                    {customOrder.eventDate ? format(new Date(customOrder.eventDate), "MMMM dd, yyyy") : "TBD"}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 ml-6">
                                {customOrder.eventType} &bull; {customOrder.servingSize} Guests
                            </div>
                        </div>
                    </div>
                </div>

                {/* B. Financials */}
                <div className={`bg-white rounded-xl shadow-sm border p-6 ${isConverted ? "pointer-events-none opacity-80" : ""}`}>
                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">The Deal</h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Agreed Price ($)</Label>
                            <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={agreedPrice}
                                onChange={(e) => setAgreedPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                className="text-2xl font-bold font-mono"
                            />
                            <p className="text-xs text-primary">
                                Client Budget: {customOrder.budgetRange}
                            </p>
                        </div>
                    </div>
                </div>

                {/* C. Internal Notes */}
                <div className={` rounded-xl shadow-sm border p-6 ${isConverted ? "pointer-events-none opacity-80" : ""}`}>
                     <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Admin Notes</h2>
                     <Textarea 
                        rows={4}
                        placeholder="Private notes for the team..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                     />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
