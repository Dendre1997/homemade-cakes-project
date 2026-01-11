"use client";
import { useState, useEffect, useCallback } from "react";
import DecorationsForm from "@/components/admin/DecorationsForm";
import { Decoration, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

type DecorationFormData = Omit<Decoration, "_id">;

const ManageDecorationsPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDecoration, setEditingDecoration] = useState<Decoration | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter()
  const fetchDecorations = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [decorationsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/decorations"),
        fetch("/api/admin/categories"),
      ]);
      if (!decorationsRes.ok || !categoriesRes.ok)
        throw new Error("Failed to fetch data");

      setDecorations(await decorationsRes.json());
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

  const handleSubmit = async (formData: DecorationFormData) => {
    setIsSubmitting(true);
    const url = editingDecoration
      ? `/api/admin/decorations/${editingDecoration._id}`
      : "/api/admin/decorations";
    const method = editingDecoration ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save decoration");
      }

      await fetchDecorations();
      setEditingDecoration(null);
      showAlert(
        `Decoration ${editingDecoration ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving decoration",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Decoration?",
      body: (
        <p>
          Are you sure you want to delete the decoration{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/decorations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete decoration");
      }
      setDecorations((prev) => prev.filter((d) => d._id.toString() !== id));
      showAlert("Decoration was successfully deleted", "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
    }
  };

  useEffect(() => {
    fetchDecorations();
  }, [fetchDecorations]);

  const filteredDecorations = decorations.filter((decoration) =>
    decoration.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


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
          onClick={() => router.push("/admin/catalog")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Button>
      <h1 className="font-heading text-h1 text-primary mb-lg">
        Manage Decorations
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">

        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingDecoration ? "Edit Decoration" : "Create New Decoration"}
          </h2>
          <DecorationsForm
            onSubmit={handleSubmit}
            categories={categories}
            existingDecoration={editingDecoration}
            isSubmitting={isSubmitting}
          />
          {editingDecoration && (
            <Button
              variant="text"
              onClick={() => setEditingDecoration(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Decorations
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search decorations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Decorations...</h1>
              </div>
            ) : filteredDecorations.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No decorations found matching your search.
              </p>
            ) : (
              filteredDecorations.map((deco) => (
                <AdminListItem
                  key={deco._id.toString()}
                  title={deco.name}
                  description={`$${deco.price.toFixed(2)} (${deco.type})`}
                  imageUrl={deco.imageUrl}
                  details={{
                    ...deco,
                    price: `$${deco.price.toFixed(2)}`,
                    categories:
                      (deco.categoryIds || [])
                        .map((id) => categories.find((c) => c._id === id)?.name)
                        .filter(Boolean)
                        .join(", ") || "None",
                    categoryIds: '',
                  }}
                  onEdit={() => setEditingDecoration(deco)}
                  onDelete={() => handleDelete(deco._id.toString(), deco.name)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManageDecorationsPage;
