"use client";
import { useState, useEffect, useCallback } from "react";
import { Product, ProductWithCategory } from "@/types";
import Link from "next/link";
import AdminProductCard from "@/components/admin/AdminProductCard";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useConfirmation } from "@/contexts/ConfirmationContext";

/**
 * Admin page for viewing and managing all products.
 * Fetches all products (including unpublished) and provides delete functionality.
 */
const ManageProductsPage = () => {
  const showConfirmation = useConfirmation()
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Using useCallback to prevent this function from being recreated on re-renders,
  // allowing it to be safely used in useEffect's dependency array.
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      // 'context=admin' fetches all products, including unpublished.
      const res = await fetch("/api/admin/products?context=admin");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch on component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Flavor?",
      body: "Are you sure you want to delete this product? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");
      // Re-fetch products to update the list after deletion.
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Error deleting product");
    }
  };

  return (
    <section>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className="font-heading text-h2 text-text-primary">
              Manage Products
            </h1>
            <Link href="/admin/products/create">
              <Button variant="primary">+ Add New Product</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <AdminProductCard
                key={product._id.toString()}
                product={product}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default ManageProductsPage;
