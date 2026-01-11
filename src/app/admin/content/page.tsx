"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LayoutTemplate, Images, FileText, Percent, Video } from "lucide-react";
import { ContentCard } from "@/components/admin/ContentCard";

const contentSections = [
  {
    title: "Home Page Slider",
    description: "Manage the main Title slider on the homepage.",
    icon: <Images className="h-8 w-8 text-primary" />,
    href: "/admin/content/hero-slides",
    color: "bg-blue-50",
  },
  {
    title: "Home Page Video Banner",
    description: "Manage Video on Home Page",
    icon: <Video className="h-8 w-8 text-primary" />,
    href: "/admin/content/video-banner",
    color: "bg-blue-50",
  },
];

const ManageContentPage = () => {
  return (
    <section>
      <h1 className="font-heading text-h1 text-primary mb-lg">
        Storefront Content
      </h1>
      <p className="font-body text-primary/80 mb-xl max-w-2xl">
        Manage the look and feel of your public website. Select a section below
        to edit.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {contentSections.map((section) => (
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

export default ManageContentPage;
