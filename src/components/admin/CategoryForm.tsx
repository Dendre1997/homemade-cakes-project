"use client";
import { useState, useEffect } from "react";
import { ProductCategory } from "@/types";
import { slugify } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className="block font-body text-small text-text-primary/80 mb-sm"
  >
    {children}
  </label>
);
interface CategoryFormProps {
  existingCategory?: ProductCategory | null;
  onSubmit: (
    formData: Omit<ProductCategory, "_id" | "slug"> & {
      slug: string;
      manufacturingTimeInMinutes: number;
    }
  ) => void;
  isSubmitting: boolean;
}

const CategoryForm = ({
  existingCategory,
  onSubmit,
  isSubmitting
}: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    manufacturingTimeInMinutes: 0,
  });

  useEffect(() => {
    if (existingCategory) {
      setFormData({
        name: existingCategory.name || "",
        slug: existingCategory.slug || "",
        manufacturingTimeInMinutes:
          existingCategory.manufacturingTimeInMinutes || 0,
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        slug: "",
        manufacturingTimeInMinutes: 0,
      });
    }
  }, [existingCategory, isSubmitting]);

  useEffect(() => {
    if (!existingCategory) {
      setFormData((prev) => ({
        ...prev,
        slug: slugify(prev.name),
      }));
    }
  }, [formData.name, existingCategory]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <div>
        <FormLabel htmlFor="name">Name</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <FormLabel htmlFor="slug">URL Slug (auto-generated)</FormLabel>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="e.g., bento-cakes"
          required
        />
      </div>
      <div>
        <FormLabel htmlFor="manufacturingTime">
          Manufacturing Time (minutes)
        </FormLabel>
        <Input
          id="manufacturingTime"
          type="number"
          value={formData.manufacturingTimeInMinutes}
          onChange={(e) =>
            setFormData({
              ...formData,
              manufacturingTimeInMinutes: parseInt(e.target.value) || 0,
            })
          }
          placeholder="e.g., 90"
        />
        <p className="mt-1 text-xs text-gray-500">
          Time required to prepare one item from this category.
        </p>
      </div>
      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          variant="primary"
        >
          {isSubmitting ? "Saving..." : existingCategory ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;
