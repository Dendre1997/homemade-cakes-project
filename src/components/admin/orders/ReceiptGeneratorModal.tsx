"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { Order, Diameter, IShape } from "@/types";
import { ClientReceiptCard } from "./ClientReceiptCard";
import { isStandaloneDisplayMode } from "@/lib/firebase/googleSignIn";

function isMobileUserAgent(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function saveBlobViaAnchor(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

type PreparedReceipt = { file: File; blob: Blob; filename: string };

const EXPORT_WIDTH = 400; // Optimal width for the receipt ticket
/** Quiet period after the last card DOM change before pre-rendering. */
const PREPARE_DEBOUNCE_MS = 500;

function prefersShareSheet(): boolean {
  return isStandaloneDisplayMode() || isMobileUserAgent();
}

function isDomError(err: unknown, name: string): boolean {
  return err instanceof DOMException && err.name === name;
}

async function renderReceipt(
  node: HTMLElement,
  orderId: string
): Promise<PreparedReceipt> {
  const dataUrl = await toPng(node, {
    cacheBust: true, // Fixes CORS inside canvas rendering for external images
    // Mobile canvases hit memory limits well below desktop at 3x.
    pixelRatio: prefersShareSheet() ? Math.min(window.devicePixelRatio || 2, 2) : 3,
    width: EXPORT_WIDTH,
    imagePlaceholder:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", // Transparent 1x1 gif fallback
    style: {
      transform: "none",
      transformOrigin: "top left",
    },
  });

  const filename = `dk-creations-Receipt-${orderId.slice(-6).toUpperCase()}.png`;
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: "image/png" });
  return { file, blob, filename };
}

/**
 * Must be reached with no `await` before `navigator.share`: iOS rejects the
 * share with NotAllowedError once the click's transient activation expires.
 */
async function deliverReceipt(receipt: PreparedReceipt): Promise<void> {
  // Installed PWAs (notably iOS) ignore <a download>; the share sheet offers "Save Image".
  if (prefersShareSheet() && navigator.canShare?.({ files: [receipt.file] })) {
    try {
      await navigator.share({ files: [receipt.file], title: receipt.filename });
      return;
    } catch (err) {
      if (isDomError(err, "AbortError")) return;
      if (!isDomError(err, "NotAllowedError")) throw err;
    }
  }
  saveBlobViaAnchor(receipt.blob, receipt.filename);
}

interface ReceiptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  diameters: Diameter[];
  shapes?: IShape[];
  flavorMap: Record<string, string>;
}

export function ReceiptGeneratorModal({ isOpen, onClose, order, diameters, shapes = [], flavorMap }: ReceiptGeneratorModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [eTransferEmail, setETransferEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  // Radix portals mount content a render after `isOpen` flips, so the effect
  // keys off the node itself rather than a ref read once.
  const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);
  const [preparedReceipt, setPreparedReceipt] = useState<PreparedReceipt | null>(null);
  const preparingRef = useRef<Promise<PreparedReceipt> | null>(null);
  const orderId = order._id.toString();

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (settings?.eTransferEmail) {
          setETransferEmail(String(settings.eTransferEmail));
        }
        if (settings?.checkout?.pickupAddress) {
          setPickupAddress(String(settings.checkout.pickupAddress));
        }
      })
      .catch((err) => console.error("Failed to load e-transfer email for receipt:", err));
  }, [isOpen]);

  // Pre-render the PNG so a click can share it without awaiting first. The
  // card keeps changing after open (settings fetch, item images loading), so
  // every DOM change discards the prepared file and restarts the quiet timer.
  useEffect(() => {
    const node = cardNode;
    if (!isOpen || !node) return;

    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const prepare = () => {
      const current = ++generation;
      const pending = renderReceipt(node, orderId);
      preparingRef.current = pending;
      pending
        .then((receipt) => {
          if (!disposed && current === generation) setPreparedReceipt(receipt);
        })
        .catch((err) => {
          // A click retries on demand and reports the error there.
          console.warn("Background receipt pre-render failed:", err);
        })
        .finally(() => {
          if (preparingRef.current === pending) preparingRef.current = null;
        });
    };

    const schedule = () => {
      generation++;
      setPreparedReceipt(null);
      clearTimeout(timer);
      timer = setTimeout(prepare, PREPARE_DEBOUNCE_MS);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(node, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    schedule();

    return () => {
      disposed = true;
      observer.disconnect();
      clearTimeout(timer);
      preparingRef.current = null;
      setPreparedReceipt(null);
    };
  }, [isOpen, cardNode, orderId]);

  // Handle responsive scaling
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      const cardHeightEstimate = 700; // Approximate height of the receipt
      const padding = 32;

      // Calculate scale to fit width
      const scaleX = (containerWidth - padding) / EXPORT_WIDTH;
      // Calculate scale to fit height
      const scaleY = (containerHeight - padding) / cardHeightEstimate;

      // Use the smaller scale, capped at 1 (don't upscale pixelated)
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale > 0 ? newScale : 1);
    };

    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleDownload = useCallback(async () => {
    if (preparedReceipt) {
      try {
        await deliverReceipt(preparedReceipt);
      } catch (err) {
        console.error("Failed to share receipt", err);
        alert("Failed to share the receipt. Check console for details.");
      }
      return;
    }

    if (!cardNode) return;

    let receipt: PreparedReceipt;
    try {
      setIsGenerating(true);
      receipt = await (preparingRef.current ?? renderReceipt(cardNode, orderId));
    } catch (err) {
      console.error("Failed to generate image", err);
      alert("Failed to generate image. This is often due to Cross-Origin (CORS) image issues. Check console for details.");
      return;
    } finally {
      setIsGenerating(false);
    }

    try {
      // Activation has likely expired here; NotAllowedError falls back to a download.
      await deliverReceipt(receipt);
    } catch (err) {
      console.error("Failed to share receipt", err);
      alert("Failed to share the receipt. Check console for details.");
    }
  }, [preparedReceipt, cardNode, orderId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl w-full h-[95vh] md:h-[85vh] p-0 overflow-hidden flex flex-col md:flex-row bg-card-background border-none rounded-xl shadow-2xl [&>button]:hidden">
         
         {/* LEFT COLUMN: PREVIEW */}
         <div 
            ref={containerRef}
            className="flex-1 overflow-hidden relative bg-subtleBackground/20 flex items-center justify-center p-4 md:p-12 order-1 md:order-1 min-h-[40vh]"
         >
            {/* Mobile Close Button (Floating) */}
            <Button 
                onClick={onClose} 
                variant="ghost" 
                className="md:hidden absolute top-4 right-4 z-20 text-primary bg-white/50 backdrop-blur-sm shadow-sm hover:bg-white/80"
            >
                Close
            </Button>

            <div 
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    width: EXPORT_WIDTH,
                    transition: 'transform 0.2s ease-out'
                }}
                className="rounded-2xl bg-white flex-shrink-0 shadow-2xl"
                  >
                      
                <div ref={setCardNode} className="bg-white rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.05)] border border-gray-100">
                    <ClientReceiptCard
                      order={order}
                      diameters={diameters}
                      shapes={shapes}
                      flavorMap={flavorMap}
                      eTransferEmail={eTransferEmail}
                      pickupAddress={pickupAddress}
                    />
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN: SIDEBAR */}
         <div className="w-full md:w-[350px] flex flex-col border-l border-border/20 bg-card-background shrink-0 order-2 md:order-2">
             
             {/* HEADER */}
             <div className="p-6 border-b border-border/20 sticky top-0 z-10 flex justify-between items-start">
                <div>
                    <DialogTitle className="text-xl font-heading text-primary shrink-0 leading-tight flex items-center gap-2">
                       Receipt Generator
                    </DialogTitle>
                    <p className="text-body text-primary/80 mt-2 leading-relaxed">
                        Create a shareable, high-quality receipt for order 
                        <span className="font-mono text-xs font-semibold ml-1">#{order._id.toString().slice(-6).toUpperCase()}</span>.
                    </p>
                </div>
                <Button onClick={onClose} variant="ghost" className="hidden md:flex -mr-2 text-primary hover:bg-subtleBackground">Close</Button>
             </div>
             
             <div className="flex-1 p-6 overflow-y-auto">
                 <div className="text-sm text-primary/60">
                     <p className="mt-4 italic">
                        Sensitive admin data and raw database IDs are securely scrubbed from the final image.
                     </p>
                 </div>
             </div>

             {/* FOOTER */}
             <div className="p-6 border-t border-border/20 bg-card-background sticky bottom-0 z-10">
                 <Button 
                    onClick={handleDownload} 
                    disabled={isGenerating} 
                    variant="primary"
                    className="w-full h-12 text-base shadow-lg transition-all font-semibold"
                 >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download Receipt PNG
                </Button>
             </div>
         </div>

      </DialogContent>
    </Dialog>
  );
}
