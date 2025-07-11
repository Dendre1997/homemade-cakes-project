'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Diameter } from '@/types';
import DiameterForm from '@/components/admin/DiameterForm';

const EditDiameterPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [diameter, setDiameter] = useState<Diameter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchDiameterData = async () => {
        try {
          const response = await fetch(`/api/diameters/${id}`);
          if (!response.ok) throw new Error('Failed to fetch diameter data');
          const data = await response.json();
          setDiameter(data);
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDiameterData();
    }
  }, [id]);

  const handleUpdateSuccess = () => {
    router.push('/admin/diameters');
  };

  if (isLoading) return <p>Loading diameter data...</p>;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <DiameterForm
        existingDiameter={diameter}
        onFormSubmit={handleUpdateSuccess}
      />
    </section>
  );
};

export default EditDiameterPage;
