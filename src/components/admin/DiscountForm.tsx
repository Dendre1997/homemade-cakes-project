"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Discount,
  ProductCategory,
  Collection,
  SeasonalEvent,
  ProductWithCategory,
  DiscountTargetType,
  DiscountType,
  DiscountTrigger,
} from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import { ProductPicker } from "@/components/admin/ProductPicker";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import { format } from "date-fns";

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

type DiscountFormData = Omit<Discount, "_id" | "targetIds"> & {
  targetIds: string[];
};

interface DiscountFormProps {
  existingDiscount?: Discount | null;
  onSubmit: (formData: DiscountFormData) => void;
  isSubmitting: boolean;

  products: ProductWithCategory[];
  categories: ProductCategory[];
  collections: Collection[];
  seasonals: SeasonalEvent[];
}

const normalizeId = (id: any): string => {
  if (!id) return "";
  return String(id);
};

const DiscountForm = ({
  existingDiscount,
  onSubmit,
  isSubmitting,
  products,
  categories,
  collections,
  seasonals,
}: DiscountFormProps) => {
  const [formData, setFormData] = useState<DiscountFormData>({
    name: "",
    code: "",
    type: "percentage",
    value: 0,
    trigger: "automatic",
    targetType: "all",
    targetIds: [],
    isActive: false,
    startDate: "",
    endDate: "",
    minOrderValue: 0,
    usageLimit: 0,
    usedCount: 0,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (existingDiscount) {
      const safeTargetIds = Array.isArray(existingDiscount.targetIds)
        ? existingDiscount.targetIds.map(normalizeId)
        : [];

      setFormData({
        name: existingDiscount.name || "",
        code: existingDiscount.code || "",
        type: existingDiscount.type || "percentage",
        value: existingDiscount.value || 0,
        trigger: existingDiscount.trigger || "automatic",
        targetType: existingDiscount.targetType || "all",
        targetIds: safeTargetIds,
        isActive: existingDiscount.isActive || false,
        startDate: existingDiscount.startDate
          ? new Date(existingDiscount.startDate).toISOString().slice(0, 16)
          : "",
        endDate: existingDiscount.endDate
          ? new Date(existingDiscount.endDate).toISOString().slice(0, 16)
          : "",
        minOrderValue: existingDiscount.minOrderValue || 0,
        usageLimit: existingDiscount.usageLimit || 0,
        usedCount: existingDiscount.usedCount || 0,
      });
      setIsLoaded(true);
    } else if (!isSubmitting) {
      setIsLoaded(true); 
      setFormData({
        name: "",
        code: "",
        type: "percentage",
        value: 0,
        trigger: "automatic",
        targetType: "all",
        targetIds: [],
        isActive: false,
        startDate: "",
        endDate: "",
        minOrderValue: 0,
        usageLimit: 0,
        usedCount: 0,
      });
    }
  }, [existingDiscount, isSubmitting]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleTargetTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      targetType: value as DiscountTargetType,
      targetIds: [],
    }));
  };

  const toggleTargetId = useCallback((id: string) => {
    setFormData((prev) => {
      const normalizedId = normalizeId(id);
      const exists = prev.targetIds.includes(normalizedId);
      return {
        ...prev,
        targetIds: exists
          ? prev.targetIds.filter((tid) => tid !== normalizedId)
          : [...prev.targetIds, normalizedId],
      };
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isLoaded) {
      return <div className="p-lg">Loading discount data...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-lg p-lg bg-card-background rounded-large shadow-md max-w-4xl"
    >
      <h2 className="font-heading text-h3 text-primary mb-md">
        {existingDiscount ? "Edit Discount" : "Create Discount"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        <div className="space-y-md">
          <div>
            <FormLabel htmlFor="name">Internal Name</FormLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Summer Sale"
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <FormLabel htmlFor="trigger">Trigger</FormLabel>
              <Select
                value={formData.trigger}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    trigger: val as DiscountTrigger,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="code">Promo Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel htmlFor="code">Code</FormLabel>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. SUMMER24"
                disabled={formData.trigger === "automatic"}
                required={formData.trigger === "code"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <FormLabel htmlFor="type">Discount Type</FormLabel>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: val as DiscountType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel htmlFor="value">Value</FormLabel>
              <Input
                id="value"
                type="number"
                value={formData.value || ""}
                onChange={handleChange}
                required
                placeholder={formData.type === "percentage" ? "15" : "10.00"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-md">
            <div>
              <FormLabel htmlFor="dateRange">Active Period</FormLabel>
              <CustomDateRangePicker
                showPresets={false}
                startDate={
                  formData.startDate
                    ? new Date(
                        new Date(formData.startDate).getTime() +
                          new Date().getTimezoneOffset() * 60000
                      )
                    : undefined
                }
                endDate={
                  formData.endDate
                    ? new Date(
                        new Date(formData.endDate).getTime() +
                          new Date().getTimezoneOffset() * 60000
                      )
                    : undefined
                }
                onSelectRange={(start, end) => {
                  setFormData({
                    ...formData,
                    startDate: start ? format(start, "yyyy-MM-dd") : "",
                    endDate: end ? format(end, "yyyy-MM-dd") : "",
                  });
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-md p-sm border border-border rounded-medium bg-subtleBackground">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked as boolean })
              }
            />
            <label
              htmlFor="isActive"
              className="font-body font-bold text-primary cursor-pointer select-none"
            >
              Discount is Active
            </label>
          </div>

          <div className="grid grid-cols-2 gap-md pt-sm border-t border-border">
            <div>
              <FormLabel htmlFor="minOrderValue">Min Order ($)</FormLabel>
              <Input
                id="minOrderValue"
                type="number"
                value={formData.minOrderValue || ""}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            <div>
              <FormLabel htmlFor="usageLimit">Usage Limit</FormLabel>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit || ""}
                onChange={handleChange}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        <div className="space-y-md border-t md:border-t-0 md:border-l border-border pt-lg md:pt-0 md:pl-lg">
          <h3 className="font-heading text-h3 text-primary mb-md">
            Applies To
          </h3>

          <div className="mb-lg">
            <FormLabel htmlFor="targetType">Target</FormLabel>
            <Select
              value={formData.targetType}
              onValueChange={handleTargetTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="category">Specific Categories</SelectItem>
                <SelectItem value="collection">Specific Collections</SelectItem>
                <SelectItem value="seasonal">
                  Specific Seasonal Events
                </SelectItem>
                <SelectItem value="product">Specific Products</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.targetType === "product" && (
            <ProductPicker
              availableProducts={products}
              selectedIds={formData.targetIds}
              onChange={(ids) =>
                setFormData((prev) => ({ ...prev, targetIds: ids }))
              }
              themeColor="#C58C5F"
            />
          )}

          {formData.targetType === "category" && (
            <div className="flex flex-wrap gap-sm">
              {categories.map((cat) => (
                <ChipCheckbox
                  key={cat._id.toString()}
                  checked={formData.targetIds.includes(normalizeId(cat._id))}
                  onCheckedChange={() => toggleTargetId(normalizeId(cat._id))}
                >
                  {cat.name}
                </ChipCheckbox>
              ))}
            </div>
          )}

          {formData.targetType === "collection" && (
            <div className="flex flex-wrap gap-sm">
              {collections.map((col) => (
                <ChipCheckbox
                  key={col._id.toString()}
                  checked={formData.targetIds.includes(normalizeId(col._id))}
                  onCheckedChange={() => toggleTargetId(normalizeId(col._id))}
                >
                  {col.name}
                </ChipCheckbox>
              ))}
            </div>
          )}

          {formData.targetType === "seasonal" && (
            <div className="flex flex-wrap gap-sm">
              {seasonals.map((evt) => (
                <ChipCheckbox
                  key={evt._id.toString()}
                  checked={formData.targetIds.includes(normalizeId(evt._id))}
                  onCheckedChange={() => toggleTargetId(normalizeId(evt._id))}
                >
                  {evt.name}
                </ChipCheckbox>
              ))}
            </div>
          )}

          {formData.targetType === "all" && (
            <div className="p-md bg-success/10 rounded-medium text-center text-success-dark font-medium">
              This discount will apply to the entire catalog.
            </div>
          )}
        </div>
      </div>

      <div className="pt-lg border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting
            ? "Saving..."
            : existingDiscount
              ? "Update Discount"
              : "Create Discount"}
        </Button>
      </div>
    </form>
  );
};

export default DiscountForm;
