"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Discount,
  ProductWithCategory,
  ProductCategory,
  Collection,
  SeasonalEvent,
} from "@/types";
import DiscountForm from "@/components/admin/DiscountForm";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { format } from "date-fns";
import { Tag, Ticket } from "lucide-react";

type DiscountFormData = Omit<Discount, "_id">;

const ManageDiscountsPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [seasonals, setSeasonals] = useState<SeasonalEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // --- Fetch All Data ---
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [discRes, prodRes, catRes, colRes, seasRes] = await Promise.all([
        fetch("/api/admin/discounts"),
        fetch("/api/admin/products?context=admin"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/collections"),
        fetch("/api/admin/seasonals"),
      ]);

      if (!discRes.ok) throw new Error("Failed to fetch discounts");

      setDiscounts(await discRes.json());
      setProducts(await prodRes.json());
      setCategories(await catRes.json());
      setCollections(await colRes.json());
      setSeasonals(await seasRes.json());
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

  // ---  Submit Handler ---
  const handleSubmit = async (formData: DiscountFormData) => {
    setIsSubmitting(true);

    // Validation of Dates before submission to prevent server error
    if (!formData.startDate || !formData.endDate) {
        showAlert("Please select a valid Date Range.", "error");
        setIsSubmitting(false);
        return;
    }

    const url = editingDiscount
      ? `/api/admin/discounts/${editingDiscount._id}`
      : "/api/admin/discounts";
    const method = editingDiscount ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save discount");
      }

      await fetchData();
      setEditingDiscount(null);
      setIsCreating(false);
      showAlert(
        `Discount ${editingDiscount ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving discount",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Discount?",
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
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete discount");

      setDiscounts((prev) => prev.filter((d) => d._id.toString() !== id));
      showAlert("Discount deleted successfully", "success");
    } catch (error) {
      showAlert("Error deleting discount", "error");
    }
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  const showForm = isCreating || editingDiscount;

  return (
    <section className="relative min-h-screen">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}

      <h1 className="font-heading text-h1 text-primary mb-lg">
        Discounts & Promotions
      </h1>

      {showForm ? (
        <div className="max-w-5xl mx-auto">
          <div className="mb-md flex justify-between items-center">
            <h2 className="font-heading text-h3 text-primary">
              {editingDiscount ? "Editing Mode" : "Create Mode"}
            </h2>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingDiscount(null);
                setIsCreating(false);
              }}
            >
              Cancel
            </Button>
          </div>

          <DiscountForm
            existingDiscount={editingDiscount}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            products={products}
            categories={categories}
            collections={collections}
            seasonals={seasonals}
          />
        </div>
      ) : (
        // Dashboard / List Mode
        <div>
          <div className="flex justify-end mb-lg">
            <Button variant="primary" onClick={() => setIsCreating(true)}>
              + Create New Discount
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {discounts.length === 0 ? (
              <p className="col-span-full text-center text-primary/60 py-xl">
                No discounts created yet.
              </p>
            ) : (
              discounts.map((discount) => {
                const statusColor = discount.isActive
                  ? "text-success"
                  : "text-neutral-400";
                const icon = discount.trigger === "code" ? <Ticket /> : <Tag />;
                const valueText =
                  discount.type === "percentage"
                    ? `${discount.value}%`
                    : `$${discount.value}`;

                return (
                  <AdminListItem
                    key={discount._id.toString()}
                    title={discount.name}
                    icon={<div className={statusColor}>{icon}</div>}
                    imageUrl={null}
                    description={`${valueText} OFF • ${discount.trigger === "code" ? discount.code : "Automatic"}`}
                    details={{
                      ...discount,
                      _id: undefined,
                      targetIds: `${discount.targetIds.length} items`,
                      dates: `${format(new Date(discount.startDate), "MMM d")} - ${format(new Date(discount.endDate), "MMM d, yyyy")}`,
                    }}
                    onEdit={() => setEditingDiscount(discount)}
                    onDelete={() =>
                      handleDelete(discount._id.toString(), discount.name)
                    }
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ManageDiscountsPage;
