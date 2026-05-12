"use client";

import { useState } from "react";
import { Order } from "@/types";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";
import { Button } from "@/components/ui/Button";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

interface OrderDetailCustomerProps {
  customerInfo: Order["customerInfo"];
  deliveryInfo: Order["deliveryInfo"];
  orderId: string;
  /** Called after a successful save so the parent can re-fetch. */
  onUpdate: () => void;
}

// ── helpers ────────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-primary " +
  "placeholder:text-primary/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition";

const labelCls = "block text-xs font-semibold uppercase tracking-wide text-primary/40 mb-1";

// ── component ──────────────────────────────────────────────────────────────
const OrderDetailCustomer = ({
  customerInfo,
  deliveryInfo,
  orderId,
  onUpdate,
}: OrderDetailCustomerProps) => {
  const { showAlert } = useAlert();

  // ── edit state ──────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [draft, setDraft] = useState({
    name: customerInfo.name ?? "",
    email: customerInfo.email ?? "",
    phone: customerInfo.phone ?? "",
    socialNickname: customerInfo.socialNickname ?? "",
    socialPlatform: (customerInfo.socialPlatform ?? "") as
      | "instagram"
      | "facebook"
      | "",
  });

  // keep draft in sync if the parent re-fetches (prop changes)
  const resetDraft = () =>
    setDraft({
      name: customerInfo.name ?? "",
      email: customerInfo.email ?? "",
      phone: customerInfo.phone ?? "",
      socialNickname: customerInfo.socialNickname ?? "",
      socialPlatform: (customerInfo.socialPlatform ?? "") as
        | "instagram"
        | "facebook"
        | "",
    });

  const handleCancel = () => {
    resetDraft();
    setIsEditing(false);
  };

  // ── save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerInfo: draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      showAlert("Customer info updated!", "success");
      setIsEditing(false);
      onUpdate(); // parent re-fetches → component receives fresh props
    } catch (e) {
      showAlert(
        e instanceof Error ? e.message : "Something went wrong",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── view mode ───────────────────────────────────────────────────────────
  const hasSocial =
    !!customerInfo.socialPlatform &&
    !!(customerInfo.socialNickname || "").trim();

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md">
      {/* ── header ── */}
      <h2 className="font-heading text-h3 text-center text-primary mb-md">Customer Details</h2>
      <div className="flex flex-col items-center justify-between mb-md">
        {!isEditing ? (
          <Button
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="text-accent hover:bg-accent/10 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex-row items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-primary/50 hover:bg-primary/5 gap-1 w-full"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 w-full mt-sm"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* ── view mode ── */}
      {!isEditing && (
        <div className="space-y-sm font-body text-body text-primary">
          <p>
            <strong>Name:</strong> {customerInfo.name}
          </p>
          <p className="overflow-clip">
            <strong>Email:</strong> {customerInfo.email}
          </p>
          <p>
            <strong>Phone:</strong> {customerInfo.phone}
          </p>
          {hasSocial && (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <strong>Social:</strong>
              <SocialHandleAnchor
                platform={customerInfo.socialPlatform}
                nickname={customerInfo.socialNickname}
                showPlatform
                className="text-accent font-semibold hover:underline break-all"
              />
            </p>
          )}
          <p>
            <strong>Method:</strong>{" "}
            <span className="capitalize">{deliveryInfo.method}</span>
          </p>
          {deliveryInfo.address && (
            <p>
              <strong>Address:</strong> {deliveryInfo.address}
            </p>
          )}
        </div>
      )}

      {/* ── edit mode ── */}
      {isEditing && (
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              id="edit-customer-name"
              type="text"
              className={inputCls}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <input
              id="edit-customer-email"
              type="email"
              className={inputCls}
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Phone</label>
            <input
              id="edit-customer-phone"
              type="tel"
              className={inputCls}
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Social Platform */}
          <div>
            <label className={labelCls}>Social Platform</label>
            <select
              id="edit-customer-platform"
              className={inputCls}
              value={draft.socialPlatform}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  socialPlatform: e.target.value as "instagram" | "facebook" | "",
                }))
              }
            >
              <option value="">— None —</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          {/* Social Nickname — only shown when a platform is selected */}
          {draft.socialPlatform && (
            <div>
              <label className={labelCls}>
                {draft.socialPlatform === "instagram"
                  ? "Instagram"
                  : "Facebook"}{" "}
                Handle
              </label>
              <input
                id="edit-customer-nickname"
                type="text"
                className={inputCls}
                value={draft.socialNickname}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, socialNickname: e.target.value }))
                }
                placeholder={
                  draft.socialPlatform === "facebook"
                    ? "vanity-name, full URL, or people/Name/123"
                    : "@handle"
                }
              />
              <p className="mt-1 text-[11px] text-primary/30 leading-relaxed">
                {draft.socialPlatform === "facebook"
                  ? "Accepts: vanity slug, full facebook.com URL, people/Name/ID path, or numeric ID."
                  : "Enter the handle with or without @."}
              </p>
            </div>
          )}

          {/* Delivery Method (read-only reminder) */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-primary/40">
              <strong className="text-primary/60">Delivery method:</strong>{" "}
              <span className="capitalize">{deliveryInfo.method}</span>
              {deliveryInfo.address && ` — ${deliveryInfo.address}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailCustomer;
