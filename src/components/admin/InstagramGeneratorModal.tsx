"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Download, Loader2, X } from "lucide-react";
import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory } from "@/types";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";

interface InstagramGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithCategory;
}

export function InstagramGeneratorModal({ isOpen, onClose, product }: InstagramGeneratorModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  // Constants
  const EXPORT_WIDTH = 380; // Optimal width for the card export
  const EXPORT_PADDING = 24;

  // Handle responsive scaling
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;      const containerHeight = containerRef.current.offsetHeight;
      
      const cardHeightEstimate = 600; // Approximate height of the card
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
    if (!cardRef.current) return;
    
    try {
      setIsGenerating(true);
      
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: false, // caching often causes CORS issues on some CDNs with query params
        pixelRatio: 3, 
        width: EXPORT_WIDTH,
        style: {
           transform: 'none',
           transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement("a");
      link.download = `IG-${product.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
      // Log specific properties if available (common in html-to-image errors)
      if (err instanceof Error) {
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
      }
      alert("Failed to generate image. This is often due to Cross-Origin (CORS) image issues. Check console for details.");
    } finally {
        setIsGenerating(false);
    }
  }, [product.name]);

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
                className="rounded-xl bg-white flex-shrink-0 shadow-2xl"
                  >
                      
                <div ref={cardRef} className="bg-white rounded-xl overflow-hidden">
                    <ProductCard product={product} />
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN: SIDEBAR (Header + Controls + Footer) */}
         <div className="w-full md:w-[350px] flex flex-col border-l border-border/20 bg-card-background shrink-0 order-2 md:order-2">
             
             {/* HEADER */}
             <div className="p-6 border-b border-border/20 sticky top-0 z-10 flex justify-between items-start">
                <div>
                    <DialogTitle className="text-xl font-heading text-primary shrink-0 leading-tight">Post Generator</DialogTitle>
                    <p className="text-body text-primary/80 text-sm mt-2 leading-relaxed">
                        Create a Instagram story or post fo <span className="font-semibold">{product.name}</span>.
                    </p>
                </div>
                <Button onClick={onClose} variant="ghost" className="hidden md:flex -mr-2 text-primary hover:bg-subtleBackground">Close</Button>
             </div>
             <div className="flex-1 p-6 overflow-y-auto">
                 {/* Placeholder for future controls or instructions */}
                 <div className="text-sm text-primary/60 italic">
                     <p>The preview on the left shows exactly how your image will look.</p>
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
                    Download PNG
                </Button>
             </div>
         </div>

      </DialogContent>
    </Dialog>
  );
}
