import ProductCard from "@/components/(client)/ProductCard";
import { ProductWithCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";

async function getProducts() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${baseUrl}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  return res.json();
}

const ProductsPage = async () => {
  const products: ProductWithCategory[] = await getProducts();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-1 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-h1 text-text-primary">
            Our Latest Creations
          </h2>
          <p className="mt-4 font-body text-lg text-text-primary/90 max-w-2xl mx-auto">
            Discover our handcrafted cakes, made with love and the finest
            ingredients. Perfect for every celebration and every sweet moment.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          {products.map((product) => (
            <ProductCard key={product._id.toString()} product={product} />
          ))}
        </div>
        <div className="mt-20 text-center">
          <Button variant="primary" size="lg">
            View More Cakes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
