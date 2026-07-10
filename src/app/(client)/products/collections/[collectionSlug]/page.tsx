import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory, Collection } from "@/types";
import { notFound } from "next/navigation";
import { getActiveDiscounts } from "@/lib/data";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getProducts } from "@/lib/db/products";

const CollectionPage = async ({
  params,
}: {
  params: Promise<{ collectionSlug: string }>;
}) => {
  const { collectionSlug } = await params;
  const collection = await getCollectionBySlug(collectionSlug);

  if (!collection) {
    notFound();
  }

  const collectionId =
    typeof collection._id === "string"
      ? collection._id
      : collection._id.toString();

  let products: ProductWithCategory[] = [];
  try {
    const result = await getProducts({ collectionId });
    products = result.products as ProductWithCategory[];
  } catch (error) {
    console.error("Failed to fetch products for collection", error);
  }

  const discounts = await getActiveDiscounts();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <div className="text-center">
          <h1 className="font-heading text-h1 text-primary">
            {(collection as Collection).name}
          </h1>
        </div>

        {products.length > 0 ? (
          <div className="mt-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            {products.map((product) => (
              <ProductCard key={product._id.toString()} product={product} validDiscounts={discounts} />
            ))}
          </div>
        ) : (
          <p className="mt-xl text-center font-body text-lg text-primary/80">
            No products found in this collection yet. Please check back soon!
          </p>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
