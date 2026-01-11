import { ProductWithCategory, Discount } from "@/types";

interface DiscountResult {
  finalPrice: number;
  originalPrice: number;
  discountAmount: number;
  discountBadgeText: string | null; // e.g. "-15%" or "-$10"
  hasDiscount: boolean;
}

export const calculateProductPrice = (
  product: ProductWithCategory,
  activeDiscounts: Discount[] = []
): DiscountResult => {
  const originalPrice = product.structureBasePrice;

  if (!activeDiscounts || activeDiscounts.length === 0) {
    return {
      finalPrice: originalPrice,
      originalPrice,
      discountAmount: 0,
      discountBadgeText: null,
      hasDiscount: false,
    };
  }

  let bestPrice = originalPrice;
  let bestDiscount: Discount | null = null;

  // Loop through all active discounts to find the one that applies AND gives the lowest price
  for (const discount of activeDiscounts) {
    let isMatch = false;
    const targetIds = discount.targetIds.map((id) => id.toString());

    switch (discount.targetType) {
      case "all":
        isMatch = true;
        break;
      case "product":
        isMatch = targetIds.includes(product._id);
        break;
      case "category":
        isMatch = targetIds.includes(product.categoryId);
        break;
      case "collection":
        // Check if any of the product's collections are in the target list
        isMatch = (product.collectionIds || []).some((id) =>
          targetIds.includes(id)
        );
        break;
      case "seasonal":
        // Check if any of the product's seasonal events are in the target list
        isMatch = (product.seasonalEventIds || []).some((id) =>
          targetIds.includes(id)
        );
        break;
    }

    if (isMatch) {
      let currentPrice = originalPrice;
      if (discount.type === "percentage") {
        currentPrice = originalPrice - (originalPrice * discount.value) / 100;
      } else {
        currentPrice = Math.max(0, originalPrice - discount.value);
      }

      if (currentPrice < bestPrice) {
        bestPrice = currentPrice;
        bestDiscount = discount;
      }
    }
  }

  if (bestDiscount) {
    const badgeText =
      bestDiscount.type === "percentage"
        ? `-${bestDiscount.value}%`
        : `-$${bestDiscount.value}`;

    return {
      finalPrice: bestPrice,
      originalPrice,
      discountAmount: originalPrice - bestPrice,
      discountBadgeText: badgeText,
      hasDiscount: true,
    };
  }

  return {
    finalPrice: originalPrice,
    originalPrice,
    discountAmount: 0,
    discountBadgeText: null,
    hasDiscount: false,
  };
};
