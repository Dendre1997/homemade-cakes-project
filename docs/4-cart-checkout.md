Cart & Checkout
CartItem and UniqueCartItem — Type Definitions
The cart's data model is split between two interfaces in 

src/types/index.ts
.

CartItem (

index.ts:196
) is the canonical line item representation carried in both the Zustand store and the checkout payload:

ts
export interface CartItem {
  id: string;                // Deterministic composite key (see below)
  productId?: string;
  categoryId?: string;       // Required for manufacturing time lookup
  name: string;
  flavor?: string;           // Human-readable flavor label (display only)
  diameterId?: string;       // ObjectId string — for standard cakes
  price: number;
  quantity: number;
  imageUrl?: string;
  inscription?: string;      // Cake writing text — see Inscription section
  originalPrice?: number;    // Set when a discount was applied
  discountName?: string | null;
  discountId?: string | null;
  rowTotal?: number;
  selectedConfig?: {
    setCategoryId?: string;
    quantityConfigId?: string;    // Label identifier for box size (sets/combos)
    cake?: {
      flavorId: string;
      diameterId: string;
      inscription?: string;       // Combo-specific inscription — on the bento cake
    };
    items?: { flavorId: string; count: number }[];  // Treat flavor breakdown
  };
  // Custom Order Fields (populated when isCustom === true)
  productType?: 'cake' | 'set' | 'combo' | 'custom';
  customSize?: string;
  customFlavor?: string;
  flavorNote?: string;
  isManualPrice?: boolean;
  designInstructions?: string;
  addons?: SelectedAddon[];
}
UniqueCartItem (

index.ts:236
) is a structural extension of CartItem used exclusively during split-order scheduling at checkout. It adds two fields:

ts
export type UniqueCartItem = CartItem & {
  uniqueId: string;  // createUnitId(item.id, unitIndex) — e.g. "abc123-0", "abc123-1"
  time: number;      // manufacturingTimes[item.categoryId] — minutes cost of this unit
};
UniqueCartItem is never stored in the Zustand cart or the database. It is generated transiently inside CheckoutClientPage when isSplitRequired === true, by expanding each CartItem with quantity > 1 into individual unit records:

ts
const allItemsAsUnits: UniqueCartItem[] = items.flatMap((item) =>
  Array(item.quantity).fill(null).map((_, unitIndex) => ({
    ...item,
    quantity: 1,
    uniqueId: createUnitId(item.id, unitIndex),   // "itemId-0", "itemId-1", ...
    id: item.id,
    time: availability.manufacturingTimes[item.categoryId] || 0,
  }))
);
These expanded units are tracked in the unallocatedItems: UniqueCartItem[] state. The customer assigns each UniqueCartItem.uniqueId to a delivery date slot; once allocated, the uniqueId is stored inside formData.deliveryDates[n].itemIds[] and the unit is removed from unallocatedItems. The checkout form cannot advance until unallocatedItems.length === 0.

Zustand Cart Store — useCartStore
The cart state is managed by Zustand with the persist middleware (

cartStore.ts
). The store uses partialize to write only items to localStorage under the key "cart-storage", while ephemeral state (isMiniCartOpen, lastItemAdded, discount fields) is not persisted. This ensures that on page refresh, the items array survives but the UI state resets cleanly.

The store exports its own CartItem definition (defined in the store file itself, not imported from @/types) with a slightly narrower shape — notably it includes flavorId?: string directly, and its selectedConfig.cake includes inscription. This creates a dual definition: the store-level CartItem carries flavorId as a first-class field, while the @/types CartItem carries it as an optional field. The checkout submission uses the @/types version through the type annotation on the order payload.

Item identity and deduplication. The addItem action deduplicates by item.id. If an item with the same id already exists, its quantity is incremented rather than adding a new entry. For standard cakes, the id is constructed as:

ts
id: `${product._id}-${selectedFlavorId}-${selectedDiameterConfig.diameterId}-${inscription}`
This means that two identical cakes with different inscriptions are stored as separate CartItem entries. Changing the inscription text does not merge them into the same slot — each unique text string produces a unique composite key. For sets and combos, the id is:

ts
id: `${product._id}-${selectedQtyConfigId}-${Date.now()}`
The Date.now() suffix means every "Add to Cart" call for a set creates a new entry regardless of configuration — there is intentionally no deduplication for set/combo items.

Discount invalidation on mutation. Every state-modifying action (addItem, removeItem, increaseQuantity, decreaseQuantity) includes an explicit discountTotal: 0, discountCode: null reset. This ensures that any promo code applied to the previous cart state is invalidated on every item change, forcing the customer to re-apply it at checkout if they modify their cart.

Cart Page — Display Logic
The 

cart/page.tsx
\cart\page.tsx) page is a client component that reads from useCartStore and is guarded with an isMounted state flag to prevent hydration mismatches (Zustand's localStorage state is not available on the server). On mount, it fetches all Diameter and Flavor records from the public API endpoints to resolve diameterId and flavorId ObjectId strings into display names:

ts
const diameter = item.diameterId
  ? diameters.find(d => d._id.toString() === item.diameterId!.toString())
  : null;
const standardFlavor = item.flavorId
  ? flavors.find(f => f._id.toString() === item.flavorId!.toString())
  : null;
The page renders three display scenarios based on the CartItem shape:

Scenario A — Standard Cake (!item.selectedConfig): Displays item.flavor (the string label captured at add-to-cart time) and the resolved diameter.name with diameter.sizeValue.
Scenario B — Set / Combo (item.selectedConfig is present): Renders a structured breakdown. If item.selectedConfig.cake is present (combo), it resolves comboCakeFlavor from the fetched flavors array and renders the cake sub-section, including item.selectedConfig.cake.inscription if set. If item.selectedConfig.items is present, it maps each { flavorId, count } entry to flavor names for the treats list.
Scenario C — Addons: Applies to both standard and set items. Each SelectedAddon in item.addons is rendered with name, variantName, and price. The addon total is included in the per-item price calculation: itemDisplayPrice = item.price + itemDecos.
Subtotal calculation at cart level:

ts
const subtotal = items.reduce((acc, item) => {
  const itemDecos = item.addons?.reduce((sum, d) => sum + d.price, 0) || 0;
  return acc + ((item.price + itemDecos) * item.quantity);
}, 0);
The item.price stored in the cart already reflects the discounted price (if a catalog discount was applied at add-to-cart time via the product page's client-side discount engine). This subtotal is display-only — the authoritative server-side total is recalculated at POST /api/orders time via calculateOrderPricing.

Inscription Handling — Product Page to Cart
The inscription feature is controlled by Product.inscriptionSettings:

ts
inscriptionSettings?: {
  isAvailable: boolean;
  price: number;       // Added to calculatedPrice when inscription.trim() !== ""
  maxLength: number;   // Enforced via HTML maxLength on the Input
};
When isAvailable === true, the product page renders a <Switch> toggle that reveals a text <Input>. The inscription string is tracked in local state. When the "Add to Cart" button is pressed, handleAddToCart validates that if showInscriptionInput === true the inscription is non-empty. If validation passes, the inscription is baked into the CartItem in two locations:

cartItem.inscription — top-level field on the CartItem, used for standard cakes and as the composite key component.
cartItem.selectedConfig.cake.inscription — nested field on the combo cake sub-object, for combo products.
The inscription price surcharge is included in calculatedPrice before the discount engine runs, so the inscription fee is subject to percentage discounts and is reflected in item.price as stored in the cart.

For combo products, showInscriptionInput controls whether inscription appears on the bento cake sub-item specifically. The inscription is stored at selectedConfig.cake.inscription and is surfaced separately in the cart and admin receipt views from the top-level item.inscription.

Server-Side Pricing Validation — POST /api/checkout/calculate
The 

/api/checkout/calculate
 endpoint accepts { items: CartItem[], promoCode?: string } and runs the shared calculateOrderPricing(db, items, promoCode) function from @/lib/pricing. This endpoint is called from the OrderSummary component during checkout Step 2 to display the server-authoritative price and validate promo codes:

ts
const { subtotal, discountTotal, finalTotal, appliedCode, itemBreakdown } =
  await calculateOrderPricing(db, items, promoCode);
The response includes an itemBreakdown array where each entry carries the finalPrice, originalPrice, and discountId for each CartItem.id. This breakdown is used at POST /api/orders time (see Order section) to assign per-item pricing values to the persisted OrderItem documents. If a promo code was sent but did not result in a discount, the response includes error: "Invalid or not applicable code" without raising an HTTP error status — the UI consumes this to show an inline code validation message.

Payment System Architecture
The system does not implement a live, customer-facing payment processor. The PaymentForm component rendered in checkout Step 2 is a placeholder with a static "Payment provider's form" label and a lock icon — it contains no actual payment SDK integration. The PaymentDetails interface in @/types declares:

ts
export interface PaymentDetails {
  method: 'cash' | 'e-transfer' | 'square' | 'manual';
  expectedMethod?: 'cash' | 'e-transfer';
  transactionId?: string;
  paidAt?: Date;
}
The 'square' method value is defined in the type but is not used by any route in the current implementation. The Order interface carries a `paymentToken?: string` field: a secure hex token (`crypto.randomBytes(16).toString('hex')`) generated on every order creation (web checkout and custom-order conversion) and persisted on the document. It guards the public Payment Hub link `/pay/[orderId]?token=[token]`. Payment for web checkout orders is still confirmed manually by the admin through the admin order management UI.

The manual payment mechanism works via the Payment Hub: when the admin confirms a custom order conversion via POST /api/admin/custom-orders/[id]/convert, the expectedMethod ('cash' or 'e-transfer') is stored in paymentDetails and the route returns the new `newOrderId` and its `paymentToken`. The admin UI (CustomOrderDetail / CustomOrderCard) builds a link of the form `${window.location.origin}/pay/${orderId}?token=${paymentToken}` and shares it with the customer. The public route at `src/app/pay/[orderId]/page.tsx` strictly matches BOTH `_id` AND `paymentToken`, then renders the amount, the destination e-Transfer email (from `app_settings.eTransferEmail`), and the order reference with copy buttons.

NOTE: This manual Interac e-Transfer flow and Payment Hub is a temporary solution. It will eventually be replaced by a direct payment gateway integration (e.g., Stripe).

Post-Order Success Page — /orders/thank-you
After POST /api/orders succeeds, CheckoutClientPage.handleSubmit calls clearCart() (wiping the Zustand store and localStorage) and navigates to /orders/thank-you?orderId=${result.orderId}.

The 

thank-you/page.tsx
\orders\thank-you\page.tsx) is a client component. It reads orderId from useSearchParams() and immediately calls GET /api/orders/${orderId} to fetch the persisted Order document:

ts
const res = await fetch(`/api/orders/${orderId}`);
const data: Order = await res.json();
setOrder(data);
This is an unauthenticated read of the full Order document — there is no token or session validation on this fetch, which means any client that knows an orderId can retrieve the corresponding order receipt. The page renders:

Order ID display: order._id.toString().slice(-6).toUpperCase() — the last 6 hex characters of the MongoDB ObjectId, presented as the human-readable order number.
Items list: Iterates order.items and renders each item's imageUrl || "/placeholder.png", name, quantity, flavor, and price * quantity. The rendered fields are read from the stored Order.items array directly — no secondary product fetch occurs.
Pricing summary with discount reconciliation:
ts
const discountAmount = order.discountInfo?.amount || 0;
const subtotal = order.totalAmount + discountAmount;  // Reverse-engineer original subtotal
The page reconstructs the pre-discount subtotal by adding the stored discountInfo.amount back to order.totalAmount. This avoids storing a redundant subtotal field in the Order document. The discount name is surfaced from order.discountInfo?.name.

The page has three UI states:

Loading: <LoadingSpinner /> is shown while the fetch is in flight.
Error: If the fetch fails or orderId is absent, an error card is displayed with a "Return to Homepage" button. This covers the case where a customer navigates to /orders/thank-you directly without a valid orderId param.
Success: The full receipt card is rendered with a static illustration image (/ThankYouImage.png) and a "Return to Homepage" link. There is no further order polling or real-time status subscription on this page — it is a one-shot fetch receipt view.