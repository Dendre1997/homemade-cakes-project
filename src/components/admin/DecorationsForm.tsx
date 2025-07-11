'use client'
import React, { useState } from "react"
import { Decoration } from "@/types";
interface DecorationsFormProps {
  existingDecoration?: Decoration | null;
  onFormSubmit: () => void;
}
const DecorationsForm = ({ existingDecoration, onFormSubmit,}: DecorationsFormProps) => {
  const isEditMode = !!existingDecoration;
  const [name, setName] = useState(existingDecoration?.name || '');
  const [price, setPrice] = useState( existingDecoration?.price.toString() || '');
  const [imageUrl, setImageUrl] = useState(existingDecoration?.imageUrl || '');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name,
      price: parseFloat(price),
      imageUrl,
    };

    try {
      const response = await fetch(
        isEditMode ? `/api/decorations/${existingDecoration?._id}` : '/api/decorations',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} decoration`);
      }
      alert(`Decoration ${isEditMode ? 'updated' : 'added'}!`);
      if (!isEditMode) {
        setName('');
        setPrice('');
        setImageUrl('');
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
      <h2 className='text-2xl font-semibold mb-4'>
        {isEditMode ? 'Add New Decoration' : 'Update Decoration'}
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
        <div>
          <label
            htmlFor='price'
            className='block text-sm font-medium text-gray-700'
          >
            Price
          </label>
          <input
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
            htmlFor='imageUrl'
            className='block text-sm font-medium text-gray-700'
          >
            URL Image (optional)
          </label>
          <input
            type='text'
            id='imageUrl'
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className='mt-1 block w-full input-class'
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
            {isLoading ? 'Adding...' : (isEditMode ? 'Update Decoration' : 'Add Decoration')}
          </button>
        </div>
      </div>
    </form>
  );
};
 
export default DecorationsForm;