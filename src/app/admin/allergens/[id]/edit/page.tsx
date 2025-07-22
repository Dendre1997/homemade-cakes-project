'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Allergen } from '@/types';
import AllergenForm from '@/components/admin/AllergenForm';

const EditAllergenPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [allergen, setAllergen] = useState<Allergen | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/allergens/${id}`)
        .then(res => res.json())
        .then(data => setAllergen(data));
    }
  }, [id]);

  if (!allergen) return <p>Loading...</p>;

  return (
    <section>
      <AllergenForm
        existingAllergen={allergen}
        onAllergenSubmit={() => router.push('/admin/allergens')}
      />
    </section>
  );
};
export default EditAllergenPage;