import Link from 'next/link';
import React from 'react';

const AdminSidebar = () => {
  return (
    <aside className='w-64 flex-shrink-0 bg-gray-800 text-white p-5'>
      <div className='text-2xl font-semibold mb-8'>Homemade Cakes</div>
      <nav>
        <ul>
          <li className='mb-2'>
            <Link
              href='/admin/dashboard'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              General
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/products'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Products
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/orders'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Orders
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/products/create'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Create Product
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/decorations'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Decoration
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/flavors'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Flavors
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/categories'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Categories
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/diameters'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Diameters
            </Link>
          </li>
          <li className='mb-2'>
            <Link
              href='/admin/allergens'
              className='block py-2 px-4 rounded hover:bg-gray-700 transition-colors duration-200'
            >
              Allergens
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
