'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DecorationsForm from '@/components/admin/DecorationsForm';
// import  from 'react';
import { Decoration } from '@/types';
const ManageDecorationsPage = () => {
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecorations = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/decorations');

      if (!response.ok) {
        throw new Error('Failed to fetch decorations');
      }

      const data = await response.json();
      setDecorations(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching decorations');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure, you want to delete this decoration? This action can't be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/decorations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete decoration');
      }
      setDecorations((prevDecorations) =>
        prevDecorations.filter((decoration) => decoration._id.toString() !== id)
      );

      alert('Decoration was successfully deleted');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('Unknown error occurred.');
      }
    }
  };

  useEffect(() => {
    fetchDecorations();
  }, [fetchDecorations]);

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Flavors Managment</h1>

      <DecorationsForm onDecorationAdded={fetchDecorations} />

      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Decorations</h2>

        {/* Show  loading state future spinner*/}
        {isLoading && <p>Loading list of decorations...</p>}

        {/* Show an error if it exists */}
        {error && <p className='text-red-500'>Error: {error}</p>}

        {/* If no loading and no errors show the list */}
        {!isLoading && !error && (
          <ul className='space-y-2'>
            {decorations.map((decoration) => (
              <li
                key={decoration._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <div>
                  <span className='font-medium'>{decoration.name}</span>
                  <span className='text-gray-500 ml-4'>${decoration.price}</span>
                </div>
                <button
                  onClick={() => handleDelete(decoration._id.toString())}
                  className='bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors'
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* If Loading is over and array is empty */}
        {!isLoading && !error && decorations.length === 0 && (
          <p>No decorations have been added yet</p>
        )}
      </div>
    </section>
  );
};

export default ManageDecorationsPage;