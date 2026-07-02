"use client";

import { useState } from "react";
import { Check, Copy, Hash, Mail, ShieldCheck, Wallet } from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import OrderSummaryDisplay from "@/components/payment/OrderSummaryDisplay";
import { PublicOrderSummary } from "@/types";

interface PaymentHubClientProps {
  /** Server-verified order total. */
  totalAmount: number;
  /** Interac e-Transfer destination email pulled from global settings. */
  eTransferEmail: string;
  /** Short, human-friendly reference the customer must include in the e-Transfer message. */
  reference: string;
  /** Scrubbed, customer-safe order projection for the visual summary. */
  order: PublicOrderSummary;
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
  order,
}: PaymentHubClientProps) {
  const { showAlert } = useAlert();
  const [copiedKey, setCopiedKey] = useState<CopyFieldKey | null>(null);

  const isCash = order.payment.expectedMethod === "cash";
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
    // e-Transfer destination is irrelevant for cash-at-pickup orders.
    ...(!isCash
      ? [
          {
            key: "email" as const,
            label: "Send to (Email)",
            value: eTransferEmail,
            displayValue: eTransferEmail || "Not available — please contact us",
            icon: <Mail className="w-5 h-5" />,
          },
        ]
      : []),
    {
      key: "reference",
      label: "Message / Reference",
      value: reference,
      displayValue: reference,
      icon: <Hash className="w-5 h-5" />,
    },
  ];

  const paymentSection = (
    <div className="space-y-4">
      {/* Heading */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure Payment
        </div>
        <h2 className="font-heading text-2xl text-primary mt-3">
          {isCash ? "Payment at Pickup" : "Pay via Interac e-Transfer"}
        </h2>
        <p className="text-sm text-primary/60 mt-1.5 leading-relaxed">
          {isCash
            ? "Please have the total ready in cash at pickup. The details below are for your reference."
            : "Please send your Interac e-Transfer using the details below. Once sent, we will process your order!"}
        </p>
      </div>

      {/* Copy fields */}
      <div className="space-y-3">
        {fields.map((field) => {
          const isCopied = copiedKey === field.key;
          return (
            <div
              key={field.key}
              className="flex items-center justify-between gap-3 rounded-medium border border-border bg-background/70 px-4 py-3"
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

      {/* Reference reminder */}
      {!isCash && (
        <p className="text-xs text-primary/60 leading-relaxed text-center">
          Please include the reference in your e-Transfer message so we can match
          your payment to your order. Payments are reconciled manually and may
          take a short while to confirm.
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-4 py-10">
      <OrderSummaryDisplay data={order} paymentSection={paymentSection} />
    </main>
  );
}
