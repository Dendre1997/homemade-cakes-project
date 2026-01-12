"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import FlavorForm from "@/components/admin/FlavorForm";
import { Flavor, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem"; 
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";

type FlavorFormData = Omit<Flavor, "_id">;

const ManageFlavorsPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter()
  
  const fetchFlavors = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [flavorsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/flavors"),
        fetch("/api/admin/categories"),
      ]);
      if (!flavorsRes.ok || !categoriesRes.ok) {
        throw new Error("Failed to fetch data");
      }
      setFlavors(await flavorsRes.json());
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
      title: "Delete Flavor?",
      body: (
        <p>
          Are you sure you want to delete the flavor{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/flavors/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete flavor");
      }
      setFlavors((prevFlavors) =>
        prevFlavors.filter((flavor) => flavor._id.toString() !== id)
      );
      showAlert("Flavor was successfully deleted", "success"); 
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
    }
  };

  const handleSubmit = async (formData: FlavorFormData) => {
    setIsSubmitting(true);
    const url = editingFlavor
      ? `/api/admin/flavors/${editingFlavor._id}`
      : "/api/admin/flavors";
    const method = editingFlavor ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save flavor");
      }

      await fetchFlavors();
      setEditingFlavor(null); 
      showAlert(
        `Flavor ${editingFlavor ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving flavor",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchFlavors();
  }, [fetchFlavors]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat._id.toString(), cat.name]));
  }, [categories]);

  const filteredFlavors = flavors.filter((flavor) =>
    flavor.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        Manage Flavors
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingFlavor ? "Edit Flavor" : "Create New Flavor"}
          </h2>
          <FlavorForm
            onSubmit={handleSubmit}
            categories={categories}
            existingFlavor={editingFlavor}
            isSubmitting={isSubmitting}
          />
          {editingFlavor && (
            <Button
              variant="text"
              onClick={() => setEditingFlavor(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Flavors
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search flavors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error">Error: {error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Flavors...</h1>
              </div>
            ) : filteredFlavors.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No flavors found matching your search.
              </p>
            ) : (
              filteredFlavors.map((flavor) => {
                const categoryNames = (flavor.categoryIds || [])
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean)
                  .join(", ");

                const partialCategoryIds = (flavor.categoryIds || [])
                  .map((id) => `...${id.slice(-4)}`)
                  .join(", ");
                
                const detailsForModal = {
                  ...flavor,
                  price: `$${flavor.price.toFixed(2)}`,
                  categories: categoryNames || "None",
                  categoryIds: partialCategoryIds || "None",
                  _id: undefined,
                };

                return (
                  <AdminListItem
                    key={flavor._id.toString()}
                    title={flavor.name}
                    description={`$${flavor.price.toFixed(2)}`}
                    imageUrl={flavor.imageUrl}
                    details={detailsForModal}
                    onEdit={() => setEditingFlavor(flavor)}
                    onDelete={() =>
                      handleDelete(flavor._id.toString(), flavor.name)
                    }
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

export default ManageFlavorsPage;
