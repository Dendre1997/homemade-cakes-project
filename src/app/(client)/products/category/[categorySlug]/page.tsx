import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory, ProductCategory } from "@/types";
import { notFound } from "next/navigation";
import { getActiveDiscounts } from "@/lib/data";
import { getCategoryBySlug } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";

const CategoryPage = async ({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) => {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) {
    notFound();
  }

  const categoryId =
    typeof category._id === "string" ? category._id : category._id.toString();

  let products: ProductWithCategory[] = [];
  try {
    const result = await getProducts({ categoryId });
    products = result.products as ProductWithCategory[];
  } catch (error) {
    console.error("Failed to fetch products for category", error);
  }

  const discounts = await getActiveDiscounts();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <div className="text-center">
          <h1 className="font-heading text-h1 text-primary">
            {(category as ProductCategory).name}
          </h1>
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
