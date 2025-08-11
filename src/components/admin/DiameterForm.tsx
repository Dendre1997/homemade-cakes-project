'use client';
import { useState, useEffect } from 'react';
import { Diameter, ProductCategory } from '@/types';

interface DiameterFormProps {
  existingDiameter?: Diameter | null;
  onFormSubmit: () => void;
  categories: ProductCategory[];
}

const DiameterForm = ({
  existingDiameter,
  onFormSubmit,
  categories,
}: DiameterFormProps) => {
  const isEditMode = !!existingDiameter;

  // State based on our final Diameter type
  const [name, setName] = useState('');
  const [sizeValue, setSizeValue] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useEffect to populate the form when in edit mode
  useEffect(() => {
    if (existingDiameter) {
      setName(existingDiameter.name || '');
      setSizeValue(existingDiameter.sizeValue.toString() || '');
      setCategoryIds(existingDiameter.categoryIds || []);
    }
  }, [existingDiameter]);

  // Handler for category checkboxes
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
      sizeValue: parseFloat(sizeValue),
      categoryIds,
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

      alert(`Diameter successfully ${isEditMode ? 'updated' : 'created'}!`);
      onFormSubmit();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
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
      <div className='space-y-6'>
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
          <label
            htmlFor='sizeValue'
            className='block text-sm font-medium text-gray-700'
          >
            Size Value (in inches)
          </label>
          <input
            type='number'
            id='sizeValue'
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value)}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm'
            required
            step='0.5'
          />
        </div>

        <div className='space-y-2'>
          <h3 className='text-lg font-medium'>Categories</h3>
          <div className='p-4 border border-gray-200 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
            {categories.map((cat) => (
              <div key={cat._id.toString()} className='flex items-center'>
                <input
                  type='checkbox'
                  id={`cat-dia-${cat._id.toString()}`}
                  checked={categoryIds.includes(cat._id.toString())}
                  onChange={() => handleCategoryChange(cat._id.toString())}
                  className='h-4 w-4 rounded border-gray-300 text-indigo-600'
                />
                <label
                  htmlFor={`cat-dia-${cat._id.toString()}`}
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
          <button
            type='submit'
            disabled={isLoading}
            className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
          >
            {isLoading
              ? 'Saving...'
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
