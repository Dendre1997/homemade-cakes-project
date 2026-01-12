"use client";

import { useState, useEffect, useCallback } from "react";
import { HeroSlide } from "@/types";
import HeroSlideForm from "@/components/admin/HeroSlideForm"; // Ensure this path is correct
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { AdminListItem } from "@/components/admin/AdminListItem";

type HeroSlideFormData = Omit<HeroSlide, "_id">;

const ManageHeroSlidesPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);

  const fetchSlides = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/hero-slides");
      if (!res.ok) throw new Error("Failed to fetch slides");
      const data = await res.json();
      setSlides(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleSubmit = async (formData: HeroSlideFormData) => {
    setIsSubmitting(true);
    const url = editingSlide
      ? `/api/admin/hero-slides/${editingSlide._id}`
      : "/api/admin/hero-slides";
    const method = editingSlide ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save slide");
      }

      await fetchSlides();
      setEditingSlide(null);
      showAlert(
        `Slide ${editingSlide ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving slide",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Slide?",
      body: (
        <p>
          Are you sure you want to delete the slide{" "}
          <strong>&quot;{title}&quot;</strong>? This cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/hero-slides/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete slide");
      }

      setSlides((prev) => prev.filter((s) => s._id.toString() !== id));
      showAlert("Slide deleted successfully", "success");
    } catch (err: unknown) {
      console.error(err);
      showAlert("Error deleting slide", "error");
    }
  };

  return (
    <section className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}

      <h1 className="font-heading text-h1 text-primary mb-lg">
        Manage Home Page Slides
      </h1>

      <div className="">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingSlide ? "Edit Slide" : "Create New Slide"}
          </h2>
          <HeroSlideForm
            onSubmit={handleSubmit}
            existingSlide={editingSlide}
            isSubmitting={isSubmitting}
          />
          {editingSlide && (
            <Button
              variant="text"
              onClick={() => setEditingSlide(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Slides
          </h2>
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center p-xl">
                <p>Loading...</p>
              </div>
            ) : slides.length === 0 ? (
              <p className="text-center text-primary/80 p-lg">
                No slides found. Create one to get started!
              </p>
            ) : (
              slides.map((slide) => (
                <AdminListItem
                  key={slide._id.toString()}
                  title={slide.title}
                  description={slide.subtitle || "No subtitle"}
                  imageUrl={slide.imageUrl}
                  details={{
                    ...slide,
                    _id: undefined,
                    imageUrl: undefined,
                    link: slide.link || "N/A",
                    buttonText: slide.buttonText || "N/A",
                  }}
                  onEdit={() => setEditingSlide(slide)}
                  onDelete={() =>
                    handleDelete(slide._id.toString(), slide.title)
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageHeroSlidesPage;
