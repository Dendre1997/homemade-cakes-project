'use client';
import { useState, useEffect, useCallback } from 'react';
import { ProductCategory } from '@/types';
import CategoryForm from '@/components/admin/CategoryForm';
import Link from 'next/link';

const ManageCategoriesPage = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ви впевнені?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert('Error deleting category');
    }
  };

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Category Management</h1>
      <CategoryForm onFormSubmit={fetchCategories} />
      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Categories</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <ul className='space-y-2'>
            {categories.map((cat) => (
              <li
                key={cat._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <span className='font-medium'>{cat.name}</span>
                <div className='flex items-center gap-2'>
                  <Link
                    href={`/admin/categories/${cat._id.toString()}/edit`}
                    className='bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-3 rounded-md text-sm'
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(cat._id.toString())}
                    className='bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-1 px-3 rounded-md text-sm'
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ManageCategoriesPage;
