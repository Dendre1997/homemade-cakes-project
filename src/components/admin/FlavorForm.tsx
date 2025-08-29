'use client';
import React, { useState, useEffect } from 'react'
import { Flavor, ProductCategory }  from '@/types';
import { Button } from '../ui/Button';
import { Input } from '@/components/ui/Input';
interface FlavorFormProps {
  existingFlavor?: Flavor | null;
  onFormSubmit: () => void;
  categories: ProductCategory[];
}
const FlavorForm = ({ existingFlavor, onFormSubmit, categories }: FlavorFormProps) => {
  const isEditMode = !!existingFlavor;
  const [name, setName] = useState(existingFlavor?.name || '');
  const [price, setPrice] = useState(existingFlavor?.price.toString() || '');
  const [description, setDescription] = useState(existingFlavor?.description || '');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingFlavor) {
      setName(existingFlavor.name);
      setPrice(existingFlavor.price.toString());
      setDescription(existingFlavor.description || '');
      setCategoryIds(existingFlavor.categoryIds || []);
    }
  }, [existingFlavor]);

  const handleCategoryChange = (categoryId: string) => {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name,
      price: parseFloat(price),
      description,
      categoryIds,
    };

    try {
     let response;
      if (isEditMode) {
        response = await fetch(`/api/flavors/${existingFlavor?._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch('/api/flavors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} flavor`);
      }
      alert(`Flavor Successfully ${isEditMode ? 'Updated' : 'Added'}!`);
      if (!isEditMode) {
        setName(''); setPrice(''); setDescription('');
      }
      onFormSubmit();

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
      <h2 className='text-2xl font-heading mb-4'>
        {isEditMode ? 'Update Flavor' : 'Add New Flavor'}
      </h2>
      <div className='space-y-4'>
        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-gray-700'
          >
            Name
          </label>
          <Input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
            required
          />
        </div>
        <div>
          <label
            htmlFor='price'
            className='block text-sm font-medium text-gray-700'
          >
            Price
          </label>
          <Input
            type='number'
            id='price'
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
            required
          />
        </div>
        <div>
          <label
            htmlFor='description'
            className='block text-sm font-medium text-gray-700'
          >
            Description (optional)
          </label>
          <textarea
            id='description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
          />
        </div>
        <div className='space-y-2'>
          <h3 className='text-lg font-medium text-gray-900'>Categories</h3>
          <div className='p-4 border border-gray-200 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
            {categories.map((cat) => (
              <div key={cat._id.toString()} className='flex items-center'>
                <Input
                  type='checkbox'
                  id={`cat-${cat._id.toString()}`}
                  checked={categoryIds.includes(cat._id.toString())}
                  onChange={() => handleCategoryChange(cat._id.toString())}
                  className='h-4 w-4 rounded border-gray-300 text-indigo-600'
                />
                <label
                  htmlFor={`cat-${cat._id.toString()}`}
                  className='ml-3 text-sm text-gray-700'
                >
                  {cat.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        {error && (
          <div className='text-red-500 text-sm'>
            <p>Error: {error}</p>
          </div>
        )}
        <div>
          <Button
            type='submit'
            disabled={isLoading}
            className='w-full'
          >
            {isLoading
              ? 'Saving...'
              : isEditMode
              ? 'Update Flavor'
              : 'Add Flavor'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default FlavorForm;
