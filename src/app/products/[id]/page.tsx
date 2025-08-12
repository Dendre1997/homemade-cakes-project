"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { ProductWithCategory, Flavor, AvailableDiameterConfig } from "@/types";
import Image from "next/image";

const SingleProductPage = () => {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedDiameterConfig, setSelectedDiameterConfig] = useState<AvailableDiameterConfig | null>(null);

    
    
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
    product?.availableDiameterConfigs.map((config) => {
      const details = product.availableDiameters.find(
        (d) => d._id.toString() === config.diameterId
      );
      return {
        name: details?.name || "Unknown Size",
        multiplier: config.multiplier,
        id: details?._id.toString() || "",
      };
    }) || [];

    if (error) return <p className="text-red-500">Error: {error}</p>;
    if (!product) return <p>Product not found.</p>;
    
    const firstImage = product.imageUrls[0] || "/placeholder.png";
    
    let calculatedPrice = product.structureBasePrice;
    const selectedFlavor = product.availableFlavors.find(
        (f: Flavor) => f._id.toString() === selectedFlavorId
    );

    if (selectedFlavor) {
        calculatedPrice += selectedFlavor.price
    }
    
    if (selectedDiameterConfig) {
        calculatedPrice *= selectedDiameterConfig.multiplier;
    }
    if (isLoading) return <p>Loading product...</p>;
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
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {product.name}
              </h1>
              <p className="text-lg mt-2 text-gray-500">
                {product.category.name}
              </p>
              <p className="text-3xl tracking-tight text-gray-900 mt-6">
                ${calculatedPrice.toFixed(2)}
              </p>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900">
                  Description
                </h3>
                <p className="prose prose-sm mt-4 text-gray-500">
                  {product.description}
                </p>
              </div>

              <div className="mt-8 border-t pt-8">
                {/* Flavor Selector */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Flavor</h3>
                  <fieldset className="mt-2">
                    <div className="flex flex-wrap gap-3">
                      {product.availableFlavors.map((flavor: Flavor) => {
                        const isSelected =
                          selectedFlavorId === flavor._id.toString();

                        return (
                          <label
                            key={flavor._id.toString()}
                            htmlFor={`flavor-${flavor._id.toString()}`}
                            className={`cursor-pointer rounded-md border px-4 py-2 text-sm font-medium select-none
              ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-gray-300 hover:border-gray-500"
              }
            `}
                          >
                            <input
                              type="radio"
                              id={`flavor-${flavor._id.toString()}`}
                              name="flavor-choice"
                              value={flavor._id.toString()}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedFlavorId(flavor._id.toString());
                              }}
                              className="sr-only"
                            />
                            <span>{flavor.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                {/* Size Selector */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900">Size</h3>
                  <fieldset className="mt-2">
                    <div className="flex flex-wrap gap-3">
                      {displayableDiameters.map((diameter) => (
                        <label
                          key={diameter.id}
                          htmlFor={`size-${diameter.id}`}
                          className={`cursor-pointer rounded-md border px-4 py-2 text-sm font-medium select-none
            ${
              selectedDiameterConfig?.diameterId === diameter.id
                ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                : "border-gray-300 hover:border-gray-500"
            }`}
                        >
                          <input
                            type="radio"
                            id={`size-${diameter.id}`}
                            name="size-choice"
                            value={diameter.id}
                            checked={
                              selectedDiameterConfig?.diameterId === diameter.id
                            }
                            onChange={() => {
                              const config =
                                product.availableDiameterConfigs.find(
                                  (c) => c.diameterId === diameter.id
                                );
                              setSelectedDiameterConfig(config || null);
                            }}
                            className="sr-only"
                          />
                          <span>{diameter.name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;
