"use client";

import React, { useState, useEffect } from "react";
import { Allergen } from "@/types";
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

type AllergenFormData = Omit<Allergen, "_id">;

interface AllergenFormProps {
  existingAllergen?: Allergen | null;
  onSubmit: (formData: AllergenFormData) => void; 
  isSubmitting: boolean; 
}

const AllergenForm = ({
  existingAllergen,
  onSubmit,
  isSubmitting,
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
    <form
      onSubmit={handleSubmit}
      className="space-y-md p-lg bg-card-background rounded-large shadow-md max-w-lg"
    >
      <h2 className="font-heading text-h3 text-primary">
        {existingAllergen ? "Update Allergen" : "Add New Allergen"}
      </h2>
      <div className="space-y-4">
        <div>
          <FormLabel htmlFor="name">Name</FormLabel>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            variant="primary" 
          >
            {isSubmitting
              ? "Saving..."
              : existingAllergen
                ? "Update Allergen"
                : "Add Allergen"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default AllergenForm;
