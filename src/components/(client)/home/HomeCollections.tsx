"use client";

import { Collection } from "@/types";
import FeatureGrid from "./FeatureGrid";

interface HomeCollectionsProps {
  collections: Collection[];
}

const HomeCollections = ({ collections }: HomeCollectionsProps) => {
  const gridItems = collections
    .filter((col) => col.slug)
    .map((col) => ({
      id: col._id.toString(),
      name: col.name,
      imageUrl: col.imageUrl,
      href: `/products/collections/${col.slug}`,
    }));

  if (gridItems.length === 0) return null;

  return <FeatureGrid title="" items={gridItems} />;
};

export default HomeCollections;
