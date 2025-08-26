'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, ProductWithCategory } from '@/types';
import Link from 'next/link';
import AdminProductCard from "@/components/admin/AdminProductCard";
import LoadingSpinner from '@/components/Spinner';


const ManageProductsPage = () => {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products?context=admin");
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?'))
      return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');

      fetchProducts();
    } catch (error) {
      console.error(error);
      alert('Error deleting product');
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Products</h1>
        <Link
          href="/admin/products/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Add New Product
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6 ">
          <div className="mt-16 flex flex-col gap-8">
            {products.map((product) => (
              <AdminProductCard
                key={product._id.toString()}
                product={product}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ManageProductsPage;
