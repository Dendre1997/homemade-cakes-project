'use client';

import { useState } from 'react';
import {
  Allergen,
  Diameter,
  Flavor,
  // ProductCategory,
  AvailableDiameterConfig,
} from '@/types';

interface ProductFormProps {
  flavors: Flavor[];
  diameters: Diameter[];
  allergens: Allergen[];
  categoryId: string;
}

const ProductForm = ({flavors,diameters,allergens,categoryId,
}: ProductFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [structureBasePrice, setStructureBasePrice] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [availableFlavorIds, setAvailableFlavorIds] = useState<string[]>([]);
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [availableDiameterConfigs, setAvailableDiameterConfigs] = useState<
    AvailableDiameterConfig[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMultiSelectChange = (
    idToToggle: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(idToToggle)
        ? prev.filter((id) => id !== idToToggle)
        : [...prev, idToToggle]
    );
  };

  const handleDiameterConfigChange = (
    diameterId: string,
    multiplier: string
  ) => {
    const numericMultiplier = parseFloat(multiplier);
    setAvailableDiameterConfigs((prev) => {
      const existingConfig = prev.find((c) => c.diameterId === diameterId);
      if (multiplier === '' || isNaN(numericMultiplier)) {
        return prev.filter((c) => c.diameterId !== diameterId);
      }
      if (existingConfig) {
        return prev.map((c) =>
          c.diameterId === diameterId
            ? { ...c, multiplier: numericMultiplier }
            : c
        );
      } else {
        return [...prev, { diameterId, multiplier: numericMultiplier }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const productData = {
        name,
        description,
        categoryId,
        structureBasePrice: parseFloat(structureBasePrice),
        isActive,
        availableFlavorIds,
        allergenIds,
        availableDiameterConfigs,
        imageUrls: [], // Empty for now
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      alert('Product created successfully!');
      // later add redirect to clear form
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-8 p-8 bg-white rounded-lg shadow-md'
    >
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Basic Information</h2>
        <div>
          <label htmlFor='name'>Product Name</label>
          <input
            type='text'
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor='description'>Description</label>
          <textarea
            id='description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div>
          <label htmlFor='price'>Base Price</label>
          <input
            type='number'
            id='price'
            value={structureBasePrice}
            onChange={(e) => setStructureBasePrice(e.target.value)}
            required
          />
        </div>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='isActive'
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className='h-4 w-4'
          />
          <label htmlFor='isActive' className='ml-2'>
            Product is Active
          </label>
        </div>
      </div>
      <div className='space-y-2'>
        <h3 className='text-lg font-medium'>Available Flavors</h3>
        <div className='p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
          {flavors.map((flavor) => (
            <div key={flavor._id.toString()} className='flex items-center'>
              <input
                type='checkbox'
                id={`flavor-${flavor._id.toString()}`}
                checked={availableFlavorIds.includes(flavor._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    flavor._id.toString(),
                    setAvailableFlavorIds
                  )
                }
              />
              <label
                htmlFor={`flavor-${flavor._id.toString()}`}
                className='ml-2'
              >
                {flavor.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className='space-y-2'>
        <h3 className='text-lg font-medium'>Allergens</h3>
        <div className='p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
          {allergens.map((allergen) => (
            <div key={allergen._id.toString()} className='flex items-center'>
              <input
                type='checkbox'
                id={`allergen-${allergen._id.toString()}`}
                checked={allergenIds.includes(allergen._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    allergen._id.toString(),
                    setAllergenIds
                  )
                }
              />
              <label
                htmlFor={`allergen-${allergen._id.toString()}`}
                className='ml-2'
              >
                {allergen.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className='space-y-2'>
        <h3 className='text-lg font-medium'>
          Available Diameters & Price Multipliers
        </h3>
        <div className='p-4 border rounded-md space-y-4'>
          {diameters.map((diameter) => {
            const currentMultiplier =
              availableDiameterConfigs.find(
                (c) => c.diameterId === diameter._id.toString()
              )?.multiplier || '';
            return (
              <div
                key={diameter._id.toString()}
                className='grid grid-cols-2 gap-4 items-center'
              >
                <label htmlFor={`diameter-${diameter._id.toString()}`}>
                  {diameter.name} {diameter.sizeValue}
                </label>
                <input
                  type='number'
                  id={`diameter-${diameter._id.toString()}`}
                  value={currentMultiplier}
                  onChange={(e) =>
                    handleDiameterConfigChange(
                      diameter._id.toString(),
                      e.target.value
                    )
                  }
                  placeholder='e.g., 1.5'
                  step='0.1'
                />
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className='text-red-500'>Error: {error}</p>}

      <button type='submit' disabled={isLoading} className='...'>
        {isLoading ? 'Creating Product...' : 'Create Product'}
      </button>
    </form>
  );
};

export default ProductForm;
