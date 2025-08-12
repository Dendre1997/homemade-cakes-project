'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DiameterForm from '@/components/admin/DiameterForm';
import Link from 'next/link';
import { Diameter, ProductCategory } from '@/types';

const ManageDiametersPage = () => {
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDiameters = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const [diametersRes, categoriesRes] = await Promise.all([
        fetch('/api/diameters'),
        fetch('/api/categories'),
      ]);
      if (!diametersRes.ok || !categoriesRes.ok)
        throw new Error('Failed to fetch data');

      const diametersData = await diametersRes.json();
      const categoriesData = await categoriesRes.json();

      setDiameters(diametersData);
      setCategories(categoriesData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching diameters');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this diameter? This action can't be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/diameters/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete diameter');
      }

      setDiameters((prev) =>
        prev.filter((diameter) => diameter._id.toString() !== id)
      );

      alert('Diameter was successfully deleted');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('Unknown error occurred.');
      }
    }
  };

  useEffect(() => {
    fetchDiameters();
  }, [fetchDiameters]);

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Diameter Management</h1>

      <DiameterForm onFormSubmit={fetchDiameters} categories={categories} />

      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Diameters</h2>

        {isLoading && <p>Loading list of diameters...</p>}
        {error && <p className='text-red-500'>Error: {error}</p>}

        {!isLoading && !error && (
          <ul className='space-y-2'>
            {diameters.map((diameter) => (
              <li
                key={diameter._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <div>
                  <span className='text-gray-500 ml-4'>
                    Name: {diameter.name}
                  </span>
                  <span className='text-gray-500 ml-4'>
                    SizeValue: {diameter.sizeValue}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Link
                    href={`/admin/diameters/${diameter._id.toString()}/edit`}
                    className='bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(diameter._id.toString())}
                    className='bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && diameters.length === 0 && (
          <p>No diameters have been added yet.</p>
        )}
      </div>
    </section>
  );
};

export default ManageDiametersPage;