'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import ProductForm from '@/components/admin/ProductForm';
import { Flavor, Diameter, Allergen, ProductCategory, Product, ProductFormData } from '@/types';
import LoadingSpinner from '@/components/Spinner';

const CreateProductPage = () => {
  const router = useRouter()
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allAllergens, setAllergens] = useState<Allergen[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [filteredFlavors, setFilteredFlavors] = useState<Flavor[]>([]);
  const [filteredDiameters, setFilteredDiameters] = useState<Diameter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDependentsLoading, setIsDependentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, allergensRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/allergens'),
        ]);

        if (!categoriesRes.ok || !allergensRes || !allergensRes.ok) {
          throw new Error('Failed to fetch initial data for the form');
        }
        setCategories(await categoriesRes.json());
        setAllergens(await allergensRes.json());
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);
  useEffect(() => {
    if (!selectedCategoryId) {
      setFilteredFlavors([]);
      setFilteredDiameters([]);
      return;
    }
    const fetchDependentData = async () => {
      setIsDependentsLoading(true);
      try {
        // Will create api which can fillter by category
        // For now load all
        const [flavorsRes, diametersRes] = await Promise.all([
          fetch(`/api/flavors?categoryId=${selectedCategoryId}`),
          fetch(`/api/diameters?categoryId=${selectedCategoryId}`),
        ]);
        if (!flavorsRes.ok || !diametersRes.ok) throw new Error('Failed to fetch dependent data');
        setFilteredFlavors(await flavorsRes.json());
        setFilteredDiameters(await diametersRes.json());
      } catch (error) {
        console.error(error)
      } finally {
        setIsDependentsLoading(false)
      }
    };
    fetchDependentData();
  }, [selectedCategoryId])

  // if (isLoading) return <p>Loading categories...</p>;
  // if (error) return <p className='text-red-500'>Error: {error}</p>;

  const handleCreateProduct = useCallback(
    async (productData: ProductFormData) => {
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error("Failed to create product");
        }

        alert("Product created successfully!");
        router.push("/admin/products");
      } catch (error) {
        console.error("Error creating product:", error);
        alert("Something went wrong!");
      }
    },
    [router]
  );
  if (isLoading) return <LoadingSpinner />;
  return (
    <section>
      <h1 className='text-3xl font-bold mb-6'>Create New Product</h1>

      {/* chose category */}
      <div className='mb-8 p-4 border rounded-md'>
        <label
          htmlFor='category-select'
          className='block text-lg font-medium mb-2'
        >
          Step 1: Choose a Product Category
        </label>
        <select
          id='category-select'
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className='w-full p-2 border rounded'
        >
          <option value=''>-- Select Category --</option>
          {categories.map((cat) => (
            <option key={cat._id.toString()} value={cat._id.toString()}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* show form if category was choosen */}
      {selectedCategoryId &&
        (isDependentsLoading ? (
          <p>Loading options for this category...</p>
        ) : (
          <ProductForm
            onFormSubmit={handleCreateProduct}
            categories={categories}
            categoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            flavors={filteredFlavors}
            diameters={filteredDiameters}
            allergens={allAllergens}
          />
        ))}
    </section>
  );
};

export default CreateProductPage;
