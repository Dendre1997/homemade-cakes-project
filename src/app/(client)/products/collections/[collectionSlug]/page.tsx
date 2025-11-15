import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory, Collection } from "@/types";
import { notFound } from "next/navigation";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
async function getCollectionBySlug(slug: string) {
  const res = await fetch(
    `${baseUrl}/api/collections/slug/${slug}`,
    {
      cache: "no-store",
    }
  );
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) throw new Error("Failed to fetch collection details");
  return res.json();
}

async function getProductsByCollection(collectionId: string) {
  const res = await fetch(
    `${baseUrl}/api/products?collectionId=${collectionId}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    console.error("Failed to fetch products for collection");
    return [];
  }
  return res.json();
}

const CollectionPage = async ({
  params,
}: {
  params: { collectionSlug: string }; 
}) => {
  const collection: Collection = await getCollectionBySlug(
    params.collectionSlug
  );

  const products: ProductWithCategory[] = await getProductsByCollection(
    collection._id.toString()
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <div className="text-center">
          <h1 className="font-heading text-h1 text-primary">
            {collection.name}
          </h1>
          <p className="mt-md font-body text-lg text-primary/90 max-w-2xl mx-auto">
            {collection.description ||
              `Discover our ${collection.name.toLowerCase()} collection.`}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="mt-xl grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            {products.map((product) => (
              <ProductCard key={product._id.toString()} product={product} />
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
