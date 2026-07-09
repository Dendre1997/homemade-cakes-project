"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomOrder, IShape } from "@/types";
import { useAlert } from "@/contexts/AlertContext";
import { CustomOrderDetailHeader } from "./CustomOrderDetailHeader";
import { CustomOrderSpecsForm } from "./CustomOrderSpecsForm";
import { CustomOrderContactForm } from "./CustomOrderContactForm";
import { CustomOrderLogisticsForm } from "./CustomOrderLogisticsForm";
import { QuickMessageCard } from "./QuickMessageCard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import {
  appendCloudinaryUploadPreset,
  cloudinaryUploadUrl,
} from "@/lib/cloudinaryClient";

interface CustomOrderDetailProps {
  initialOrder: CustomOrder;
  shapes?: IShape[];
}

export default function CustomOrderDetail({ initialOrder, shapes = [] }: CustomOrderDetailProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [order, setOrder] = useState<CustomOrder>(initialOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  // Holds the converted Order's id + secure token so we can build the Payment Hub link.
  const [convertedInfo, setConvertedInfo] = useState<{
    orderId: string;
    paymentToken?: string;
  } | null>(
    initialOrder.convertedOrderId
      ? { orderId: initialOrder.convertedOrderId }
      : null
  );
  const [expectedMethod, setExpectedMethod] = useState<'cash' | 'e-transfer'>(
    initialOrder.paymentPreference ?? 'e-transfer'
  );

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
      const res = await fetch(`/api/admin/custom-orders/${order._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreedPrice: Number(order.agreedPrice),
          expectedMethod,
          // Forward any logistics edits the admin made before converting
          date: order.date,
          timeSlot: order.timeSlot,
          deliveryMethod: order.deliveryMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");

      setConvertedInfo({ orderId: data.newOrderId, paymentToken: data.paymentToken });
      setOrder((prev) => ({
        ...prev,
        status: "converted",
        convertedOrderId: data.newOrderId,
      }));
      showAlert("Order converted successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showAlert("Conversion failed: " + err.message, "error");
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    // Prefer the freshly-converted order; fall back to a previously converted one.
    const orderId = convertedInfo?.orderId ?? order.convertedOrderId;

    if (!orderId) {
      showAlert(
        "This request hasn't been converted to an order yet. Convert and price it before sharing a payment link.",
        "error"
      );
      return;
    }

    let token = convertedInfo?.paymentToken;

    // Reload case: token isn't in memory, so pull it from the converted Order document.
    if (!token) {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          token = data?.paymentToken;
          if (token) {
            setConvertedInfo({ orderId, paymentToken: token });
          }
        }
      } catch (err) {
        console.error("Failed to fetch payment token:", err);
      }
    }

    if (!token) {
      showAlert(
        "Payment token is missing for this order. Unable to build a secure payment link.",
        "error"
      );
      return;
    }

    const link = `${window.location.origin}/pay/${orderId}?token=${token}`;

    try {
      await navigator.clipboard.writeText(link);
      showAlert("Payment link copied to clipboard!", "success");
    } catch (err) {
      console.error("Clipboard write failed:", err);
      showAlert("Failed to copy the payment link to clipboard.", "error");
    }
  };

  const handleImageUpload = async (files: FileList) => {
    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      appendCloudinaryUploadPreset(formData);

      const res = await fetch(
        cloudinaryUploadUrl("image"),
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
      const res = await fetch(`/api/admin/custom-orders/${order._id}`, {
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
        isConverted={order.status === "converted"}
        onCopyPaymentLink={handleCopyPaymentLink}
      />

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <CustomOrderSpecsForm
            order={order}
            shapes={shapes}
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
          <QuickMessageCard order={order} convertedInfo={convertedInfo} />
          <div className="bg-card-background p-lg rounded-large shadow-md border border-border/40">
            <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 mb-4">
              Payment Preference
            </h2>
            <p className="text-sm text-primary font-medium">
              {order.paymentPreference === "cash"
                ? "Cash at Pickup"
                : order.paymentPreference === "e-transfer"
                  ? "E-Transfer"
                  : "Not specified"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {order.paymentPreference === "cash"
                ? "Customer will pay the full amount in cash at pickup."
                : order.paymentPreference === "e-transfer"
                  ? "Customer will pay the full amount via e-transfer the day before pickup."
                  : "Customer did not select a payment method (legacy request)."}
            </p>
          </div>
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
        <p className="mb-4">
          Converting with agreed price of{" "}
          <strong>${order.agreedPrice}</strong>. The customer selected{" "}
          <strong>
            {order.paymentPreference === "cash" ? "Cash at Pickup" : "E-Transfer"}
          </strong>
          . Confirm or override the payment method:
        </p>
        <div className="flex flex-col gap-2">
          {(["e-transfer", "cash"] as const).map((method) => (
            <label
              key={method}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${expectedMethod === method
                  ? "border-accent bg-accent/5 text-accent font-semibold"
                  : "border-border bg-card-background text-primary/70"
                }`}
            >
              <input
                type="radio"
                name="expectedMethod"
                value={method}
                checked={expectedMethod === method}
                onChange={() => setExpectedMethod(method)}
                className="accent-accent w-4 h-4"
              />
              {method === "e-transfer" ? "E-Transfer" : "Cash at Pickup"}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-primary/50">
          The customer will receive an email with the corresponding payment
          instructions.
        </p>
      </ConfirmationModal>
    </div>
  );
}
