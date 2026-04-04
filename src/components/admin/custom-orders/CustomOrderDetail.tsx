"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomOrder } from "@/types";
import { useAlert } from "@/contexts/AlertContext";
import { CustomOrderDetailHeader } from "./CustomOrderDetailHeader";
import { CustomOrderSpecsForm } from "./CustomOrderSpecsForm";
import { CustomOrderContactForm } from "./CustomOrderContactForm";
import { CustomOrderLogisticsForm } from "./CustomOrderLogisticsForm";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface CustomOrderDetailProps {
  initialOrder: CustomOrder;
}

export default function CustomOrderDetail({ initialOrder }: CustomOrderDetailProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [order, setOrder] = useState<CustomOrder>(initialOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const handleFieldChange = (field: string, value: any) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const handleConvertClick = () => {
    if (!order.agreedPrice || isNaN(Number(order.agreedPrice))) {
      showAlert("Please enter a valid agreed price before converting.", "error");
      return;
    }
    setIsConvertModalOpen(true);
  };

  const handleConvertConfirm = async () => {
    setIsConvertModalOpen(false);
    setIsConverting(true);
    try {
      const res = await fetch(`/api/custom-orders/${order._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedPrice: Number(order.agreedPrice) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");

      setPaymentLink(data.paymentLink);
      showAlert("Order converted successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showAlert("Conversion failed: " + err.message, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const copyLinkAndDismiss = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      showAlert("Payment link copied to clipboard!", "success");
      setPaymentLink(null); // Clear after dismissing
      router.push('/bakery-manufacturing-orders/custom-orders/');
    }
  };

  const handleImageUpload = async (files: FileList) => {
    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "homemade_cakes_preset");
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.secure_url;
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setOrder((prev) => ({
        ...prev,
        referenceImages: [...(prev.referenceImages || []), ...urls],
      }));
      showAlert("Images uploaded!", "success");
    } catch (err) {
      console.error(err);
      showAlert("Failed to upload one or more images", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/custom-orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save changes");
      }
      
      showAlert("Custom Request updated successfully!", "success");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || "An error occurred during save", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <CustomOrderDetailHeader 
        id={order._id} 
        status={order.status} 
        agreedPrice={order.agreedPrice ?? null}
        onPriceChange={(price) => handleFieldChange("agreedPrice", price)}
        isSaving={isSaving} 
        onSave={handleSave}
        isConverting={isConverting}
        onConvert={handleConvertClick}
        paymentLink={paymentLink}
        onCopyAndDismiss={copyLinkAndDismiss}
      />

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <CustomOrderSpecsForm 
            order={order} 
            onChange={handleFieldChange} 
            onImageUpload={handleImageUpload}
            isUploading={isUploading}
          />
        </div>

        <div className="space-y-8">
          <CustomOrderContactForm 
            contact={order.contact} 
            onChange={handleFieldChange} 
          />
          <CustomOrderLogisticsForm 
            order={order} 
            onChange={handleFieldChange} 
          />
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConfirm={handleConvertConfirm}
        title="Convert to Order"
        confirmText="Confirm Conversion"
        variant="primary"
      >
        <p>
          Are you sure you want to convert this request into a real order with the agreed price of <strong>${order.agreedPrice}</strong>? This will generate a payment link for the customer.
        </p>
      </ConfirmationModal>
    </div>
  );
}
