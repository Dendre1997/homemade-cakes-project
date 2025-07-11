'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Decoration } from '@/types';
import DecorationsForm from '@/components/admin/DecorationsForm';

const EditDecorationPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [decoration, setDecoration] = useState<Decoration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchDecorationData = async () => {
        try {
          const response = await fetch(`/api/decorations/${id}`);
          if (!response.ok) throw new Error('Failed to fetch decoration data');
          const data = await response.json();
          setDecoration(data);
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

  if (isLoading) return <p>Loading decorations data...</p>;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <DecorationsForm
        existingDecoration={decoration}
        onFormSubmit={handleUpdateSuccess}
      />
    </section>
  );
};

export default EditDecorationPage;