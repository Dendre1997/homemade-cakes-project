import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory, ProductCategory } from "@/types";
import { notFound } from "next/navigation";
import { getActiveDiscounts } from "@/lib/data";


const baseUrl = process.env.NEXT_PUBLIC_API_URL;

async function getCategoryBySlug(slug: string) {
  const res = await fetch(`${baseUrl}/api/categories/slug/${slug}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) throw new Error("Failed to fetch category details");
  return res.json();
}

async function getProductsByCategory(categoryId: string) {
  const res = await fetch(
    `${baseUrl}/api/products?categoryId=${categoryId}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    console.error("Failed to fetch products for category");
    return [];
  }
  return res.json();
}


const CategoryPage = async ({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) => {
  const { categorySlug } = await params;
  const category: ProductCategory = await getCategoryBySlug(categorySlug);

  const products: ProductWithCategory[] = await getProductsByCategory(
    category._id
  );

  const discounts = await getActiveDiscounts();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <div className="text-center">
          <h1 className="font-heading text-h1 text-primary">{category.name}</h1>
          <p className="mt-md font-body text-lg text-primary/90 max-w-2xl mx-auto">
            Discover our collection of handcrafted {category.name.toLowerCase()}
            , made with love and the finest ingredients.
          </p>
        </div>

        {products.length > 0 ? (
          <div className="mt-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} validDiscounts={discounts} />
            ))}
          </div>
        ) : (
          <p className="mt-xl text-center font-body text-lg text-primary/80">
            No products found in this category yet. Please check back soon!
          </p>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
