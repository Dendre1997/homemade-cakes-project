"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";

export const catalogListColumnClass =
  "md:col-span-2 rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-5";

export const catalogListHeadingClass =
  "mb-4 font-heading text-lg font-semibold tracking-tight text-primary text-balance";

type CatalogPageHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
};

export function CatalogPageHeader({
  title,
  onBack,
  backLabel = "Back to Catalog",
}: CatalogPageHeaderProps) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="mb-3 h-11 gap-2 px-2 text-sm text-primary/65 transition-colors hover:text-primary sm:h-10"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Button>
      <h1 className="mb-6 font-heading text-2xl font-bold tracking-tight text-primary text-balance sm:text-3xl">
        {title}
      </h1>
    </>
  );
}

type CatalogSearchFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function CatalogSearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: CatalogSearchFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border-primary/15 bg-background/40 sm:h-10"
      />
    </div>
  );
}
