"use client";
import React, { useState, useEffect} from "react";
import { Diameter, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";;
import { ChipCheckbox } from "../ui/ChipCheckbox";


// ---Icon Components ---
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "../icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "../icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "../icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "../icons/cake-sizes/EightInchCakeIcon";

const availableIcons = [
  { name: "FourInchBentoIcon", size: 4, component: FourInchBentoIcon },
  { name: "FiveInchBentoIcon", size: 5, component: FiveInchBentoIcon },
  { name: "SixInchCakeIcon", size: 6, component: SixInchCakeIcon },
  { name: "SevenInchCakeIcon", size: 7, component: SevenInchCakeIcon },
  { name: "EightInchCakeIcon", size: 8, component: EightInchCakeIcon },
].sort((a, b) => a.size - b.size);

const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className="block font-body text-small text-primary/80 mb-sm"
  >
    {children}
  </label>
);

type DiameterFormData = Omit<Diameter, "_id">;
interface DiameterFormProps {
  existingDiameter?: Diameter | null;
  onSubmit: (formData: DiameterFormData) => void;
  isSubmitting: boolean;
  categories: ProductCategory[];
}

const DiameterForm = ({
  existingDiameter,
  onSubmit,
  isSubmitting,
  categories,
}: DiameterFormProps) => {
  const [formData, setFormData] = useState<DiameterFormData>({
    name: "",
    sizeValue: 0,
    servings: "",
    illustration: "",
    categoryIds: [],
  });

  useEffect(() => {
    if (existingDiameter) {
      setFormData({
        name: existingDiameter.name || "",
        sizeValue: existingDiameter.sizeValue || 0,
        servings: existingDiameter.servings || "",
        illustration: existingDiameter.illustration || "",
        categoryIds: existingDiameter.categoryIds || [],
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        sizeValue: 0,
        servings: "",
        illustration: "",
        categoryIds: [],
      });
    }
  }, [existingDiameter, isSubmitting]);

  useEffect(() => {
    const numericSize = formData.sizeValue;
    if (isNaN(numericSize) || availableIcons.length === 0) return;

    const minIcon = availableIcons[0];
    const maxIcon = availableIcons[availableIcons.length - 1];
    let bestMatch = minIcon;

    if (numericSize <= minIcon.size) bestMatch = minIcon;
    else if (numericSize >= maxIcon.size) bestMatch = maxIcon;
    else {
      bestMatch =
        availableIcons
          .slice()
          .reverse()
          .find((icon) => numericSize >= icon.size) || minIcon;
    }

    if (formData.illustration !== bestMatch.name) {
      setFormData((prev) => ({ ...prev, illustration: bestMatch.name }));
    }
  }, [formData.sizeValue, formData.illustration]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => {
      const currentCategoryIds = prev.categoryIds || [];
      return {
        ...prev,
        categoryIds: currentCategoryIds.includes(categoryId)
          ? currentCategoryIds.filter((id) => id !== categoryId)
          : [...currentCategoryIds, categoryId],
      };
    });
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const SelectedIcon = availableIcons.find(
    (icon) => icon.name === formData.illustration
  )?.component;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <h2 className="font-heading text-h3 text-primary">
        {existingDiameter ? "Update Diameter" : "Add New Diameter"}
      </h2>

      <div>
        <FormLabel htmlFor="name">Name (e.g., 6 Inch)</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <FormLabel htmlFor="sizeValue">
          Size Value (numerical, for sorting)
        </FormLabel>
        <div className="flex items-center gap-md">
          <Input
            type="number"
            id="sizeValue"
            value={formData.sizeValue === 0 ? "" : formData.sizeValue}
            onChange={handleChange}
            placeholder="0"
            required
            step="0.5"
          />
          {SelectedIcon && (
            <div className="h-10 w-10 p-2 border border-border rounded-medium shrink-0">
              <SelectedIcon />
            </div>
          )}
        </div>
      </div>

      <div>
        <FormLabel htmlFor="servings">
          Servings Text (e.g., 10-12 servings)
        </FormLabel>
        <Input
          type="text"
          id="servings"
          value={formData.servings}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-sm">
        <h3 className="font-body text-body font-bold text-primary">
          Categories
        </h3>
        <div
          className="p-md border border-border rounded-medium 
            grid gap-md
            grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
        >
          {categories.map((cat) => (
            <ChipCheckbox
              key={cat._id}
              checked={(formData.categoryIds || []).includes(cat._id)}
              onCheckedChange={() => handleCategoryChange(cat._id)}
            >
              {cat.name}
            </ChipCheckbox>
          ))}
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting
            ? "Saving..."
            : existingDiameter
              ? "Update Diameter"
              : "Add Diameter"}
        </Button>
      </div>
    </form>
  );
};

export default DiameterForm;
