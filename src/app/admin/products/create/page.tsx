'use client';

import { useState, useEffect } from 'react';
import ProductForm from '@/components/admin/ProductForm';
import { Flavor, Diameter, Allergen } from '@/types'; // Імпортуємо всі потрібні типи

const CreateProductPage = () => {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormData = async () => {
      setIsLoading(true);
      try {
        const [flavorsRes, diametersRes, allergensRes] = await Promise.all([
          fetch('/api/flavors'),
          fetch('/api/diameters'),
          fetch('/api/allergens'),
        ]);

        if (!flavorsRes.ok || !diametersRes.ok || !allergensRes.ok) {
          throw new Error('Failed to fetch initial data for the form');
        }

        const flavorsData = await flavorsRes.json();
        const diametersData = await diametersRes.json();
        const allergensData = await allergensRes.json();

        setFlavors(flavorsData);
        setDiameters(diametersData);
        setAllergens(allergensData);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, []);

  if (isLoading) return <p>Loading data for form...</p>;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Create New Product</h1>
      <ProductForm
        flavors={flavors}
        diameters={diameters}
        allergens={allergens}
      />
    </section>
  );
};

export default CreateProductPage;
