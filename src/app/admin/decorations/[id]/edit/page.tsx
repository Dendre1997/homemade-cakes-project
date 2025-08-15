'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Decoration, ProductCategory } from '@/types';
import DecorationsForm from '@/components/admin/DecorationsForm';
import LoadingSpinner from '@/components/Spinner';

const EditDecorationPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [decoration, setDecoration] = useState<Decoration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchDecorationData = async () => {
        try {
          const [DecorationRes, categoriesRes] = await Promise.all([
            fetch(`/api/decorations/${id}`),
            fetch('/api/categories'),
          ]);

          if (!DecorationRes.ok || !categoriesRes.ok) {
            throw new Error('Failed to fetch initial data');
          }

          const decorationData = await DecorationRes.json();
          const categoriesData = await categoriesRes.json();

          setDecoration(decorationData);
          setCategories(categoriesData);
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDecorationData();
    }
  }, [id]);

  const handleUpdateSuccess = () => {
    router.push('/admin/decorations');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <DecorationsForm
        existingDecoration={decoration}
        categories={categories}
        onFormSubmit={handleUpdateSuccess}
      />
    </section>
  );
};

export default EditDecorationPage;