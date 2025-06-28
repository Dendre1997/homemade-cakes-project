'use client'
import React, { useState } from "react"

interface DecorationsFormProps {
  onDecorationAdded: () => void;
}
const DecorationsForm = ({onDecorationAdded}: DecorationsFormProps) => {
    const [name, setName] = useState('');
      const [price, setPrice] = useState('');
      const [imageUrl, setImageUrl] = useState('');
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [error, setError] = useState<string | null>(null);
    
      const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
    
        try {
          const body = {
            name,
            price: parseFloat(price),
            imageUrl,
          };
    
          const response = await fetch('/api/decorations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            throw new Error(
              'Failed to create decoration. Server responded with ' + response.status
            );
          }
          setName('');
          setPrice('');
          setImageUrl('');
          onDecorationAdded();
          alert('Decoration successfully added');
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
          <h2 className='text-2xl font-semibold mb-4'>Add New Decoration</h2>
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
                {isLoading ? 'Adding...' : 'Add Decoration'}
              </button>
            </div>
          </div>
        </form>
      );
}
 
export default DecorationsForm;