"use client";
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import FlavorForm from "@/components/admin/FlavorForm";
import { Flavor, ProductCategory } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useAlert } from "@/contexts/AlertContext";
import { AdminListItem } from "@/components/admin/AdminListItem";
import { FloatingActionBar } from "@/components/admin/FloatingActionBar";
import { sortFlavorsByDisplayOrder } from "@/lib/utils/sortFlavors";
import { useRouter } from "next/navigation";
import { ArrowLeft, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

type FlavorFormData = Omit<Flavor, "_id">;

const flavorTabClassName = cn(
  "group relative inline-flex h-11 min-h-11 flex-shrink-0 snap-start items-center justify-center gap-1.5",
  "whitespace-nowrap rounded-full border border-white/30 bg-white/40 px-4 py-2.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md",
  "ring-offset-background transition-all duration-150",
  "data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-md",
);

const flavorTabCountClassName =
  "text-xs tabular-nums text-primary/60 group-data-[state=active]:text-white/90";

function flavorId(flavor: Flavor) {
  return String(flavor._id);
}

function dragTransform(
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null,
) {
  if (!transform) return undefined;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

function SortableFlavorRow({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: dragTransform(transform), transition }}
      className={cn("flex items-center gap-2", isDragging && "z-10 opacity-90")}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none rounded-medium p-1 text-primary/50 hover:bg-subtleBackground hover:text-primary active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const ManageFlavorsPage = () => {
  const showConfirmation = useConfirmation();
  const { showAlert } = useAlert();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [orderedFlavors, setOrderedFlavors] = useState<Flavor[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  
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

  const flavorCountByCategoryId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const flavor of flavors) {
      for (const categoryId of flavor.categoryIds || []) {
        counts[categoryId] = (counts[categoryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [flavors]);

  const activeCategory = useMemo(
    () =>
      activeTab === "all"
        ? null
        : categories.find((category) => String(category._id) === activeTab) ?? null,
    [activeTab, categories],
  );

  const categoryFlavors = useMemo(() => {
    if (!activeCategory) return [];
    return flavors.filter((flavor) =>
      (flavor.categoryIds || []).includes(activeTab),
    );
  }, [flavors, activeCategory, activeTab]);

  const baselineFlavors = useMemo(
    () =>
      sortFlavorsByDisplayOrder(
        categoryFlavors,
        activeCategory?.flavorDisplayOrder,
      ),
    [categoryFlavors, activeCategory],
  );

  useEffect(() => {
    setOrderedFlavors(baselineFlavors);
  }, [baselineFlavors]);

  const isCategoryOrderMode = activeTab !== "all";
  const canReorder = isCategoryOrderMode && searchQuery.trim().length === 0;

  const visibleFlavors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = isCategoryOrderMode ? orderedFlavors : flavors;
    return source.filter((flavor) => {
      const matchesSearch = flavor.name.toLowerCase().includes(query);
      if (!isCategoryOrderMode) return matchesSearch;
      return matchesSearch;
    });
  }, [flavors, orderedFlavors, searchQuery, isCategoryOrderMode]);

  const isOrderDirty = useMemo(() => {
    if (!isCategoryOrderMode) return false;
    const current = orderedFlavors.map(flavorId).join("|");
    const baseline = baselineFlavors.map(flavorId).join("|");
    return current !== baseline;
  }, [isCategoryOrderMode, orderedFlavors, baselineFlavors]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedFlavors((items) => {
      const oldIndex = items.findIndex((flavor) => flavorId(flavor) === String(active.id));
      const newIndex = items.findIndex((flavor) => flavorId(flavor) === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleDiscardOrder = () => {
    setOrderedFlavors(baselineFlavors);
  };

  const renderFlavorItem = (flavor: Flavor) => {
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
        title={flavor.name}
        description={`$${flavor.price.toFixed(2)}`}
        imageUrl={flavor.imageUrl}
        details={detailsForModal}
        onEdit={() => setEditingFlavor(flavor)}
        onDelete={() => handleDelete(flavorId(flavor), flavor.name)}
      />
    );
  };

  const handleSaveOrder = async () => {
    if (!activeCategory) return;
    setIsSavingOrder(true);
    try {
      const flavorDisplayOrder = orderedFlavors.map(flavorId);
      const response = await fetch(
        `/api/admin/categories/${activeTab}/flavor-order`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flavorDisplayOrder }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save flavor order");
      }

      setCategories((prev) =>
        prev.map((category) =>
          String(category._id) === activeTab
            ? { ...category, flavorDisplayOrder }
            : category,
        ),
      );
      showAlert("Flavor order saved", "success");
    } catch (err: unknown) {
      showAlert(
        err instanceof Error ? err.message : "Failed to save flavor order",
        "error",
      );
    } finally {
      setIsSavingOrder(false);
    }
  };


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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="relative mb-4">
            <TabsList
              className={cn(
                "flex h-auto w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 py-2",
                "no-scrollbar snap-x snap-mandatory",
                "sm:flex-wrap sm:justify-center sm:overflow-visible",
              )}
            >
              <TabsTrigger value="all" className={flavorTabClassName}>
                All
                <span className={flavorTabCountClassName}>({flavors.length})</span>
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat._id}
                  value={String(cat._id)}
                  className={flavorTabClassName}
                >
                  {cat.name}
                  <span className={flavorTabCountClassName}>
                    ({flavorCountByCategoryId[String(cat._id)] ?? 0})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
            />
          </Tabs>

          <div className="mb-4">
            <Input
              placeholder="Search flavors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-error">Error: {error}</p>}
          {canReorder && (
            <p className="mb-3 font-body text-small text-primary/70">
              Drag flavors to set the order customers see for this category.
            </p>
          )}
          {isCategoryOrderMode && searchQuery.trim().length > 0 && (
            <p className="mb-3 font-body text-small text-primary/70">
              Clear search to reorder flavors.
            </p>
          )}
          <div className="space-y-md">
            {isLoading ? (
              <div className="flex justify-center items-center p-xl">
                <h1>Loading Flavors...</h1>
              </div>
            ) : visibleFlavors.length === 0 ? (
              <p className="font-body text-primary/80 text-center p-lg">
                No flavors found matching your search.
              </p>
            ) : canReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleFlavors.map(flavorId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-md">
                    {visibleFlavors.map((flavor) => (
                      <SortableFlavorRow key={flavorId(flavor)} id={flavorId(flavor)}>
                        {renderFlavorItem(flavor)}
                      </SortableFlavorRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              visibleFlavors.map((flavor) => (
                <div key={flavorId(flavor)}>{renderFlavorItem(flavor)}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <FloatingActionBar
        isDirty={isOrderDirty}
        isSaving={isSavingOrder}
        onDiscard={handleDiscardOrder}
        onSave={handleSaveOrder}
      />
    </section>
  );
};

export default ManageFlavorsPage;
