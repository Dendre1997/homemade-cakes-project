"use client";

import { ProductCategory } from "@/types";
import FeatureGrid from "./FeatureGrid";

interface HomeCategoriesProps {
  categories: ProductCategory[];
}

const HomeCategories = ({ categories }: HomeCategoriesProps) => {
  const gridItems = categories.map((cat) => ({
    id: cat._id,
    name: cat.name,
    imageUrl: cat.imageUrl,
    href: `/products/category/${cat.slug}`,
  }));

  if (gridItems.length === 0) return null;

  return <FeatureGrid title="" items={gridItems} />;
};

export default HomeCategories;
