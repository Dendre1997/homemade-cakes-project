"use client";

import { ContentCard } from "@/components/admin/ContentCard";
import {
  Tag,
  Layers,
  PartyPopper,
  Circle,
  AlertTriangle,
  Cake,
  Shapes,
  Package,
} from "lucide-react";

const catalogSections = [
  {
    title: "Categories",
    description: "Manage product categories (e.g., Cakes, Cupcakes).",
    icon: <Tag className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/categories",
  },
  {
    title: "Collections",
    description: "Curate thematic collections (e.g., Wedding, Birthday).",
    icon: <Layers className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/collections",
  },
  {
    title: "Flavors",
    description: "Manage available cake flavors and fillings.",
    icon: <Cake className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/flavors",
  },
  {
    title: "Addons",
    description: "Set up Addon options and pricing.",
    icon: <PartyPopper className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/addons",
  },
  {
    title: "Diameters",
    description: "Configure cake sizes, servings, and prices.",
    icon: <Circle className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/diameters",
  },
  {
    title: "Sets",
    description: "Configure sets, piece counts, and flavor limits.",
    icon: <Package className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/sets",
  },
  {
    title: "Shapes",
    description: "Manage cake shapes, surcharges, and default options.",
    icon: <Shapes className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/shapes",
  },
  {
    title: "Allergens",
    description: "Manage allergens (e.g., Peanuts, Dairy) for product safety.",
    icon: <AlertTriangle className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/allergens",
  },
];

const CatalogDashboardPage = () => {
  return (
    <section>
      <h1 className="mb-3 font-heading text-2xl font-bold tracking-tight text-primary text-balance sm:text-3xl">
        Catalog Management
      </h1>
      <p className="mb-8 max-w-2xl font-body text-primary/70 text-pretty">
        Manage the building blocks of your products. These attributes are used
        to create and customize your cakes.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalogSections.map((section) => (
          <ContentCard
            key={section.title}
            title={section.title}
            description={section.description}
            icon={section.icon}
            href={section.href}
          />
        ))}
      </div>
    </section>
  );
};

export default CatalogDashboardPage;
