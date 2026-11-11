"use client";

import React, { useState, useEffect } from "react";
import { Allergen } from "@/types";
import { Input } from "../ui/Input";
import {
  CatalogFormActions,
  catalogFieldClass,
  catalogFormCardClass,
  catalogFormTitleClass,
  catalogLabelClass,
} from "@/components/admin/catalog/CatalogFormChrome";


const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className={catalogLabelClass}
  >
    {children}
  </label>
);

type AllergenFormData = Omit<Allergen, "_id">;

interface AllergenFormProps {
  existingAllergen?: Allergen | null;
  onSubmit: (formData: AllergenFormData) => void; 
  isSubmitting: boolean;
  onCancel?: () => void;
}

const AllergenForm = ({
  existingAllergen,
  onSubmit,
  isSubmitting,
  onCancel,
}: AllergenFormProps) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (existingAllergen) {
      setName(existingAllergen.name || "");
    } else if (!isSubmitting) {
      setName("");
    }
  }, [existingAllergen, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <div className={catalogFormCardClass}>
        <h2 className={catalogFormTitleClass}>
          {existingAllergen ? "Update Allergen" : "Add New Allergen"}
        </h2>
        <div>
          <FormLabel htmlFor="name">Name</FormLabel>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={catalogFieldClass}
          />
        </div>
        <CatalogFormActions
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          submitLabel={
            isSubmitting
              ? "Saving…"
              : existingAllergen
                ? "Update Allergen"
                : "Add Allergen"
          }
        />
      </div>
    </form>
  );
};

export default AllergenForm;
