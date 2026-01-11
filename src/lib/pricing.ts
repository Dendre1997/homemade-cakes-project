import { Db, ObjectId } from "mongodb";
import { CartItem, Discount, Product, Flavor } from "@/types";

interface PriceResult {
  subtotal: number;
  discountTotal: number;
  finalTotal: number;
  itemBreakdown: {
    itemId: string;
    originalPrice: number;
    finalPrice: number;
    discountName: string | null;
    discountId: string | null;
  }[];
  appliedCode: string | null;
  appliedDiscount?: Discount;
}

export async function calculateOrderPricing(
  db: Db,
  items: CartItem[],
  promoCode?: string
): Promise<PriceResult> {
  const now = new Date();

  // 1. Fetch Fresh Product Data
  const productIds = items.map((i) => new ObjectId(i.productId));
  const dbProducts = await db
    .collection<Product>("products")
    .find({ _id: { $in: productIds } as any })
    .toArray();
  const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

  // 2. Fetch Fresh Flavor Data (Required for price reconstruction)
  const flavorIds = items
    .map((i) => (i.flavor ? i.id.split("-")[1] : null)) 
    .filter(Boolean);

  const allFlavorIds = dbProducts.flatMap((p) => p.availableFlavorIds || []);
  const dbFlavors = await db
    .collection<Flavor>("flavors")
    .find({ _id: { $in: allFlavorIds.map((id) => new ObjectId(id)) } as any })
    .toArray();
  const flavorMap = new Map(dbFlavors.map((f) => [f._id.toString(), f]));

  // 3. Fetch Active Discounts
  const activeDiscounts = await db
    .collection<Discount>("discounts")
    .find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .toArray();

  const codeDiscount = promoCode
    ? activeDiscounts.find(
        (d) =>
          d.trigger === "code" &&
          d.code.toUpperCase() === promoCode.toUpperCase().trim()
      )
    : null;

  // 4. Per-Item Calculation Loop
  let totalSubtotal = 0;
  let totalDiscount = 0;
  const itemBreakdown = [];
  let isCodeUsed = false;
  let appliedDiscountGlobal: Discount | undefined = undefined;

  for (const item of items) {
    const dbProduct = item.productId ? productMap.get(item.productId) : undefined;

    if (!dbProduct) {
      // Fallback if product not found (shouldn't happen)
      const lineTotal = item.price * item.quantity;
      totalSubtotal += lineTotal;
      itemBreakdown.push({
        itemId: item.id,
        originalPrice: lineTotal,
        finalPrice: lineTotal,
        discountName: null,
        discountId: null,
      });
      continue;
    }
    
    // Helper to preventing NaN
    const safePrice = (val: any) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    };

    let unitPrice = 0;

    // --- SCENARIO A: SETS & COMBOS ---
    if (dbProduct.productType === 'set') {
        const base = safePrice(dbProduct.structureBasePrice);
        const defaultBox = safePrice(dbProduct.availableQuantityConfigs?.[0]?.price);
        let finalCalculatedPrice = 0;

        //  FIND BOX CONFIG (Label-Based Matching)
        const incomingIdentifier = (item.selectedConfig as any)?.quantityConfigId;

        const selectedBoxObj = dbProduct.availableQuantityConfigs?.find((c: any) => {
                return c.label && c.label.toString() === incomingIdentifier?.toString();
        });
        
        let selectedBoxPrice = 0;
        if (selectedBoxObj) {
            selectedBoxPrice = safePrice(selectedBoxObj.price);
        } else {
             // Fallback Logic: try to match by old-school ID if legacy, or default
             const fallbackConfig = dbProduct.availableQuantityConfigs?.find((c: any) => 
                c._id && c._id.toString() === incomingIdentifier?.toString()
             );
             
             if (fallbackConfig) {
                 selectedBoxPrice = safePrice(fallbackConfig.price);
             } else {
                 selectedBoxPrice = defaultBox > 0 ? defaultBox : base;
             }
        }
        
        // 2. Calculate Base
        if (dbProduct.comboConfig?.hasCake) {
             // Combo Formula: (Base - DefaultBox) + SelectedBox
             finalCalculatedPrice = (base - defaultBox) + selectedBoxPrice;
        } else {
             // Simple Set Formula: SelectedBox Only
             finalCalculatedPrice = selectedBoxPrice;
        }
        
        // 3. Flavor Surcharge (Combo Only)
        // Check item.selectedConfig.cake.flavorId
        if (dbProduct.comboConfig?.hasCake && item.selectedConfig?.cake?.flavorId) {
             const flavorId = item.selectedConfig?.cake?.flavorId;
             const dbFlavor = flavorMap.get(flavorId);
             const flavorPrice = safePrice(dbFlavor?.price);
             if (flavorPrice > 0) {
                 finalCalculatedPrice += flavorPrice;
             }
        }
        
        unitPrice = finalCalculatedPrice;

    } else {
        // --- SCENARIO B: STANDARD CAKE ---
        // A. Flavor Price
        const idParts = item.id.split("-");
        const flavorId = idParts[1];
        const dbFlavor = flavorMap.get(flavorId);
        const flavorPrice = dbFlavor ? dbFlavor.price : 0;

        // B. Diameter Multiplier
        const diameterId = idParts[2]; // From your ID structure
        const diameterConfig = dbProduct.availableDiameterConfigs?.find(
        (c) => c.diameterId.toString() === diameterId
        );
        const multiplier = diameterConfig ? diameterConfig.multiplier : 1;

        // C. Inscription Price
        const inscriptionPrice =
        item.inscription && dbProduct.inscriptionSettings?.isAvailable
            ? dbProduct.inscriptionSettings.price
            : 0;

        // D. Formula
        unitPrice =
        (dbProduct.structureBasePrice + flavorPrice + inscriptionPrice) *
        multiplier;
    }

    const lineItemOriginalTotal = unitPrice * item.quantity;
    
    // Safety check
    if (isNaN(lineItemOriginalTotal)) {
        console.error(`Pricing Error for item ${item.id}: Result is NaN`);
    }

    // Add to raw subtotal
    totalSubtotal += lineItemOriginalTotal;

    // --- DISCOUNT LOGIC ---
    const applicableDiscounts = activeDiscounts.filter((d) => {
      if (
        d.trigger === "code" &&
        d._id.toString() !== codeDiscount?._id.toString()
      )
        return false;

      if (d.targetType === "all") return true;

      const targetIds = d.targetIds.map((id) => id.toString());

      if (d.targetType === "product")
        return targetIds.includes(dbProduct._id.toString());
      if (d.targetType === "category")
        return targetIds.includes(dbProduct.categoryId.toString());
      if (d.targetType === "collection") {
        const pCols = (dbProduct.collectionIds || []).map(String);
        return pCols.some((id) => targetIds.includes(id));
      }
      if (d.targetType === "seasonal") {
        const pSeas = (dbProduct.seasonalEventIds || []).map(String);
        return pSeas.some((id) => targetIds.includes(id));
      }
      return false;
    });

    let bestSavings = 0;
    let bestDiscountName = null;
    let bestDiscountObj: Discount | null = null;

    for (const discount of applicableDiscounts) {
      let savings = 0;
      if (discount.type === "fixed") {
        // Fixed discount is capped at the item price (cannot be free + cash back)
        savings = Math.min(unitPrice, discount.value) * item.quantity;
      } else {
        savings = (lineItemOriginalTotal * discount.value) / 100;
      }

      if (savings > bestSavings) {
        bestSavings = savings;
        bestDiscountName = discount.name;
        bestDiscountObj = discount;
      }
    }

    if (bestDiscountObj?.trigger === "code") isCodeUsed = true;
    if (bestDiscountObj) appliedDiscountGlobal = bestDiscountObj; // simplistic tracking for single discount dominance

    totalDiscount += bestSavings;

    itemBreakdown.push({
      itemId: item.id,
      originalPrice: lineItemOriginalTotal,
      finalPrice: lineItemOriginalTotal - bestSavings,
      discountName: bestDiscountName,
      discountId: bestDiscountObj ? bestDiscountObj._id.toString() : null,
    });
  }

  // 5. Global Code Validation (Min Order)
  if (
    codeDiscount &&
    codeDiscount.minOrderValue &&
    totalSubtotal < codeDiscount.minOrderValue
  ) {
    return {
      subtotal: totalSubtotal,
      discountTotal: 0,
      finalTotal: totalSubtotal,
      itemBreakdown: itemBreakdown.map((i) => ({
        ...i,
        finalPrice: i.originalPrice,
        discountName: null,
        discountId: null,
      })),
      appliedCode: null,
    };
  }

  return {
    subtotal: totalSubtotal,
    discountTotal: totalDiscount,
    finalTotal: totalSubtotal - totalDiscount,
    itemBreakdown,
    appliedCode: isCodeUsed && promoCode ? promoCode : null,
    appliedDiscount: appliedDiscountGlobal,
  };
}
