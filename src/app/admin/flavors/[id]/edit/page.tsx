'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Flavor, ProductCategory } from '@/types';
import FlavorForm from '@/components/admin/FlavorForm';
import LoadingSpinner from '@/components/Spinner';

const EditFlavorPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchInitialData = async () => {
        try {
          const [flavorRes, categoriesRes] = await Promise.all([
            fetch(`/api/flavors/${id}`),
            fetch('/api/categories'),
          ]);

          if (!flavorRes.ok || !categoriesRes.ok) {
            throw new Error('Failed to fetch initial data');
          }

          const flavorData = await flavorRes.json();
          const categoriesData = await categoriesRes.json();

          setFlavor(flavorData);
          setCategories(categoriesData);
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [id]);

  const handleUpdateSuccess = () => {
    router.push('/admin/flavors');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Edit Flavor: {flavor?.name}</h1>
      <FlavorForm
        existingFlavor={flavor}
        onFormSubmit={handleUpdateSuccess}
        categories={categories}
      />
    </section>
  );
};
export default EditFlavorPage;
