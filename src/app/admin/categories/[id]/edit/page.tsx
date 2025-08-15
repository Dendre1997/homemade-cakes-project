'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductCategory } from '@/types';
import CategoryForm from '@/components/admin/AllergenForm';
import Spinner from '@/components/Spinner'

const EditAllergenPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [category, setCategory] = useState<ProductCategory | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/categories/${id}`)
        .then((res) => res.json())
        .then((data) => setCategory(data));
    }
  }, [id]);

  if (!category) return <Spinner />;

  return (
    <section>
      <CategoryForm
        existingAllergen={category}
        onAllergenSubmit={() => router.push('/admin/categories')}
      />
    </section>
  );
};
export default EditAllergenPage;
