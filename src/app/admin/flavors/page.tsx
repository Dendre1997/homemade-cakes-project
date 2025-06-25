import React from 'react';
import FlavorForm from '@/components/admin/FlavorForm';
const ManageFlavorsPage = () => {
  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Flavors Managment</h1>

      <FlavorForm />
      <p>placeholder for future inputs and list of existing flavors</p>
    </section>
  );
};

export default ManageFlavorsPage;
