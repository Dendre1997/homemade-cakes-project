import ProductCard from "@/components/ProductCard";
import { ProductWithCategory } from "@/types";


async function getProducts() {
  // TODO: change on real url at deploy (from process.env)
  const res = await fetch("http://localhost:3000/api/products", {
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
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Our Latest Creations
        </h2>
        <p className="mt-4 text-xl text-gray-500">
          Discover our handcrafted cakes, made with love and the finest
          ingredients.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product._id.toString()} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
