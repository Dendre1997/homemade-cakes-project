'use client';
import { useState } from 'react';
import { ProductCategory } from '@/types';

interface CategoryFormProps {
  existingCategory?: ProductCategory | null;
  onFormSubmit: () => void;
}

const CategoryForm = ({
  existingCategory,
  onFormSubmit,
}: CategoryFormProps) => {
  const isEditMode = !!existingCategory;
  const [name, setName] = useState(existingCategory?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(
        isEditMode
          ? `/api/categories/${existingCategory?._id}`
          : '/api/categories',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }
      );
      if (!response.ok) throw new Error('Failed to submit category');
      onFormSubmit();
    } catch (error) {
      console.error(error);
      alert('Error submitting form');
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
        {isEditMode ? 'Edit Category' : 'Create New Category'}
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
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm'
            required
          />
        </div>
        <div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700'
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CategoryForm;
