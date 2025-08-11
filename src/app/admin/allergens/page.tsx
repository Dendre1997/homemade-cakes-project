'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AllergenForm from '@/components/admin/AllergenForm';
import Link from 'next/link';
import { Allergen } from '@/types';
const ManageAllergensPage = () => {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllergens = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/allergens');

      if (!response.ok) {
        throw new Error('Failed to fetch allergens');
      }

      const data = await response.json();
      setAllergens(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching allergens');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure, you want to delete this allergen? This action can't be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/allergens/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete allergen');
      }
      setAllergens((prevAllergen) =>
        prevAllergen.filter((allergen) => allergen._id.toString() !== id)
      );

      alert('Allergen was successfully deleted');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('Unknown error occurred.');
      }
    }
  };

  useEffect(() => {
    fetchAllergens();
  }, [fetchAllergens]);

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Flavors Managment</h1>

      <AllergenForm onAllergenSubmit={fetchAllergens} />

      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Allergens</h2>

        {/* Show  loading state future spinner*/}
        {isLoading && <p>Loading list of allergens...</p>}

        {/* Show an error if it exists */}
        {error && <p className='text-red-500'>Error: {error}</p>}

        {/* If no loading and no errors show the list */}
        {!isLoading && !error && (
          <ul className='space-y-2'>
            {allergens.map((allergen) => (
              <li
                key={allergen._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <div>
                  <span className='font-medium'>{allergen.name}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Link
                    href={`/admin/allergens/${allergen._id.toString()}/edit`}
                    className='bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(allergen._id.toString())}
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
        {!isLoading && !error && allergens.length === 0 && (
          <p>No allergens have been added yet</p>
        )}
      </div>
    </section>
  );
};

export default ManageAllergensPage;
