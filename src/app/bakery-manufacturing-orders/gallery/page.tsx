"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { 
  Loader2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  Image as ImageIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { ChipCheckbox } from "@/components/ui/ChipCheckbox";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { IGalleryImage, ProductCategory } from "@/types";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/Spinner";

export default function GalleryAdminPage() {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [images, setImages] = useState<IGalleryImage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<IGalleryImage> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Template for new items
  const emptyTemplate: Partial<IGalleryImage> = {
    title: "",
    description: "",
    imageUrl: "",
    categories: [],
    decorationPrice: 0,
    isActive: true,
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [galleryRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/gallery"),
        fetch("/api/categories")
      ]);

      if (!galleryRes.ok || !categoriesRes.ok) throw new Error("Failed to fetch data");

      setImages(await galleryRes.json());
      setCategories(await categoriesRes.json());
    } catch (error) {
      console.error(error);
      showAlert("Failed to load gallery data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasUnsavedChanges = useMemo(() => {
    if (!editingItem) return false;
    const original = currentIndex === null ? emptyTemplate : images[currentIndex];
    
    // Simple deep compare for our specific structure
    return JSON.stringify(editingItem) !== JSON.stringify(original);
  }, [editingItem, currentIndex, images]);

  const handleOpenModal = (index: number | null) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
  };

  const handleCloseModal = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await showConfirmation({
        title: "Unsaved Changes",
        body: "You have unsaved changes. Are you sure you want to close without saving?",
        confirmText: "Discard Changes",
        variant: "danger"
      });
      if (!confirmed) return;
    }
    setIsModalOpen(false);
    setCurrentIndex(null);
    setEditingItem(null);
  };

  const handleSwipe = async (direction: "next" | "prev") => {
    if (currentIndex === null) return; // Can't swipe in "Create Mode"

    if (hasUnsavedChanges) {
      showAlert("Please save your changes before swiping!", "error");
      return;
    }

    if (direction === "next") {
      setCurrentIndex((prev) => (prev! + 1) % images.length);
    } else {
      setCurrentIndex((prev) => (prev! - 1 + images.length) % images.length);
    }
  };

  // Keyboard navigation for swipe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen || currentIndex === null) return;
      if (e.key === "ArrowRight") handleSwipe("next");
      if (e.key === "ArrowLeft") handleSwipe("prev");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, currentIndex, hasUnsavedChanges, images.length]); // Added images.length

  // Sync editingItem when currentIndex changes
  useEffect(() => {
    if (currentIndex === null) {
      setEditingItem(emptyTemplate);
    } else {
      setEditingItem({ ...images[currentIndex] });
    }
  }, [currentIndex, images]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "homemade_cakes_preset");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setEditingItem(prev => ({ ...prev, imageUrl: data.secure_url }));
    } catch (error) {
      showAlert("Image upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingItem?.imageUrl || !editingItem?.title) {
        showAlert("Image and Title are required", "error");
        return;
    }

    setIsSaving(true);
    try {
      const isNew = currentIndex === null;
      const url = isNew ? "/api/admin/gallery" : `/api/admin/gallery/${editingItem._id}`;
      const method = isNew ? "POST" : "PATCH";

      // Fix price: ensure it's a number or 0 if empty/NaN
      const savePayload = {
        ...editingItem,
        decorationPrice: isNaN(Number(editingItem.decorationPrice)) ? 0 : Number(editingItem.decorationPrice)
      };

      const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savePayload)
      });

      if (!res.ok) throw new Error("Save failed");

      const result = await res.json();

      if (isNew) {
          // For newly created items, we need the full list to get the ID and correct order
          await fetchData();
          setIsModalOpen(false);
          showAlert("Created successfully", "success");
      } else {
          // For updates, update local state directly for instant feedback and stability
          const updatedImage = { ...editingItem, ...savePayload } as IGalleryImage;
          setImages(prev => prev.map(img => 
            img._id.toString() === editingItem._id?.toString() ? updatedImage : img
          ));
          showAlert("Updated successfully", "success");
      }
    } catch (error) {
        showAlert("Failed to save changes", "error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (currentIndex === null || !editingItem?._id) return;

    const confirmed = await showConfirmation({
        title: "Delete Image?",
        body: "This will permanently remove the image from the gallery and Cloudinary. Proceed?",
        confirmText: "Delete",
        variant: "danger"
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
        const res = await fetch(`/api/admin/gallery/${editingItem._id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        await fetchData();
        setIsModalOpen(false);
        showAlert("Deleted successfully", "success");
    } catch (error) {
        showAlert("Failed to delete image", "error");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-md md:p-lg">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="font-heading text-h2 text-primary">Portfolio Gallery</h1>
        <div className="text-sm text-muted-foreground">{images.length} Items</div>
      </div>

      {/* INSTAGRAM GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {/* ADD NEW TILE */}
        <button
          onClick={() => handleOpenModal(null)}
          className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border rounded-medium hover:bg-subtleBackground hover:border-primary/50 transition-all group"
        >
          <div className="bg-primary/10 p-3 rounded-full group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xs font-bold text-primary mt-2 uppercase tracking-wider">Add New</span>
        </button>

        {/* IMAGE TILES */}
        {images.map((item, index) => (
          <div 
            key={item._id.toString()}
            onClick={() => handleOpenModal(index)}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-medium bg-neutral-200 border border-border"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
            />
            {/* Overlay Info */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
              <span className="text-white text-xs font-bold line-clamp-2">{item.title}</span>
              {!item.isActive && (
                <span className="mt-1 bg-neutral-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                   <EyeOff className="h-2.5 w-2.5" /> Hidden
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 border-0 rounded-large shadow-2xl overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Image Detail</DialogTitle>
          
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* IMAGE COLUMN */}
            <div className="relative w-full h-[40vh] md:h-full md:w-3/5 bg-primary/40 flex items-center justify-center group shrink-0 overflow-hidden">
              {editingItem?.imageUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={editingItem.imageUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 60vw"
                    priority
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center text-neutral-500">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm italic">No image uploaded</p>
                </div>
              )}

              {/* Upload Trigger */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-opacity">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-xl" 
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> {editingItem?.imageUrl ? "Change Image" : "Upload Image"}</>}
                </Button>
                <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleImageUpload} 
                    disabled={isUploading} 
                />
              </div>

              {/* Swipe Controls (Arrows) */}
              {currentIndex !== null && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("prev"); }}
                    className="absolute left-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-primary transition-all hover:scale-110 active:scale-95 z-20 backdrop-blur-sm"
                    title="Previous (Left Arrow)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("next"); }}
                    className="absolute right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-primary transition-all hover:scale-110 active:scale-95 z-20 backdrop-blur-sm"
                    title="Next (Right Arrow)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* FORM COLUMN */}
            <div className="w-full flex-1 md:flex-none md:w-2/5 p-md md:p-lg bg-white overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-heading text-h3 text-primary truncate mr-2">
                    {currentIndex === null ? "Create New Entry" : "Edit Portfolio Item"}
                </h3>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., Pink Peony Wedding Cake" 
                    value={editingItem?.title || ""} 
                    onChange={(e) => setEditingItem(prev => ({ ...prev!, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc">Description (Optional)</Label>
                  <Textarea 
                    id="desc" 
                    placeholder="Briefly describe the design/inspiration..." 
                    rows={3} 
                    value={editingItem?.description || ""}
                    onChange={(e) => setEditingItem(prev => ({ ...prev!, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price">Decoration Price ($)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="0.00" 
                    value={editingItem?.decorationPrice || ""}
                    onChange={(e) => setEditingItem(prev => ({ ...prev!, decorationPrice: parseFloat(e.target.value) }))}
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Base for estimating custom work</p>
                </div>

                <div className="pt-2">
                   <Label className="mb-3 block">Categories</Label>
                   <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <ChipCheckbox
                          key={cat._id.toString()}
                          checked={editingItem?.categories?.includes(cat._id.toString()) || false}
                          onCheckedChange={() => {
                            const catId = cat._id.toString();
                            const currentCats = editingItem?.categories || [];
                            const newCats = currentCats.includes(catId)
                              ? currentCats.filter(c => c !== catId)
                              : [...currentCats, catId];
                            setEditingItem(prev => ({ ...prev!, categories: newCats }));
                          }}
                        >
                          {cat.name}
                        </ChipCheckbox>
                      ))}
                   </div>
                </div>

                <div className="pt-2 border-t mt-4 flex items-center justify-between">
                   <div className="flex flex-col">
                      <Label htmlFor="status" className="font-bold">Active Status</Label>
                      <span className="text-xs text-muted-foreground">Visible on public portfolio</span>
                   </div>
                   <Switch 
                     id="status" 
                     checked={editingItem?.isActive ?? true} 
                     onCheckedChange={(checked) => setEditingItem(prev => ({ ...prev!, isActive: checked }))}
                   />
                </div>

                <div className="pt-6 flex items-center gap-3">
                   <Button 
                     variant="primary" 
                     className="flex-1 h-11" 
                     disabled={isSaving || isUploading || !hasUnsavedChanges}
                     onClick={handleSave}
                   >
                     {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                     {currentIndex === null ? "Create Post" : "Save Changes"}
                   </Button>
                   
                   {currentIndex !== null && (
                     <Button 
                        variant="danger" 
                        size="icon" 
                        className="h-11 w-11 shrink-0" 
                        disabled={isSaving}
                        onClick={handleDelete}
                     >
                       <Trash2 className="h-5 w-5" />
                     </Button>
                   )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
