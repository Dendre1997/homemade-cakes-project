'use client';

import React, { useState } from 'react';
import { Diameter } from '@/types';

interface DiameterFormProps {
  existingDiameter?: Diameter | null;
  onFormSubmit: () => void;
}

const DiameterForm = ({
  existingDiameter,
  onFormSubmit,
}: DiameterFormProps) => {
  const isEditMode = !!existingDiameter;

//   const [name, setName] = useState(existingDiameter?.name || '');
  const [sizeValue, setSizeValue] = useState(
    existingDiameter?.sizeValue?.toString() || ''
  );
  const [unit, setUnit] = useState(existingDiameter?.unit || '');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name,
      sizeValue: parseFloat(sizeValue),
      unit,
    };

    try {
      const response = await fetch(
        isEditMode
          ? `/api/diameters/${existingDiameter?._id}`
          : '/api/diameters',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? 'update' : 'create'} diameter`
        );
      }

      alert(`Diameter ${isEditMode ? 'updated' : 'added'}!`);

      if (!isEditMode) {
        // setName('');
        setSizeValue('');
        setUnit('');
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
        {isEditMode ? 'Update Diameter' : 'Add New Diameter'}
      </h2>

      <div className='space-y-4'>
        {/* <div>
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
        </div> */}

        <div>
          <label
            htmlFor='sizeValue'
            className='block text-sm font-medium text-gray-700'
          >
            Size Value
          </label>
          <input
            type='number'
            id='sizeValue'
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value)}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
            required
          />
        </div>

        <div>
          <label
            htmlFor='unit'
            className='block text-sm font-medium text-gray-700'
          >
            Unit
          </label>
          <input
            type='text'
            id='unit'
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
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
              ? 'Update Diameter'
              : 'Add Diameter'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default DiameterForm;
