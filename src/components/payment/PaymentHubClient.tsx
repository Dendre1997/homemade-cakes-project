"use client";

import { useState } from "react";
import { Check, Copy, Hash, Mail, ShieldCheck, Wallet } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";

interface PaymentHubClientProps {
  /** Full order id (used only for display context if needed). */
  orderId: string;
  /** Server-verified order total. */
  totalAmount: number;
  /** Interac e-Transfer destination email pulled from global settings. */
  eTransferEmail: string;
  /** Short, human-friendly reference the customer must include in the e-Transfer message. */
  reference: string;
}

type CopyFieldKey = "amount" | "email" | "reference";

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default function PaymentHubClient({
  totalAmount,
  eTransferEmail,
  reference,
}: PaymentHubClientProps) {
  const { showAlert } = useAlert();
  const [copiedKey, setCopiedKey] = useState<CopyFieldKey | null>(null);

  const formattedTotal = currencyFormatter.format(Number(totalAmount) || 0);

  const handleCopy = async (key: CopyFieldKey, value: string, label: string) => {
    if (!value) {
      showAlert(`${label} is unavailable to copy.`, "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      showAlert(`${label} copied to clipboard!`, "success");
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      showAlert("Couldn't copy automatically. Please copy it manually.", "error");
    }
  };

  const fields: {
    key: CopyFieldKey;
    label: string;
    value: string;
    displayValue: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "amount",
      label: "Amount",
      value: (Number(totalAmount) || 0).toFixed(2),
      displayValue: formattedTotal,
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      key: "email",
      label: "Send to (Email)",
      value: eTransferEmail,
      displayValue: eTransferEmail || "Not available — please contact us",
      icon: <Mail className="w-5 h-5" />,
    },
    {
      key: "reference",
      label: "Message / Reference",
      value: reference,
      displayValue: reference,
      icon: <Hash className="w-5 h-5" />,
    },
  ];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-card-background rounded-large shadow-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-8 text-center text-text-on-primary">
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              Secure Payment
            </div>
            <h1 className="font-heading text-3xl mt-4">Complete Your Payment</h1>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              Please send your Interac e-Transfer using the details below. Once
              sent, we will process your order!
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">
            {fields.map((field) => {
              const isCopied = copiedKey === field.key;
              return (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-3 rounded-medium border border-border bg-background/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-accent shrink-0">{field.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/50">
                        {field.label}
                      </p>
                      <p
                        className={`font-semibold text-primary truncate ${
                          field.key === "amount" ? "text-xl" : "text-base"
                        }`}
                      >
                        {field.displayValue}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(field.key, field.value, field.label)}
                    aria-label={`Copy ${field.label}`}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-medium px-3 py-2 text-xs font-semibold shrink-0 transition-colors ${
                      isCopied
                        ? "bg-success text-white"
                        : "bg-accent text-white hover:bg-accent/90"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-6 pb-6">
            <p className="text-xs text-primary/60 leading-relaxed text-center">
              Please include the reference in your e-Transfer message so we can
              match your payment to your order. Payments are reconciled manually
              and may take a short while to confirm.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
