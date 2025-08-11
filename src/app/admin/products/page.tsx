'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types';
import Link from 'next/link';
interface ProductWithCategory extends Product {
  category: {
    _id: string;
    name: string;
  };
}

const ManageProductsPage = () => {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?'))
      return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');

      fetchProducts();
    } catch (error) {
      console.error(error);
      alert('Error deleting product');
    }
  };

  return (
    <section>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold'>Manage Products</h1>
        <Link
          href='/admin/products/create'
          className='bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded'
        >
          Add New Product
        </Link>
      </div>

      {isLoading ? (
        <p>Loading products...</p>
      ) : (
        <div className='bg-white shadow-md rounded-lg overflow-hidden'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Name
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Category
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Base Price
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='relative px-6 py-3'>
                  <span className='sr-only'>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {products.map((product) => (
                <tr key={product._id.toString()}>
                  <td className='px-6 py-4 whitespace-nowrap font-medium text-gray-900'>
                    {product.name}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-gray-500'>
                    {product.category.name}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-gray-500'>
                    ${product.structureBasePrice}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <Link
                      href={`/admin/products/${product._id.toString()}/edit`}
                      className='text-indigo-600 hover:text-indigo-900 mr-4'
                    >
                      Edit
                    </Link>
                  </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <Link
                        href={`/admin/products/${product._id.toString()}/edit`}
                        className='text-indigo-600 hover:text-indigo-900 mr-4'
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id.toString())}
                        className='text-red-600 hover:text-red-900'
                      >
                        Delete
                      </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ManageProductsPage;
