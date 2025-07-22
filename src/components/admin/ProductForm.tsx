'use client';
import { useState } from 'react';
import { Allergen, Diameter, Flavor, AvailableDiameterConfig } from '@/types';

interface ProductFormProps {
  flavors: Flavor[];
  diameters: Diameter[];
  allergens: Allergen[];
  // add later for editing mode
}

const ProductForm = ({ flavors, diameters, allergens }: ProductFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [structureBasePrice, setStructureBasePrice] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);


  const [selectedFlavorIds, setSelectedFlavorIds] = useState<string[]>([]);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<string[]>([]);
  const [diameterConfigs, setDiameterConfigs] = useState<AvailableDiameterConfig[]>([]);

  
  const handleMultiSelectChange = (
    idToToggle: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prevSelectedIds) => {
      if (prevSelectedIds.includes(idToToggle)) {
        return prevSelectedIds.filter((id) => id !== idToToggle);
      } else {
        return [...prevSelectedIds, idToToggle];
      }
    });
  };
  const handleDiameterConfigChange = (
    diameterId: string,
    multiplier: string
  ) => {
    const numericMultiplier = parseFloat(multiplier);
    setDiameterConfigs((prevConfigs) => {
      const existingConfigIndex = prevConfigs.findIndex((c: AvailableDiameterConfig) => c.diameterId === diameterId);
      if (existingConfigIndex > -1) {
        if (multiplier === '' || isNaN(numericMultiplier)) {
          return prevConfigs.filter(
            (c: AvailableDiameterConfig) => c.diameterId !== diameterId
          );
        } else {
          const updatedConfigs = [...prevConfigs];
          updatedConfigs[existingConfigIndex].multiplier = numericMultiplier;
          return updatedConfigs;
        }
      } else {
        if (multiplier !== '' && !isNaN(numericMultiplier)) {
          return [
            ...prevConfigs,
            { diameterId, multiplier: numericMultiplier },
          ];
        }
      }
      return prevConfigs;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({
      name,
      description,
      structureBasePrice,
      isActive,
      selectedFlavorIds,
      selectedAllergenIds,
    });
    alert('Testing no server data was sent');
    console.log(selectedFlavorIds, selectedAllergenIds);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-8 p-8 bg-white rounded-lg shadow-md'
    >
      <div>
        <h2 className='text-xl font-semibold'>General Info</h2>
        <div className='space-y-4 mt-4'>
          <div>
            <label
              htmlFor='name'
              className='block text-sm font-medium text-gray-700'
            >
              Product Name
            </label>
            <input
              type='text'
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='mt-1 block w-full input-class'
              required
            />
          </div>
          <div>
            <label
              htmlFor='description'
              className='block text-sm font-medium text-gray-700'
            >
              Description
            </label>
            <textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className='mt-1 block w-full input-class'
            />
          </div>
          <div>
            <label
              htmlFor='price'
              className='block text-sm font-medium text-gray-700'
            >
              Base Price (for minimum size)
            </label>
            <input
              type='number'
              id='price'
              value={structureBasePrice}
              onChange={(e) => setStructureBasePrice(e.target.value)}
              className='mt-1 block w-full input-class'
              required
            />
          </div>
        </div>
      </div>
      {/*Section for choosing flavors */}
      <div className='space-y-2'>
        <h3 className='text-lg font-medium text-gray-900'>Avaliable Flavors</h3>
        <div className='p-4 border border-gray-200 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
          {flavors.map((flavor) => (
            <div key={flavor._id.toString()} className='flex items-center'>
              <input
                type='checkbox'
                id={`flavor-${flavor._id.toString()}`}
                checked={selectedFlavorIds.includes(flavor._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    flavor._id.toString(),
                    setSelectedFlavorIds
                  )
                }
                className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
              />
              <label
                htmlFor={`flavor-${flavor._id.toString()}`}
                className='ml-3 block text-sm font-medium text-gray-700'
              >
                {flavor.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className='space-y-2'>
        <h3 className='text-lg font-medium text-gray-900'>Has allergens</h3>
        <div className='p-4 border border-gray-200 rounded-md grid grid-cols-2 md:grid-cols-3 gap-4'>
          {allergens.map((allergen) => (
            <div key={allergen._id.toString()} className='flex items-center'>
              <input
                type='checkbox'
                id={`allergen-${allergen._id.toString()}`}
                checked={selectedAllergenIds.includes(allergen._id.toString())}
                onChange={() =>
                  handleMultiSelectChange(
                    allergen._id.toString(),
                    setSelectedAllergenIds
                  )
                }
                className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
              />
              <label
                htmlFor={`allergen-${allergen._id.toString()}`}
                className='ml-3 block text-sm font-medium text-gray-700'
              >
                {allergen.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className='space-y-2'>
        <h3 className='text-lg font-medium text-gray-900'>
          Avaliable diameters and Price Multipliers
        </h3>
        <p className='text-sm text-gray-500'>
          For each diameter that will be available for this cake, specify the
          price multiplier. For example: 1 for the base size, 1.5 for a larger
          one, and so on.
        </p>
        <div className='p-4 border border-gray-200 rounded-md space-y-4'>
          {diameters.map((diameter) => {
            const currentConfig = diameterConfigs.find(
              (c) => c.diameterId === diameter._id.toString()
            );
            const currentMultiplier = currentConfig
              ? currentConfig.multiplier
              : '';
            return (
              <div
                key={diameter._id.toString()}
                className='grid grid-cols-2 gap-4 items-center'
              >
                <label
                  htmlFor={`diameter-${diameter._id.toString()}`}
                  className='text-sm font-medium text-gray-700'
                >
                  {diameter.name}
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
                  placeholder='e.g., 1 or 1.5'
                  step='0.1'
                  className='block w-full input-class'
                />
              </div>
            );
          })}
        </div>
      </div>

      <button type='submit' className='button-class'>
        {' '}
        {/* Use custome styles */}
        Create Product
      </button>
    </form>
  );
};

export default ProductForm;
