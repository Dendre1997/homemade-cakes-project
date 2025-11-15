"use client";

import { useState, useEffect, useCallback } from "react";
import { Collection } from "@/types";
import CollectionForm from "@/components/admin/CollectionForm";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import LoadingSpinner from "@/components/ui/Spinner";
import Image from "next/image";
import { AdminListItem } from "@/components/admin/AdminListItem";

const ManageCollectionsPage = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<Collection | null>(null);
  const  showConfirmation  = useConfirmation();
  const { showAlert } = useAlert();

  const fetchCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      setCollections(await res.json());
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Failed to fetch collections",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSubmit = async (formData: Omit<Collection, "_id">) => {
    setIsSubmitting(true);
    const url = editingCollection
      ? `/api/admin/collections/${editingCollection._id}`
      : "/api/admin/collections";
    const method = editingCollection ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save collection");
      }

      setEditingCollection(null);
      await fetchCollections();
      showAlert(
        `Collection ${editingCollection ? "updated" : "created"} successfully!`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Error saving collection",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Collection?", 
      body: (
        <p>
          Are you sure you want to delete the collection{" "}
          <strong>&quot;{name}&quot;</strong>? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete",
      variant: "danger",
    });

    if (confirmed) {
      try {
        const res = await fetch(`/api/admin/collections/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to delete collection");
        }
        await fetchCollections();
        showAlert("Collection deleted successfully!", "success");
      } catch (error) {
        console.error(error);
        showAlert(
          error instanceof Error ? error.message : "Error deleting collection",
          "error"
        );
      }
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
        Manage Collections
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {/* Form Column */}
        <div className="md:col-span-1">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {editingCollection ? "Edit Collection" : "Create New Collection"}
          </h2>
          <CollectionForm
            existingCollection={editingCollection}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
          {editingCollection && (
            <Button
              variant="text"
              onClick={() => setEditingCollection(null)}
              className="mt-md"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        {/* List Column */}
        <div className="md:col-span-2">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Existing Collections
          </h2>
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                Loading Collections
              </div>
            ) : collections.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No collections found. Create one to get started!
              </p>
            ) : (
              collections.map((collection) => (
                <AdminListItem
                  key={collection._id.toString()}
                  title={collection.name}
                  description={collection.description}
                  imageUrl={collection.imageUrl}
                  details={collection} 
                  onEdit={() => setEditingCollection(collection)}
                  onDelete={() =>
                    handleDelete(collection._id.toString(), collection.name)
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

export default ManageCollectionsPage;