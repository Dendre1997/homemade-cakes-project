"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SeasonalForm from "@/components/admin/SeasonalForm";
import { SeasonalEvent, ProductWithCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { SeasonalCard } from "@/components/admin/SeasonalCard";

type SeasonalFormData = Omit<SeasonalEvent, "_id"> & {
  selectedProductIds: string[];
};

const ManageSeasonalsPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [seasonals, setSeasonals] = useState<SeasonalEvent[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingEvent, setEditingEvent] = useState<SeasonalEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [seasonalsRes, productsRes] = await Promise.all([
        fetch("/api/admin/seasonals"),
        fetch("/api/admin/products?context=admin"),
      ]);

      if (!seasonalsRes.ok || !productsRes.ok)
        throw new Error("Failed to fetch data");

      setSeasonals(await seasonalsRes.json());
      setProducts(await productsRes.json());
    } catch (error) {
      console.error(error);
      showAlert("Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initialSelectedProductIds = useMemo(() => {
    if (!editingEvent || !editingEvent._id) return [];

    return products
      .filter((p) => p.seasonalEventIds?.includes(editingEvent._id.toString()))
      .map((p) => p._id.toString());
  }, [editingEvent, products]);

  const handleSubmit = async (formData: SeasonalFormData) => {
    setIsSubmitting(true);
    const url = editingEvent
      ? `/api/admin/seasonals/${editingEvent._id}`
      : "/api/admin/seasonals";
    const method = editingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save event");
      }

      await fetchData();

      setEditingEvent(null);
      setIsCreating(false);

      showAlert(
        `Event ${editingEvent ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving event",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Event?",
      body: (
        <p>
          Are you sure you want to delete <strong>{name}</strong>?
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/seasonals/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");

      await fetchData();
      showAlert("Event deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error deleting event", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  const showForm = isCreating || editingEvent || seasonals.length === 0;

  return (
    <section className="relative min-h-screen">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}

      <h1 className="font-heading text-h1 text-primary mb-lg">
        Seasonal Events
      </h1>

      {showForm ? (
        <div className="max-w-5xl mx-auto">
          <div className="mb-md flex justify-between items-center">
            <h2 className="font-heading text-h3 text-primary">
              {editingEvent ? "Edit Event" : "Create New Event"}
            </h2>

            {seasonals.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreating(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>

          <SeasonalForm
            onSubmit={handleSubmit}
            existingEvent={editingEvent}
            isSubmitting={isSubmitting}
            availableProducts={products}
            initialSelectedProductIds={initialSelectedProductIds}
          />
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-lg">
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
            >
              + Create New Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {seasonals.map((event) => (
              <SeasonalCard
                key={event._id.toString()}
                event={event}
                onEdit={() => setEditingEvent(event)}
                onDelete={() => handleDelete(event._id.toString(), event.name)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ManageSeasonalsPage;
