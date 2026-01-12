"use client";

import { useState, useEffect, useCallback } from "react";
import DiameterForm from "@/components/admin/DiameterForm";
import { Diameter, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem";

import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "@/components/icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "@/components/icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "@/components/icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "@/components/icons/cake-sizes/EightInchCakeIcon";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";

const availableIcons = [
  { name: "FourInchBentoIcon", size: 4, component: FourInchBentoIcon },
  { name: "FiveInchBentoIcon", size: 5, component: FiveInchBentoIcon },
  { name: "SixInchCakeIcon", size: 6, component: SixInchCakeIcon },
  { name: "SevenInchCakeIcon", size: 7, component: SevenInchCakeIcon },
  { name: "EightInchCakeIcon", size: 8, component: EightInchCakeIcon },
].sort((a, b) => a.size - b.size);

type DiameterFormData = Omit<Diameter, "_id">;

const ManageDiametersPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert(); 
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [editingDiameter, setEditingDiameter] = useState<Diameter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter()
  const fetchDiameters = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const [diametersRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/diameters"),
        fetch("/api/admin/categories"),
      ]);
      if (!diametersRes.ok || !categoriesRes.ok)
        throw new Error("Failed to fetch data");

      const diametersData = await diametersRes.json();
      const categoriesData = await categoriesRes.json();

      setDiameters(diametersData);
      setCategories(categoriesData);
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
      title: "Delete Diameter?",
      body: (
        <p>
          Are you sure you want to delete the diameter{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/diameters/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete diameter");
      }

      setDiameters((prev) =>
        prev.filter((diameter) => diameter._id.toString() !== id)
      );

      showAlert("Diameter was successfully deleted", "success"); 
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(msg);
      showAlert(msg, "error");
    }
  };

  const handleSubmit = async (formData: DiameterFormData) => {
    setIsSubmitting(true);
    const url = editingDiameter
      ? `/api/admin/diameters/${editingDiameter._id}`
      : "/api/admin/diameters";
    const method = editingDiameter ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save diameter");
      }

      await fetchDiameters();
      setEditingDiameter(null);
      showAlert(
        `Diameter ${editingDiameter ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving diameter",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDiameters();
  }, [fetchDiameters]);

  const filteredDiameters = diameters.filter((diameter) =>
    diameter.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        Manage Diameters
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingDiameter ? "Edit Diameter" : "Create New Diameter"}
          </h2>
          <DiameterForm
            onSubmit={handleSubmit}
            categories={categories}
            existingDiameter={editingDiameter}
            isSubmitting={isSubmitting}
          />
          {editingDiameter && (
            <Button
              variant="text"
              onClick={() => setEditingDiameter(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        {/* List Items*/}
        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Diameters
          </h2>
          <div className="mb-4">
            <Input
              placeholder="Search diameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error text-center p-lg">{error}</p>}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Diameters...</h1>
              </div>
            ) : filteredDiameters.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No diameters found matching your search.
              </p>
            ) : (
              filteredDiameters.map((diameter) => {
                const IconComponent = availableIcons.find(
                  (icon) => icon.name === diameter.illustration
                )?.component;

                const detailsForModal = ({
                    ...diameter,
                    sizeValue: `${diameter.sizeValue} inches`,
                    categories:
                      (diameter.categoryIds || [])
                        .map((id) => categories.find((c) => c._id === id)?.name)
                        .filter(Boolean)
                        .join(", ") || "None",
                  categoryIds: '',
                    illustration: '',
                  })


                return (
                  <AdminListItem
                    key={diameter._id.toString()}
                    title={diameter.name}
                    description={diameter.servings}
                    imageUrl={null}

                    icon={IconComponent ? <IconComponent /> : null}
                    details={detailsForModal}
                    onEdit={() => setEditingDiameter(diameter)}
                    onDelete={() =>
                      handleDelete(diameter._id.toString(), diameter.name)
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

export default ManageDiametersPage;
