"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ProductCategory } from "@/types";
import CategoryForm from "@/components/admin/CategoryForm";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { AdminListItem } from "@/components/admin/AdminListItem";

const ManageCategoriesPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Failed to fetch categories",
        "error"
      ); 
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat._id.toString(), cat.name]));
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (formData: Omit<ProductCategory, "_id">) => {
    setIsSubmitting(true);
    const url = editingCategory
      ? `/api/admin/categories/${editingCategory._id}`
      : "/api/admin/categories";
    const method = editingCategory ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save category");
      }

      setEditingCategory(null);
      await fetchCategories();
      showAlert(
        `Category ${editingCategory ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving category",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => { 
    const confirmed = await showConfirmation({
      title: "Delete Category?",
      body: (
        <p>
          Are you sure you want to delete the category{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete category");
      }
      showAlert("Category deleted successfully!", "success");
      fetchCategories();
    } catch (error) {
      console.error(error);
      showAlert("Error deleting category", "error");
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
        Manage Categories
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingCategory ? "Edit Category" : "Create New Category"}
          </h2>
          <CategoryForm
            onSubmit={handleSubmit}
            existingCategory={editingCategory}
            isSubmitting={isSubmitting}
          />
          {editingCategory && (
            <Button
              variant="text"
              onClick={() => setEditingCategory(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        {/* List Column */}
        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Categories
          </h2>
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Categories...</h1>
              </div>
            ) : categories.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No categories found. Create one to get started!
              </p>
            ) : (
              categories.map((cat) => (
                <AdminListItem
                  key={cat._id.toString()}
                  title={cat.name}
                  description={null}
                  imageUrl={null}
                  details={cat}
                  onEdit={() => setEditingCategory(cat)}
                  onDelete={() => handleDelete(cat._id.toString(), cat.name)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageCategoriesPage;
