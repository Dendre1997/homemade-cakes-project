'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Diameter, ProductCategory } from '@/types';
import DiameterForm from '@/components/admin/DiameterForm';

const EditDiameterPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [diameter, setDiameter] = useState<Diameter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);;

  useEffect(() => {
    if (id) {
      const fetchDiameterData = async () => {
        try {
          const [diameterRes, categoriesRes] = await Promise.all([
            fetch(`/api/diameters/${id}`),
            fetch('/api/categories'),
          ]);

          if (!diameterRes.ok || !categoriesRes.ok) {
            throw new Error('Failed to fetch initial data');
          }

          const diameterData = await diameterRes.json();
          const categoriesData = await categoriesRes.json();

          setDiameter(diameterData);
          setCategories(categoriesData);
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
        categories={categories}
      />
    </section>
  );
};

export default EditDiameterPage;
