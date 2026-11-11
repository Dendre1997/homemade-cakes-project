"use client";

import { useState, useEffect, useCallback } from "react";
import SetForm, { SetFormData } from "@/components/admin/SetForm";
import { CatalogSet, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { SetBoxIcon } from "@/components/ui/SetBoxIcon";
import { useRouter } from "next/navigation";
import {
  CatalogPageHeader,
  CatalogSearchField,
  catalogListColumnClass,
  catalogListHeadingClass,
} from "@/components/admin/catalog/CatalogListChrome";

const ManageSetsPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert();
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSet, setEditingSet] = useState<CatalogSet | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const fetchSets = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const [setsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/sets"),
        fetch("/api/admin/categories"),
      ]);
      if (!setsRes.ok || !categoriesRes.ok)
        throw new Error("Failed to fetch data");

      setSets(await setsRes.json());
      setCategories(await categoriesRes.json());
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
      title: "Delete Set?",
      body: (
        <p>
          Are you sure you want to delete the set{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/sets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete set");
      }

      setSets((prev) => prev.filter((set) => set._id !== id));
      if (editingSet?._id === id) setEditingSet(null);
      showAlert("Set was successfully deleted", "success");
    } catch (err: unknown) {
      showAlert(
        err instanceof Error ? err.message : "Unknown error occurred.",
        "error"
      );
    }
  };

  const handleSubmit = async (formData: SetFormData): Promise<boolean> => {
    setIsSubmitting(true);
    const url = editingSet
      ? `/api/admin/sets/${editingSet._id}`
      : "/api/admin/sets";
    const method = editingSet ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save set");
      }

      await fetchSets();
      setEditingSet(null);
      showAlert(`Set ${editingSet ? "updated" : "created"} successfully!`, "success");
      return true;
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving set",
        "error"
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const filteredSets = sets.filter((set) =>
    set.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
      <CatalogPageHeader
        title="Manage Sets"
        onBack={() => router.push("/bakery-manufacturing-orders/catalog")}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingSet ? "Edit Set" : "Create New Set"}
          </h2>
          <SetForm
            onSubmit={handleSubmit}
            categories={categories}
            existingSet={editingSet}
            isSubmitting={isSubmitting}
            onCancel={editingSet ? () => setEditingSet(null) : undefined}
          />
        </div>

        <div className={catalogListColumnClass}>
          <h2 className={catalogListHeadingClass}>Existing Sets</h2>
          <CatalogSearchField
            id="catalog-sets-search"
            label="Search sets"
            placeholder="Search sets…"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <p className="font-body text-primary/70">Loading Sets…</p>
              </div>
            ) : filteredSets.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                {sets.length === 0
                  ? "No sets yet. Create the first one."
                  : "No sets found matching your search."}
              </p>
            ) : (
              filteredSets.map((set) => {
                const details = {
                  name: set.name,
                  pieceCount: set.pieceCount,
                  setFlavorLimit: set.maxFlavors,
                  basePrice:
                    set.basePrice !== undefined ? `$${set.basePrice}` : "",
                  categories:
                    (set.categoryIds || [])
                      .map((id) => categories.find((c) => c._id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || "None",
                };

                return (
                  <AdminListItem
                    key={set._id}
                    title={set.name}
                    description={`${set.pieceCount} pieces · up to ${set.maxFlavors} ${
                      set.maxFlavors === 1 ? "flavor" : "flavors"
                    }`}
                    imageUrl={set.imageUrl || null}
                    icon={
                      <SetBoxIcon
                        pieceCount={set.pieceCount}
                        className="h-full w-full text-primary"
                      />
                    }
                    details={details}
                    onEdit={() => setEditingSet(set)}
                    onDelete={() => handleDelete(set._id, set.name)}
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

export default ManageSetsPage;
