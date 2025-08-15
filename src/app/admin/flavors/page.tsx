'use client'
import React, { useState, useEffect, useCallback } from 'react';
import FlavorForm from '@/components/admin/FlavorForm';
import { Flavor, ProductCategory } from '@/types';
import Link from 'next/link';
import LoadingSpinner from '@/components/Spinner';
const ManageFlavorsPage = () => {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
      const fetchFlavors = useCallback(async () => {
      try {
        setError(null);
        setIsLoading(true); 
        const [flavorsRes, categoriesRes] = await Promise.all([
          fetch('/api/flavors'),
          fetch('/api/categories'),
        ]);
        if (!flavorsRes.ok || !categoriesRes.ok) {
          throw new Error('Failed to fetch flavors');
        }
        const flavorsData = await flavorsRes.json();
        const categoriesData = await categoriesRes.json();

        setFlavors(flavorsData);
        setCategories(categoriesData)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while fetching flavors');
        }
      } finally {
        setIsLoading(false);
      }
      }, []);
  
      const handleDelete = async (id: string) => {
        if (
          !window.confirm(
            "Are you sure, you want to delete this flavor? This action can't be undone."
          )
        ) {
          return;
        }

        try {
          const response = await fetch(`/api/flavors/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete flavor');
          }
          setFlavors((prevFlavors) =>
            prevFlavors.filter((flavor) => flavor._id.toString() !== id)
          );

          alert('Flavor was successfully deleted');
        } catch (err: unknown) {
          if (err instanceof Error) {
            alert(`Error: ${err.message}`);
          } else {
            alert('Unknown error occurred.');
          }
        }
      };
  
    useEffect(() => {
      fetchFlavors();
    }, [fetchFlavors]);

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Flavors Managment</h1>

      <FlavorForm onFormSubmit={fetchFlavors} categories={categories} />

      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Flavors</h2>

        {/* Show  loading state future spinner*/}
        {isLoading && <LoadingSpinner />}

        {/* Show an error if it exists */}
        {error && <p className='text-red-500'>Error: {error}</p>}

        {/* If no loading and no errors show the list */}
        {!isLoading && !error && (
          <ul className='space-y-2'>
            {flavors.map((flavor) => (
              <li
                key={flavor._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <div>
                  <span className='font-medium'>{flavor.name}</span>
                  <span className='text-gray-500 ml-4'>${flavor.price}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Link
                    href={`/admin/flavors/${flavor._id.toString()}/edit`}
                    className='bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(flavor._id.toString())} // Додаємо обробник кліку
                    className='bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* If Loading is over and array is empty */}
        {!isLoading && !error && flavors.length === 0 && (
          <p>No flavors have been added yet</p>
        )}
      </div>
    </section>
  );
};

export default ManageFlavorsPage;
