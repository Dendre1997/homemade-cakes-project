"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ProductWithCategory,
  ProductCategory,
  Collection,
  SeasonalEvent,
} from "@/types";
import AdminProductCard from "@/components/admin/AdminProductCard";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { ContentCard } from "@/components/admin/ContentCard";
import { ProductSelectorModal } from "@/components/admin/ProductSelectorModal";
import {
  LayoutGrid,
  Tag,
  Layers,
  ArrowLeft,
  PackageOpen,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/Input";

type FilterState =
  | { type: "all" }
  | { type: "category"; id: string; name: string }
  | { type: "collection"; id: string; name: string }
  | { type: "seasonal"; id: string; name: string }
  | null;

type StatusFilter = "all" | "active" | "inactive";

const ManageProductsPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert();

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [seasonals, setSeasonals] = useState<SeasonalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<FilterState>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isAddingToSeasonal, setIsAddingToSeasonal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
        fetch("/api/admin/products?context=admin"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/collections"),
      ]);

      if (!productsRes.ok || !categoriesRes.ok || !collectionsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      setProducts(await productsRes.json());
      setCategories(await categoriesRes.json());
      setCollections(await collectionsRes.json());
      const seasonalData = await fetch("/api/admin/seasonals").then((res) =>
        res.json()
      );
      setSeasonals(seasonalData);
    } catch (error) {
      console.error(error);
      showAlert("Failed to load dashboard data", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    const catCounts: Record<string, number> = {};
    const colCounts: Record<string, number> = {};
    const seasonalCounts: Record<string, number> = {};

    products.forEach((p) => {
      const cId = String(p.categoryId);
      catCounts[cId] = (catCounts[cId] || 0) + 1;

      if (p.collectionIds && Array.isArray(p.collectionIds)) {
        (p.collectionIds as string[]).forEach((colId) => {
          const idStr = String(colId);
          colCounts[idStr] = (colCounts[idStr] || 0) + 1;
        });
      }

      if (p.seasonalEventIds && Array.isArray(p.seasonalEventIds)) {
        (p.seasonalEventIds as string[]).forEach((sId) => {
          const idStr = String(sId);
          seasonalCounts[idStr] = (seasonalCounts[idStr] || 0) + 1;
        });
      }
    });

    return { catCounts, colCounts, seasonalCounts };
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!activeFilter) return [];

    let result = products;

    if (activeFilter.type === "category") {
      result = result.filter((p) => String(p.categoryId) === activeFilter.id);
    } else if (activeFilter.type === "collection") {
      result = result.filter((p) => p.collectionIds?.includes(activeFilter.id));
    } else if (activeFilter.type === "seasonal") {
      result = result.filter((p) =>
        p.seasonalEventIds?.includes(activeFilter.id)
      );
    }

    if (statusFilter === "active") {
      result = result.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((p) => !p.isActive);
    }

    return result;
  }, [products, activeFilter, statusFilter]);

  const availableProductsForGroup = useMemo(() => {
    if (activeFilter?.type === "collection") {
      return products.filter(
        (p) => !p.collectionIds?.includes(activeFilter.id)
      );
    }
    if (activeFilter?.type === "seasonal") {
      return products.filter(
        (p) => !p.seasonalEventIds?.includes(activeFilter.id)
      );
    }
    return [];
  }, [products, activeFilter]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.category.name.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Product?",
      body: "Are you sure you want to delete this product? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");

      setProducts((prev) => prev.filter((p) => p._id.toString() !== id));
      showAlert("Product deleted successfully", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error deleting product", "error");
    }
  };

  const handleResetFilter = () => {
    setActiveFilter(null);
    setStatusFilter("all");
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update product status");

      setProducts((prev) =>
        prev.map((p) =>
          p._id.toString() === id ? { ...p, isActive: !currentStatus } : p
        )
      );

      showAlert(
        `Product ${!currentStatus ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showAlert("Error updating status", "error");
    }
  };

  const handleRemoveFromCollection = async (productId: string) => {
    if (!activeFilter || activeFilter.type !== "collection") return;

    const collectionIdToRemove = activeFilter.id;

    const confirmed = await showConfirmation({
      title: "Remove from Collection?",
      body: "Are you sure you want to remove this product from the collection?",
      confirmText: "Remove",
      variant: "danger",
    });

    if (!confirmed) return;

    const product = products.find((p) => p._id.toString() === productId);
    if (!product) return;
    const newCollectionIds = (product.collectionIds || []).filter(
      (id) => id.toString() !== collectionIdToRemove
    );

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionIds: newCollectionIds }),
      });

      if (!res.ok) throw new Error("Failed to update product");
      setProducts((prev) =>
        prev.map((p) =>
          p._id.toString() === productId
            ? { ...p, collectionIds: newCollectionIds }
            : p
        )
      );

      showAlert("Removed from collection", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error removing from collection", "error");
    }
  };

  const handleAddProductsToCollection = async (selectedIds: string[]) => {
    if (!activeFilter || activeFilter.type !== "collection") return;

    setIsAddingToCollection(true);
    const collectionId = activeFilter.id;

    try {
      await Promise.all(
        selectedIds.map(async (productId) => {
          const product = products.find((p) => p._id.toString() === productId);
          if (!product) return;

          const newCollectionIds = [
            ...(product.collectionIds || []),
            collectionId,
          ];

          const res = await fetch(`/api/admin/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectionIds: newCollectionIds }),
          });

          if (!res.ok)
            throw new Error(`Failed to update product ${product.name}`);
        })
      );

      setProducts((prev) =>
        prev.map((p) => {
          if (selectedIds.includes(p._id.toString())) {
            return {
              ...p,
              collectionIds: [...(p.collectionIds || []), collectionId],
            };
          }
          return p;
        })
      );

      showAlert(
        `Added ${selectedIds.length} products to collection!`,
        "success"
      );
      setIsAddModalOpen(false);
    } catch (error) {
      console.error(error);
      showAlert("Failed to add some products", "error");
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleRemoveFromSeasonal = async (productId: string) => {
    if (!activeFilter || activeFilter.type !== "seasonal") return;

    const eventIdToRemove = activeFilter.id;

    const confirmed = await showConfirmation({
      title: "Remove from Seasonal Event?",
      body: "Are you sure you want to remove this product from the seasonal event?",
      confirmText: "Remove",
      variant: "danger",
    });

    if (!confirmed) return;

    const product = products.find((p) => p._id.toString() === productId);
    if (!product) return;
    const newSeasonalIds = (product.seasonalEventIds || []).filter(
      (id) => id.toString() !== eventIdToRemove
    );

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonalEventIds: newSeasonalIds }),
      });

      if (!res.ok) throw new Error("Failed to update product");
      setProducts((prev) =>
        prev.map((p) =>
          p._id.toString() === productId
            ? { ...p, seasonalEventIds: newSeasonalIds }
            : p
        )
      );

      showAlert("Removed from seasonal event", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error removing from seasonal event", "error");
    }
  };

  const handleAddProductsToSeasonal = async (selectedIds: string[]) => {
    if (!activeFilter || activeFilter.type !== "seasonal") return;

    setIsAddingToSeasonal(true);
    const eventId = activeFilter.id;

    try {
      await Promise.all(
        selectedIds.map(async (productId) => {
          const product = products.find((p) => p._id.toString() === productId);
          if (!product) return;

          const newSeasonalIds = [...(product.seasonalEventIds || []), eventId];

          const res = await fetch(`/api/admin/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seasonalEventIds: newSeasonalIds }),
          });

          if (!res.ok)
            throw new Error(`Failed to update product ${product.name}`);
        })
      );

      setProducts((prev) =>
        prev.map((p) => {
          if (selectedIds.includes(p._id.toString())) {
            return {
              ...p,
              seasonalEventIds: [...(p.seasonalEventIds || []), eventId],
            };
          }
          return p;
        })
      );

      showAlert(
        `Added ${selectedIds.length} products to seasonal event!`,
        "success"
      );
      setIsAddModalOpen(false);
    } catch (error) {
      console.error(error);
      showAlert("Failed to add some products", "error");
    } finally {
      setIsAddingToSeasonal(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <section className="relative min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-heading text-h2 text-text-primary">
          {activeFilter
            ? activeFilter.type === "all"
              ? "All Products"
              : activeFilter.type === "category"
                ? `Category: ${activeFilter.name}`
                : activeFilter.type === "collection"
                  ? `Collection: ${activeFilter.name}`
                  : `Seasonal: ${activeFilter.name}`
            : "Product Dashboard"}
        </h1>

        <div className="flex flex-col sm:flex-row gap-md w-full sm:w-auto">
          {activeFilter && (
            <Button
              variant="secondary"
              onClick={handleResetFilter}
              className="w-full sm:w-auto justify-center" // Full width on mobile
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          )}

          {(activeFilter?.type === "collection" ||
            activeFilter?.type === "seasonal") && (
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(true)}
              className="border-accent text-accent hover:bg-accent/10 w-full sm:w-auto justify-center" // Full width on mobile
            >
              + Add to{" "}
              {activeFilter.type === "collection" ? "Collection" : "Seasonal"}
            </Button>
          )}

          <Link href="/bakery-manufacturing-orders/products/create" className="w-full sm:w-auto">
            <Button
              variant="primary"
              className="w-full sm:w-auto justify-center"
            >
              + Create Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-lg max-w-lg">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          placeholder="Search products..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Search Results State */}
      {searchQuery && (
        <div className="space-y-md animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="text-lg font-semibold text-primary">
            Search Results ({searchResults.length})
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {searchResults.length > 0 ? (
              searchResults.map((product) => (
                <AdminProductCard
                  key={product._id.toString()}
                  product={product}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No products found matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Default Dashboard View - Only show if not searching */}
      {!searchQuery && !activeFilter && (
        <div className="space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1">
            <div
              onClick={() => setActiveFilter({ type: "all" })}
              className="cursor-pointer"
            >
              <ContentCard
                title="All Products"
                description={`View and manage full inventory (${products.length} items).`}
                icon={<PackageOpen className="h-8 w-8" />}
              />
            </div>
          </div>

          <div>
            <h2 className="font-heading text-h3 text-primary mb-md">
              By Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {categories.map((cat) => (
                <div
                  key={cat._id.toString()}
                  onClick={() =>
                    setActiveFilter({
                      type: "category",
                      id: cat._id.toString(),
                      name: cat.name,
                    })
                  }
                  className="cursor-pointer"
                >
                  <ContentCard
                    title={cat.name}
                    description={`${counts.catCounts[cat._id.toString()] || 0} products`}
                    icon={<Tag className="h-8 w-8" />}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-h3 text-primary mb-md">
              By Collection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {collections.map((col) => (
                <div
                  key={col._id.toString()}
                  onClick={() =>
                    setActiveFilter({
                      type: "collection",
                      id: col._id.toString(),
                      name: col.name,
                    })
                  }
                  className="cursor-pointer"
                >
                  <ContentCard
                    title={col.name}
                    description={`${counts.colCounts[col._id.toString()] || 0} products`}
                    icon={<Layers className="h-8 w-8" />}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-h3 text-primary mb-md">
              By Seasonal Event
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {seasonals.map((event) => (
                <div
                  key={event._id.toString()}
                  onClick={() =>
                    setActiveFilter({
                      type: "seasonal",
                      id: event._id.toString(),
                      name: event.name,
                    })
                  }
                  className="cursor-pointer"
                >
                  <ContentCard
                    title={event.name}
                    description={`${counts.seasonalCounts[event._id.toString()] || 0} products`}
                    icon={<Tag className="h-8 w-8" />}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtered View - Only show if not searching and filter active */}
      {!searchQuery && activeFilter && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-wrap items-center gap-sm mb-lg p-sm bg-card-background rounded-medium border border-border">
            <span className="text-small font-bold text-primary/70 mr-2">
              Status:
            </span>

            <Button
              size="sm"
              variant={statusFilter === "all" ? "primary" : "secondary"}
              onClick={() => setStatusFilter("all")}
            >
              All ({filteredProducts.length + (statusFilter !== "all" ? 0 : 0)}
              ){" "}
            </Button>

            <Button
              size="sm"
              variant={statusFilter === "active" ? "primary" : "secondary"}
              onClick={() => setStatusFilter("active")}
              className={
                statusFilter === "active"
                  ? "bg-success text-white hover:bg-success/90"
                  : ""
              }
            >
              <Eye className="w-4 h-4 mr-2" /> Active
            </Button>

            <Button
              size="sm"
              variant={statusFilter === "inactive" ? "primary" : "secondary"}
              onClick={() => setStatusFilter("inactive")}
              className={
                statusFilter === "inactive"
                  ? "bg-neutral-500 text-white hover:bg-neutral-600"
                  : ""
              }
            >
              <EyeOff className="w-4 h-4 mr-2" /> Inactive
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <AdminProductCard
                  key={product._id.toString()}
                  product={product}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  onRemoveFromCollection={
                    activeFilter?.type === "collection"
                      ? handleRemoveFromCollection
                      : undefined
                  }
                  onRemoveFromSeasonal={
                    activeFilter?.type === "seasonal"
                      ? handleRemoveFromSeasonal
                      : undefined
                  }
                />
              ))
            ) : (
              <p className="col-span-full text-center text-primary/60 py-xl">
                No {statusFilter !== "all" ? statusFilter : ""} products found
                in this section.
              </p>
            )}
          </div>
        </div>
      )}
      <ProductSelectorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={
          activeFilter?.type === "collection"
            ? handleAddProductsToCollection
            : handleAddProductsToSeasonal
        }
        availableProducts={availableProductsForGroup}
        isSaving={isAddingToCollection || isAddingToSeasonal}
        title={
          activeFilter?.type === "collection"
            ? `Add to ${activeFilter.name}`
            : activeFilter?.type === "seasonal"
              ? `Add to ${activeFilter.name}`
              : "Add to Group"
        }
      />
    </section>
  );
};

export default ManageProductsPage;
