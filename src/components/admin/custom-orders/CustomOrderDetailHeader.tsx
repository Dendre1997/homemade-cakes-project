"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Save, ArrowLeft, Loader2, CheckCircle2, Copy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface CustomOrderDetailHeaderProps {
  id: string;
  status: string;
  agreedPrice: number | null;
  onPriceChange: (price: number | null) => void;
  isSaving: boolean;
  onSave: () => void;
  isConverting: boolean;
  onConvert: () => void;
  paymentLink: string | null;
  onCopyAndDismiss: () => void;
}

export const CustomOrderDetailHeader = ({
  id,
  status,
  agreedPrice,
  onPriceChange,
  isSaving,
  onSave,
  isConverting,
  onConvert,
  paymentLink,
  onCopyAndDismiss,
}: CustomOrderDetailHeaderProps) => {
  const isConverted = status === 'converted';

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="space-y-1">
        <Link
          href="/bakery-manufacturing-orders/custom-orders"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all requests
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Request #{id.slice(-6).toUpperCase()}
          </h1>
          <Badge 
            variant="outline" 
            className={`uppercase px-3 py-1 text-[10px] font-bold tracking-widest
              ${status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                status === 'pending_review' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                status === 'negotiating' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                isConverted ? 'bg-green-50 text-green-700 border-green-200' :
                status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : ''}
            `}
          >
            {status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 py-4 border-y border-border/40 shrink-0">
        {paymentLink ? (
          <Button 
            onClick={onCopyAndDismiss} 
            className="shadow-md min-w-[160px] gap-2 text-white"
          >
            <Copy className="w-4 h-4" /> 
            Copy & Dismiss
          </Button>
        ) : (
          <>
            <div className="relative shrink-0 w-full sm:w-44">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">$ Agreed Price</span>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={agreedPrice ?? ""}
                onChange={(e) => onPriceChange(e.target.value === "" ? null : Number(e.target.value))}
                className="text-right font-bold text-lg h-12 pl-28 border-accent/20 bg-accent/5 focus:ring-accent/20 text-accent"
              />
            </div>

            <div className="flex flex-col sm:flex-row flex-1 gap-3">
              <Button
                onClick={onConvert}
                disabled={isConverting || isSaving || isConverted}
                variant="secondary"
                className="shadow-sm flex-1 sm:flex-none sm:min-w-[140px] h-12 bg-white border-border hover:bg-subtleBackground font-bold"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2 text-accent" />
                )}
                Convert to Order
              </Button>

              <Button
                onClick={onSave}
                disabled={isSaving || isConverting}
                className="shadow-md flex-1 sm:flex-none sm:min-w-[160px] h-12 font-bold"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
