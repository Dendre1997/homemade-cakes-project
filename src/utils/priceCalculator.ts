import { ProductWithCategory, Flavor, Diameter, CartItem, Product } from "@/types";

interface PriceCalculationParams {
  product: ProductWithCategory;
  flavorId?: string;
  diameterId?: string;
  quantity: number;
  availableFlavors?: Flavor[];
  inscriptionAvailable?: boolean;
  inscriptionPrice?: number;
  hasInscription?: boolean;
}

export const calculateItemPrice = ({
  product,
  flavorId,
  diameterId,
  quantity,
  availableFlavors = [],
  inscriptionAvailable = false,
  inscriptionPrice = 0,
  hasInscription = false,
}: PriceCalculationParams): number => {
  if (!product) return 0;

  let total = 0;
  let flavorPrice = 0;
  if (flavorId) {
    const flav = availableFlavors.find((f) => f._id === flavorId);
    if (flav) flavorPrice = flav.price;
  }

  let currentInscriptionPrice = 0;
  if (hasInscription && inscriptionAvailable) {
    currentInscriptionPrice = inscriptionPrice;
  }

  if (diameterId) {
    const diamConfig = product.availableDiameterConfigs?.find(
      (c) => c.diameterId === diameterId
    );
    if (diamConfig) {
      if (diamConfig.price && diamConfig.price > 0) {
        total = diamConfig.price + flavorPrice + currentInscriptionPrice;
      } else {
        total = (product.structureBasePrice + flavorPrice + currentInscriptionPrice) * (diamConfig.multiplier || 1);
      }
    } else {
      total = product.structureBasePrice + flavorPrice + currentInscriptionPrice;
    }
  } else {
    total = product.structureBasePrice + flavorPrice + currentInscriptionPrice;
  }

  return total * quantity;
};

export const calculateUnitPrice = (
  params: PriceCalculationParams
): number => {
  const total = calculateItemPrice(params);
  return params.quantity > 0 ? total / params.quantity : 0;
};

// HELPER: Resolves the accurate unit price for any item type (Set or Standard)
// used for client-side totals display
export const resolvePrice = (item: CartItem): number => {
    return item.price; // Placeholder if products not passed
}

export const resolveItemPrice = (item: CartItem, products: Product[], flavors: Flavor[] = []): number => {
    const product = products.find(p => p._id === item.productId);
    if (!product) return item.price; // Fallback to store price

    if (product.productType === 'set') {
        const base = product.structureBasePrice || 0;
        const defaultBox = product.availableQuantityConfigs?.[0]?.price || 0;
        
        const configIdentifier = item.selectedConfig?.quantityConfigId; // Stores Label
        const selectedBoxObj = product.availableQuantityConfigs?.find(c => 
             c.label && c.label.toString() === configIdentifier?.toString()
        );
        const selectedBoxPrice = selectedBoxObj ? selectedBoxObj.price : defaultBox;
        
        let calculated = 0;

        if (product.comboConfig?.hasCake) {
            // Combo: (Base - DefaultBox) + SelectedBox + CakeFlavor
            calculated = (base - defaultBox) + selectedBoxPrice;
            
            // Add cake flavor if exists
            const flavorId = item.selectedConfig?.cake?.flavorId;
            if (flavorId) {
                const flav = flavors.find(f => f._id === flavorId);
                if (flav) calculated += flav.price;
            }

        } else {
             // Simple Set: Just the Box Price
             calculated = selectedBoxPrice;
        }
        return Number(calculated.toFixed(2));
    } else {
        return item.price;
    }
}
