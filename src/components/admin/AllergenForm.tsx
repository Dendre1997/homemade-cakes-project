'use client';

import React, { useState } from 'react';
import { Allergen } from '@/types';

interface AllergenFormProps {
  existingAllergen?: Allergen | null;
  onAllergenSubmit: () => void;
}

const AllergenForm = ({
  existingAllergen,
  onAllergenSubmit,
}: AllergenFormProps) => {
  const isEditMode = !!existingAllergen;
  const [name, setName] = useState(existingAllergen?.name || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = { name };

    try {
      const response = await fetch(
        isEditMode
          ? `/api/allergens/${existingAllergen?._id}`
          : '/api/allergens',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? 'update' : 'create'} allergen.`
        );
      }

      if (!isEditMode) {
        setName('');
      }

      onAllergenSubmit();
      alert(`Allergen successfully ${isEditMode ? 'updated' : 'added'}`);
    } catch (err: unknown) {
      console.error('An error occurred:', err);
      let errorMessage = 'An unknown error occurred.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='p-6 bg-white rounded-lg shadow-md max-w-lg'
    >
      <h2 className='text-2xl font-semibold mb-4'>
        {isEditMode ? 'Update Allergen' : 'Add New Allergen'}
      </h2>
      <div className='space-y-4'>
        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-gray-700'
          >
            Name
          </label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
            required
          />
        </div>
        {error && (
          <div className='text-red-500 text-sm'>
            <p>Error: {error}</p>
          </div>
        )}
        <div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300'
          >
            {isLoading
              ? isEditMode
                ? 'Updating...'
                : 'Adding...'
              : isEditMode
              ? 'Update Allergen'
              : 'Add Allergen'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AllergenForm;
