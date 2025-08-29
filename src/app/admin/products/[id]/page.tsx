"use client";

import { useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ProductWithCategory, Flavor, AvailableDiameterConfig } from "@/types";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cartStore";
import LoadingSpinner from "@/components/Spinner";
import { Button } from "@/components/ui/Button";

const SingleProductPage = () => {
  const params = useParams();
  const id = params.id as string;
    const router = useRouter()
  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const res = await fetch(`/api/products/${id}`);

          if (res.status === 404) {
            notFound();
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch data");

          const data = await res.json();
          setProduct(data);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  const displayableDiameters =
    product?.availableDiameterConfigs.flatMap((config) => {
      const details = product.availableDiameters.find(
        (d) => d._id.toString() === config.diameterId
      );

      if (!details) {
        return [];
      }

      // If details are found, return the object wrapped in an array.
      return [
        {
          name: details.name,
          multiplier: config.multiplier,
          id: details._id.toString(),
        },
      ];
    }) || []; // filter(Boolean) will remove all null/falsy entries

  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (isLoading) return <LoadingSpinner />;
  if (!product) return <p>Product not found.</p>;
  const firstImage = product.imageUrls[0] || "/placeholder.png";

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");

        router.push("/admin/products");
        router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error deleting product");
    }
  };

  return (
    <div className="bg-white">
      <div className="pt-6 pb-16 sm:pb-24">
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            {/* Image gallery */}
            <div className="aspect-square w-full overflow-hidden rounded-lg relative">
              <Image
                src={firstImage}
                alt={product.name}
                fill
                className="object-cover object-center transition-transform duration-500 hover:scale-105"
                priority
              />
            </div>

            {/* Product info */}
            <div className="mt-10 lg:mt-0">
              <h1 className="text-3xl font-heading tracking-tight">
                {product.name}
              </h1>
              <p className="text-lg mt-2 text-gray-500">
                {product.category.name}
              </p>
              <p className="text-3xl tracking-tight text-gray-900 mt-6">
                ${product.structureBasePrice.toFixed(2)}
              </p>

              <div className="mt-6">
                <h3 className="text-sm font-heading">
                  Description
                </h3>
                <p className="prose prose-sm mt-4 text-gray-500">
                  {product.description}
                </p>
              </div>

              <div className="mt-8 border-t pt-8">
                {/* Flavor Selector */}
                <div>
                  <h3 className="text-sm font-heading">Flavors</h3>
                  <fieldset className="mt-2">
                    <div className="flex flex-wrap gap-3">
                      {product.availableFlavors.map((flavor: Flavor) => {
                        return (
                          <p
                            className="rounded-md border px-4 py-2 text-sm font-medium"
                            key={flavor._id.toString()}
                          >
                            {flavor.name}
                          </p>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-heading">
                    Diameters
                  </h3>
                  <fieldset className="mt-2">
                    <div className="flex flex-wrap gap-3">
                      {displayableDiameters.map((diameter) => (
                        <p
                          className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium"
                          key={diameter.id}
                        >
                          {diameter.name}
                        </p>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <Button
              onClick={() => handleDelete(product._id.toString())}
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;
