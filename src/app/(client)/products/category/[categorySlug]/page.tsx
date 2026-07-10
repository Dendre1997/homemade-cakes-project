import ProductCard from "@/components/(client)/ProductCard";
import DatabaseUnavailable from "@/components/ui/DatabaseUnavailable";
import { ProductWithCategory, ProductCategory } from "@/types";
import { notFound } from "next/navigation";
import { getActiveDiscounts } from "@/lib/data";
import { getCategoryBySlug } from "@/lib/db/categories";
import { getProducts } from "@/lib/db/products";
import { MongoUnavailableError } from "@/lib/db/withMongoRetry";

const CategoryPage = async ({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) => {
  const { categorySlug } = await params;

  let category;
  try {
    category = await getCategoryBySlug(categorySlug);
  } catch (error) {
    if (error instanceof MongoUnavailableError) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }

  if (!category) {
    notFound();
  }

  const categoryId =
    typeof category._id === "string" ? category._id : category._id.toString();

  let products: ProductWithCategory[] = [];
  let productsUnavailable = false;

  try {
    const result = await getProducts({ categoryId });
    products = result.products as ProductWithCategory[];
  } catch (error) {
    if (error instanceof MongoUnavailableError) {
      productsUnavailable = true;
      console.error("Failed to fetch products for category after retries", error);
    } else {
      throw error;
    }
  }

  let discounts: Awaited<ReturnType<typeof getActiveDiscounts>> = [];
  try {
    discounts = await getActiveDiscounts();
  } catch (error) {
    console.error("Failed to fetch discounts for category page", error);
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <div className="text-center">
          <h1 className="font-heading text-h1 text-primary">
            {(category as ProductCategory).name}
          </h1>
        </div>

        {productsUnavailable ? (
          <div className="mt-xl">
            <DatabaseUnavailable
              title="Products temporarily unavailable"
              message="We couldn't load products for this category right now. Please try again in a moment."
            />
          </div>
        ) : products.length > 0 ? (
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
