"use client";
import { useState, useEffect, useCallback } from "react";
import AddonsForm from "@/components/admin/AddonsForm";
import { Addon, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

type AddonFormData = Omit<Addon, "_id">;

const ManageAddonsPage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();
  const [Addons, setAddons] = useState<Addon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter()
  const fetchAddons = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [AddonsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/addons"),
        fetch("/api/admin/categories"),
      ]);
      if (!AddonsRes.ok || !categoriesRes.ok)
        throw new Error("Failed to fetch data");

      setAddons(await AddonsRes.json());
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

  const handleSubmit = async (formData: AddonFormData) => {
    setIsSubmitting(true);
    const url = editingAddon
      ? `/api/admin/addons/${editingAddon._id}`
      : "/api/admin/addons";
    const method = editingAddon ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save Addon");
      }

      await fetchAddons();
      setEditingAddon(null);
      showAlert(
        `Addon ${editingAddon ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving Addon",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Addon?",
      body: (
        <p>
          Are you sure you want to delete the Addon{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/addons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete Addon");
      }
      setAddons((prev) => prev.filter((d) => d._id.toString() !== id));
      showAlert("Addon was successfully deleted", "success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const filteredAddons = Addons.filter((Addon) =>
    Addon.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          onClick={() => router.push("/bakery-manufacturing-orders/catalog")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Button>
      <h1 className="font-heading text-h1 text-primary mb-lg">
        Manage Addons
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">

        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingAddon ? "Edit Addon" : "Create New Addon"}
          </h2>
          <AddonsForm
            onSubmit={handleSubmit}
            categories={categories}
            existingAddon={editingAddon}
            isSubmitting={isSubmitting}
          />
          {editingAddon && (
            <Button
              variant="text"
              onClick={() => setEditingAddon(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Addons
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search Addons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Addons...</h1>
              </div>
            ) : filteredAddons.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No Addons found matching your search.
              </p>
            ) : (
              filteredAddons.map((deco) => {
                const minPrice = deco.variants?.length
                  ? Math.min(...deco.variants.map((v) => v.price))
                  : 0;

                return (
                  <AdminListItem
                    key={deco._id.toString()}
                    title={deco.name}
                    description={`From $${minPrice.toFixed(2)}`}
                    imageUrl={deco.imageUrl}
                    details={{
                      ...deco,
                      price: `From $${minPrice.toFixed(2)}`,
                      categories:
                        (deco.categoryIds || [])
                          .map((id) => categories.find((c) => c._id === id)?.name)
                          .filter(Boolean)
                          .join(", ") || "None",
                      categoryIds: '',
                      variants: undefined, // Hide raw variants object from details view
                    }}
                    onEdit={() => setEditingAddon(deco)}
                    onDelete={() => handleDelete(deco._id.toString(), deco.name)}
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

export default ManageAddonsPage;
