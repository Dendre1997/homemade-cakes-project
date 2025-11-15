"use client";
import React, { useState, useEffect, useCallback } from "react";
import AllergenForm from "@/components/admin/AllergenForm";
import { Allergen, ProductCategory } from "@/types"; // Імпортуємо ProductCategory
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { AdminListItem } from "@/components/admin/AdminListItem"; 

type AllergenFormData = Omit<Allergen, "_id">;

const ManageAllergensPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAllergens = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await fetch("/api/allergens");
      if (!response.ok) throw new Error("Failed to fetch allergens");
      const data = await response.json();
      setAllergens(data);
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

  useEffect(() => {
    fetchAllergens();
  }, [fetchAllergens]);

  const handleSubmit = async (formData: AllergenFormData) => {
    setIsSubmitting(true);
    const url = editingAllergen
      ? `/api/admin/allergens/${editingAllergen._id}`
      : "/api/admin/allergens";
    const method = editingAllergen ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save allergen");
      }

      await fetchAllergens(); 
      setEditingAllergen(null);
      showAlert(
        `Allergen ${editingAllergen ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving allergen",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Allergen?",
      body: (
        <p>
          Are you sure you want to delete the allergen{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/allergens/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete allergen");
      }
      setAllergens((prevAllergen) =>
        prevAllergen.filter((allergen) => allergen._id.toString() !== id)
      );
      showAlert("Allergen was successfully deleted", "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
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
        Manage Allergens
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingAllergen ? "Edit Allergen" : "Create New Allergen"}
          </h2>
          <AllergenForm
            onSubmit={handleSubmit}
            existingAllergen={editingAllergen}
            isSubmitting={isSubmitting}
          />
          {editingAllergen && (
            <Button
              variant="text"
              onClick={() => setEditingAllergen(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Allergens
          </h2>
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Allergens</h1>
              </div>
            ) : allergens.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No allergens found. Create one to get started!
              </p>
            ) : (
              allergens.map((allergen) => (
                <AdminListItem
                  key={allergen._id.toString()}
                  title={allergen.name}
                  imageUrl={null}
                  description={null}
                  details={allergen}
                  onEdit={() => setEditingAllergen(allergen)}
                  onDelete={() =>
                    handleDelete(allergen._id.toString(), allergen.name)
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

export default ManageAllergensPage;
