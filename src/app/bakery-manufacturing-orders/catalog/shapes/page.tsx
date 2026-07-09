"use client";

import { useState, useEffect, useCallback } from "react";
import ShapeForm, { ShapeFormData } from "@/components/admin/ShapeForm";
import { IShape } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";

const formatShapeId = (shape: { _id: unknown }) =>
  typeof shape._id === "string" ? shape._id : String(shape._id);

const ManageShapesPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert();
  const [shapes, setShapes] = useState<IShape[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingShape, setEditingShape] = useState<IShape | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const fetchShapes = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const shapesRes = await fetch("/api/admin/shapes");
      if (!shapesRes.ok) throw new Error("Failed to fetch shapes");

      const shapesData = await shapesRes.json();
      setShapes(
        shapesData.map((shape: IShape & { _id: unknown }) => ({
          ...shape,
          _id: formatShapeId(shape),
        }))
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(msg);
      showAlert(msg, "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Shape?",
      body: (
        <p>
          Are you sure you want to delete the shape{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/shapes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete shape");
      }

      setShapes((prev) => prev.filter((shape) => shape._id !== id));

      if (editingShape?._id === id) {
        setEditingShape(null);
      }

      showAlert("Shape was successfully deleted", "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
    }
  };

  const handleSubmit = async (formData: ShapeFormData) => {
    setIsSubmitting(true);
    const url = editingShape
      ? `/api/admin/shapes/${editingShape._id}`
      : "/api/admin/shapes";
    const method = editingShape ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to save shape");
      }

      await fetchShapes();
      setEditingShape(null);
      showAlert(
        `Shape ${editingShape ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving shape",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchShapes();
  }, [fetchShapes]);

  const filteredShapes = shapes.filter((shape) =>
    shape.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildDescription = (shape: IShape) => {
    const parts: string[] = [];
    parts.push(
      shape.priceSurcharge > 0
        ? `+$${shape.priceSurcharge.toFixed(2)} surcharge`
        : "No surcharge"
    );
    if (shape.isDefault) parts.push("Default");
    if (!shape.isActive) parts.push("Inactive");
    return parts.join(" · ");
  };

  return (
    <section className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
      <Button
        variant="ghost"
        className="gap-2 pl-0 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/bakery-manufacturing-orders/catalog")}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </Button>
      <h1 className="font-heading text-h1 text-primary mb-lg">Manage Shapes</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingShape ? "Edit Shape" : "Create New Shape"}
          </h2>
          <ShapeForm
            onSubmit={handleSubmit}
            existingShape={editingShape}
            isSubmitting={isSubmitting}
          />
          {editingShape && (
            <Button
              variant="text"
              onClick={() => setEditingShape(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Shapes
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search shapes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Shapes...</h1>
              </div>
            ) : filteredShapes.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No shapes found matching your search.
              </p>
            ) : (
              filteredShapes.map((shape) => {
                const detailsForModal = {
                  ...shape,
                  priceSurcharge: `$${(shape.priceSurcharge ?? 0).toFixed(2)}`,
                  isDefault: shape.isDefault ? "Yes" : "No",
                  isActive: shape.isActive ? "Yes" : "No",
                };

                return (
                  <AdminListItem
                    key={shape._id}
                    title={shape.name}
                    description={buildDescription(shape)}
                    imageUrl={shape.imageUrl || null}
                    details={detailsForModal}
                    onEdit={() => setEditingShape(shape)}
                    onDelete={() => handleDelete(shape._id, shape.name)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageShapesPage;
