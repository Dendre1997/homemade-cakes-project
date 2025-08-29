'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DecorationsForm from '@/components/admin/DecorationsForm';
import Link from 'next/link';
import LoadingSpinner from '@/components/Spinner';
import { Button } from '@/components/ui/Button';
// import  from 'react';
import { Decoration, ProductCategory } from '@/types';
const ManageDecorationsPage = () => {
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const fetchDecorations = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [decorationsRes, categoriesRes] = await Promise.all([
  fetch('/api/decorations'),
  fetch('/api/categories'),
]);
if (!decorationsRes.ok || !categoriesRes.ok)
  throw new Error('Failed to fetch data');

const decorationsData = await decorationsRes.json();
const categoriesData = await categoriesRes.json();

setDecorations(decorationsData);
setCategories(categoriesData);;
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
      <h1 className="text-3xl font-heading mb-6">Flavors Managment</h1>

      <DecorationsForm
        onFormSubmit={fetchDecorations}
        categories={categories}
      />

      <div className="mt-10">
        <h2 className="text-2xl font-heading mb-4">Existing Decorations</h2>

        {/* Show  loading state future spinner*/}
        {isLoading && <LoadingSpinner />}

        {/* Show an error if it exists */}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* If no loading and no errors show the list */}
        {!isLoading && !error && (
          <ul className="space-y-2">
            {decorations.map((decoration) => (
              <li
                key={decoration._id.toString()}
                className="p-4 bg-white rounded-md shadow flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{decoration.name}</span>
                  <span className="text-gray-500 ml-4">
                    ${decoration.price}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/decorations/${decoration._id.toString()}/edit`}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                  >
                    Update
                  </Link>
                  <Button
                  onClick={() => handleDelete(decoration._id.toString())}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
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
