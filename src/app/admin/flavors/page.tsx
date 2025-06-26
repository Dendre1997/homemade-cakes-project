'use client'
import React, { useState, useEffect } from 'react';
import FlavorForm from '@/components/admin/FlavorForm';
// import  from 'react';
import { Flavor } from '@/types';
const ManageFlavorsPage = () => {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Використовуємо useEffect для завантаження даних при першому рендері
  useEffect(() => {
    const fetchFlavors = async () => {
      try {
        setError(null);
        setIsLoading(true); 

        const response = await fetch('/api/flavors');

        if (!response.ok) {
          throw new Error('Failed to fetch flavors');
        }

        const data = await response.json();
        setFlavors(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while fetching flavors');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlavors();
  }, []);

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Flavors Managment</h1>

      <FlavorForm />

      <div className='mt-10'>
        <h2 className='text-2xl font-bold mb-4'>Existing Flavors</h2>

        {/* Show  loading state future spinner*/}
        {isLoading && <p>Loading list of flavors...</p>}

        {/* Show an error if it exists */}
        {error && <p className='text-red-500'>Error: {error}</p>}

        {/* If no loading and no errors show the list */}
        {!isLoading && !error && (
          <ul className='space-y-2'>
            {flavors.map((flavor) => (
              <li
                key={flavor._id.toString()}
                className='p-4 bg-white rounded-md shadow flex justify-between items-center'
              >
                <span>{flavor.name}</span>
                <span className='font-semibold'>${flavor.price}</span>
              </li>
            ))}
          </ul>
        )}

        {/* If Loading is over and array is empty */}
        {!isLoading && !error && flavors.length === 0 && (
          <p>No flavors have been added yet</p>
        )}
      </div>
    </section>
  );
};

export default ManageFlavorsPage;
