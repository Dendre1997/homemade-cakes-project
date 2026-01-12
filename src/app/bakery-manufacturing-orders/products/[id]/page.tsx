"use client";

import { useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ProductWithCategory, Flavor, AvailableDiameterConfig } from "@/types";
import Image from "next/image";
// import { useCartStore } from "@/lib/store/cartStore";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { InstagramGeneratorModal } from "@/components/admin/InstagramGeneratorModal";
import { ArrowLeft } from "lucide-react";
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";

// Admin-facing page to display a single product's details
// Includes delete function

interface ExtendedProduct extends ProductWithCategory {
    collections?: any[]; // using any[] to avoid importing all types if not strictly needed, or better import Collection/SeasonalEvent
    seasonalEvents?: any[];
}

const SingleProductPage = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const showConfirmation = useConfirmation();
  
  const [product, setProduct] = useState<ExtendedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const res = await fetch(`/api/admin/products/${id}`);

          if (res.status === 404) {
            notFound();
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch data");

          const data = await res.json();
          setProduct(data);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  const displayableDiameters =
    product?.availableDiameterConfigs.flatMap((config) => {
      const details = product.availableDiameters.find(
        (d) => d._id.toString() === config.diameterId
      );
      if (!details) return [];
      return [
        {
          name: details.name,
          multiplier: config.multiplier,
          id: details._id.toString(),
          illustration: details.illustration
        },
      ];
    }) || [];

  const getDiameterIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('4"') || lower.includes("4 inch")) return <FourInchBentoIcon className="w-8 h-8 text-muted-foreground" />;
    if (lower.includes('5"') || lower.includes("5 inch")) return <FiveInchBentoIcon className="w-8 h-8 text-muted-foreground" />;
    if (lower.includes('6"') || lower.includes("6 inch")) return <SixInchCakeIcon className="w-8 h-8 text-muted-foreground" />;
    if (lower.includes('7"') || lower.includes("7 inch")) return <SevenInchCakeIcon className="w-8 h-8 text-muted-foreground" />;
    if (lower.includes('8"') || lower.includes("8 inch")) return <EightInchCakeIcon className="w-8 h-8 text-muted-foreground" />;
    return <SixInchCakeIcon className="w-8 h-8 text-muted-foreground opacity-50" />;
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Product?",
      body: `Are you sure you want to delete ${product!.name}?`,
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");

      router.push("/bakery-manufacturing-orders/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error deleting product");
    }
  };

  const handleToggleStatus = async () => {
    if (!product) return;

    const newStatus = !product.isActive;
    const action = newStatus ? "activate" : "deactivate";

    const confirmed = await showConfirmation({
      title: `${newStatus ? "Activate" : "Deactivate"} Product?`,
      body: `Are you sure you want to ${action} ${product.name}?`,
      confirmText: newStatus ? "Activate" : "Deactivate",
      variant: newStatus ? "primary" : "danger",
    });

    if (!confirmed) return;

    try {
        const res = await fetch(`/api/admin/products/${product._id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ isActive: newStatus })
        });

        if (!res.ok) throw new Error(`Failed to ${action} product`);

        setProduct(prev => prev ? ({ ...prev, isActive: newStatus }) : null);
    } catch (err) {
        console.error(err);
        alert(`Failed to ${action} product`);
    }
  };

  const handleRemoveCollection = async (collectionId: string) => {
      if (!product) return;

      const confirmed = await showConfirmation({
        title: "Remove from Collection?",
        body: "Are you sure you want to remove this product from the collection?",
        confirmText: "Remove",
        variant: "danger",
      });
  
      if (!confirmed) return;

      const newIds = (product.collectionIds || []).filter(id => id !== collectionId);
      
      try {
          const res = await fetch(`/api/admin/products/${product._id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ collectionIds: newIds })
          });
          if (!res.ok) throw new Error("Failed to update");
          
          setProduct(prev => prev ? ({
              ...prev,
              collectionIds: newIds,
              collections: prev.collections?.filter(c => c._id !== collectionId)
          }) : null);
      } catch (err) {
          console.error(err);
          alert("Failed to remove from collection");
      }
  };

  const handleRemoveSeasonal = async (eventId: string) => {
      if (!product) return;

      const confirmed = await showConfirmation({
        title: "Remove from Seasonal Event?",
        body: "Are you sure you want to remove this product from the seasonal event?",
        confirmText: "Remove",
        variant: "danger",
      });
  
      if (!confirmed) return;

      const newIds = (product.seasonalEventIds || []).filter(id => id !== eventId);
      
      try {
          const res = await fetch(`/api/admin/products/${product._id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ seasonalEventIds: newIds })
          });
          if (!res.ok) throw new Error("Failed to update");
          
          setProduct(prev => prev ? ({
              ...prev,
              seasonalEventIds: newIds,
              seasonalEvents: prev.seasonalEvents?.filter(e => e._id !== eventId)
          }) : null);
      } catch (err) {
          console.error(err);
          alert("Failed to remove from event");
      }
  };


  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (isLoading) return <LoadingSpinner />;
  if (!product) return <div className="p-8 text-center">Product not found.</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="gap-2 pl-0 text-muted-foreground hover:text-foreground" 
            onClick={() => router.push('/bakery-manufacturing-orders/products')}
          >
             <ArrowLeft className="w-4 h-4" /> Back to Products
          </Button>
          
          <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                product.isActive 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-gray-50 text-gray-600 border-gray-200"
            )}>
                {product.isActive ? "Active" : "Archived"}
          </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between border-b pb-6">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{product.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{product.category.name}</p>
         </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/products/${id}`, '_blank')}>
                View Live
            </Button>
            <Button variant="default" size="sm" onClick={() => router.push(`/bakery-manufacturing-orders/products/${id}/edit`)}>
                Edit Product
            </Button>
            <Button 
                variant={product.isActive ? "secondary" : "default"}
                size="sm" 
                onClick={handleToggleStatus}
                className={product.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "bg-green-600 hover:bg-green-700 text-white"}
            >
                {product.isActive ? "Deactivate" : "Activate"}
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- LEFT COLUMN (2/3) --- */}
        <div className="space-y-6 lg:col-span-2">
            
            {/* 1. OVERVIEW */}
            <Card className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r p-4">
                        {product.imageUrls.length > 1 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {product.imageUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square bg-white rounded-md border overflow-hidden">
                                        <Image
                                            src={url}
                                            alt={`${product.name} ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="relative aspect-square w-full">
                                <Image 
                                    src={product.imageUrls[0] || "/placeholder.png"} 
                                    alt={product.name} 
                                    fill 
                                    className="object-contain"
                                    priority
                                />
                             </div>
                        )}
                    </div>
                    <div className="w-full md:w-2/3 p-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm text-foreground mb-1">Description</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {product.description || "No description provided."}
                            </p>
                        </div>
                        <div className="flex gap-8 border-t pt-4">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base Price</span>
                                <p className="text-xl font-bold mt-0.5">${product.structureBasePrice.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</span>
                                <p className="text-sm font-medium mt-1">{product.category.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            <Card>
                <CardHeader className="pb-3">
                     <CardTitle className="text-sm font-medium">Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Button 
                        variant="ghost" 
                        size="sm"
                        className="w-full justify-start h-9 px-2"
                        onClick={() => setIsGeneratorOpen(true)}
                     >
                 Generate Instagram Post
                     </Button>
                </CardContent>
            </Card>
            {/* 2. CONFIGURATION */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Flavors</h4>
                        <div className="flex flex-wrap gap-2">
                            {product.availableFlavors.length > 0 ? product.availableFlavors.map((flavor) => (
                                <span key={flavor._id.toString()} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                    {flavor.name}
                                </span>
                            )) : <span className="text-sm text-muted-foreground italic">No specific flavors.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sizes</h4>
                             {displayableDiameters.length > 0 ? (
                                <div className="text-sm space-y-2">
                                    {displayableDiameters.map((d) => (
                                        <div key={d.id} className="flex justify-between items-center py-2 border-b last:border-0 border-border/50">
                                            <div className="flex items-center gap-3">
                                                {getDiameterIcon(d.name)}
                                                <span>{d.name}</span>
                                            </div>
                                            <span className="font-mono text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">x{d.multiplier}</span>
                                        </div>
                                    ))}
                                </div>
                             ) : <span className="text-sm text-muted-foreground italic">No sizes configured.</span>}
                        </div>
                        <div>
                             <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Allergens</h4>
                             <div className="flex flex-wrap gap-2">
                                {product.allergenIds && product.allergenIds.length > 0 ? 
                                    (product as any).allergens?.map((a: any) => ( 
                                        <span key={a.toString()} className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                            {typeof a === 'object' ? a.name : 'Allergen ' + a}
                                        </span>
                                     )) 
                                 : <span className="text-sm text-muted-foreground">None listed</span>}
                             </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* --- RIGHT COLUMN (1/3) --- */}
        <div className="space-y-6">
            
            {/* ASSOCIATIONS CARD */}
            <Card>
                <CardHeader className="pb-3 bg-muted/40 border-b">
                    <CardTitle className="text-sm font-medium">Associations</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    {/* Collections */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Collections</span>
                        </div>
                        {product.collections && product.collections.length > 0 ? (
                            <div className="space-y-2">
                                {product.collections.map((col: any) => (
                                    <div key={col._id} className="flex items-center justify-between p-2 rounded border bg-card text-sm group">
                                        <span>{col.name}</span>
                                        <button 
                                            onClick={() => handleRemoveCollection(col._id)}
                                            className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove from collection"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Not in any collections.</p>
                        )}
                    </div>

                    {/* Seasonal Events */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-semibold text-muted-foreground uppercase">Seasonal Events</span>
                        </div>
                         {product.seasonalEvents && product.seasonalEvents.length > 0 ? (
                            <div className="space-y-2">
                                {product.seasonalEvents.map((event: any) => (
                                    <div key={event._id} className="flex items-center justify-between p-2 rounded border bg-amber-50/50 border-amber-100 text-sm group">
                                        <span>{event.name}</span>
                                        <button 
                                            onClick={() => handleRemoveSeasonal(event._id)}
                                            className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove from event"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No active events.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            

            {/* METADATA */}
            <div className="text-xs text-muted-foreground space-y-1 px-1">
                <div className="flex justify-between">
                    <span>Product ID</span>
                    <span className="font-mono">{product._id.toString()}</span>
                </div>
            </div>

            {/* DANGER ZONE - Minimalist */}
            <div className="pt-4 border-t">
                 <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 justify-start px-2"
                    onClick={() => handleDelete(product._id.toString())}
                 >
                    Delete Product
                 </Button>
            </div>

        </div>
      </div>

      <InstagramGeneratorModal 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)}
        product={product}
      />
    </div>
  );
};

export default SingleProductPage;
