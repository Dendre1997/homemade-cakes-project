'use client';
import { useEffect, useState } from 'react';
import { useParams,useRouter } from 'next/navigation';
import { Flavor } from '@/types';
import FlavorForm from '@/components/admin/FlavorForm';

const EditFlavorPage = () => {
  const params = useParams();
  const router = useRouter()
  const id = params.id;

  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchFlavorData = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/flavors/${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch flavor data');
          }
          const data = await response.json();
          setFlavor(data);
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
          else setError('An unknown error occurred');
        } finally {
          setIsLoading(false);
        }
      };

      fetchFlavorData();
    }
  }, [id]);

  const handleUpdateSuccess = () => {
    router.push('/admin/flavors');
  };

  if (isLoading) {
    return <p>Loading data of flavor...</p>;
  }

  if (error) {
    return <p className='text-red-500'>Error: {error}</p>;
  }

  if (!flavor) {
    return <p>Flavor not found.</p>;
  }

  return (
    <section>
      <FlavorForm existingFlavor={flavor} onFormSubmit={handleUpdateSuccess} />
    </section>
  );
};

export default EditFlavorPage;
