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
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Our Latest Creations
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            Discover our handcrafted cakes, made with love and the finest
            ingredients. Perfect for every celebration and every sweet moment.
          </p>
        </div>

        {/* Products Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <div
              key={product._id.toString()}
              className="transition-transform transform hover:scale-105"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Optional: Call to action */}
        <div className="mt-20 text-center">
          <button className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:bg-indigo-500 transition">
            View More Cakes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
