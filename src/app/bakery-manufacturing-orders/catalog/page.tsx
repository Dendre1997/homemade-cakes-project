"use client";

import { ContentCard } from "@/components/admin/ContentCard";
import {
  Tag,
  Layers,
  PartyPopper,
  Circle,
  AlertTriangle,
  Cake,
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
    title: "Decorations",
    description: "Set up decoration options and pricing.",
    icon: <PartyPopper className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/decorations",
  },
  {
    title: "Diameters",
    description: "Configure cake sizes, servings, and prices.",
    icon: <Circle className="h-8 w-8" />,
    href: "/bakery-manufacturing-orders/catalog/diameters",
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
      <h1 className="font-heading text-h1 text-primary mb-lg">
        Catalog Management
      </h1>
      <p className="font-body text-primary/80 mb-xl max-w-2xl">
        Manage the building blocks of your products. These attributes are used
        to create and customize your cakes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
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
