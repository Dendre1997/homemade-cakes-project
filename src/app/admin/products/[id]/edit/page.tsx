'use client';
import { useEffect, useState} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product, ProductCategory, Flavor, Diameter, Allergen, ProductFormData } from '@/types';
import ProductForm from '@/components/admin/ProductForm';

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Стан для ВСІХ даних, необхідних для роботи сторінки та форми
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // Цей стан буде жити на сторінці і керувати вибором в <select>
  const [productCategoryId, setProductCategoryId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchAllData = async () => {
        try {
          const [
            productRes,
            categoriesRes,
            flavorsRes,
            diametersRes,
            allergensRes,
          ] = await Promise.all([
            fetch(`/api/products/${id}`),
            fetch('/api/categories'),
            fetch('/api/flavors'),
            fetch('/api/diameters'),
            fetch('/api/allergens'),
          ]);

          if (!productRes.ok) throw new Error('Failed to fetch product data');

          const productData = await productRes.json();
          setProduct(productData);
          setCategories(await categoriesRes.json());
          setFlavors(await flavorsRes.json());
          setDiameters(await diametersRes.json());
          setAllergens(await allergensRes.json());

          setProductCategoryId(productData.category._id.toString());
        } catch (err: unknown) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllData();
    }
  }, [id]);

  // Ця функція буде обробляти сабміт форми
  const handleUpdateProduct = async (productData: ProductFormData) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, categoryId: productCategoryId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      alert("Product updated successfully!");
      router.push("/admin/products");
    } catch (err) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      }
      console.error(err);
    }
  };

  if (isLoading) return <p>Loading product data for editing...</p>;
  if (error) return <p className='text-red-500'>Error: {error}</p>;

  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Edit Product: {product?.name}</h1>
      {product && (
        <ProductForm
          existingProduct={product}
          onFormSubmit={handleUpdateProduct}
          categories={categories}
          flavors={flavors}
          diameters={diameters}
          allergens={allergens}
          categoryId={productCategoryId}
          onCategoryChange={setProductCategoryId}
        />
      )}
    </section>
  );
};

export default EditProductPage;
