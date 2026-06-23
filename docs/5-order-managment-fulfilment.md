Order Management & Fulfillment
Type Definitions
The order pipeline is modeled in src/types/index.ts through three core types that govern persistence, UI rendering, and lifecycle transitions.

OrderStatus — string enum defining the full order lifecycle:

export enum OrderStatus {
  NEW = "new",
  PAID = "paid",
  IN_PROGRESS = "in-progress",
  READY = "ready",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  PENDING_CONFIRMATION = "pending_confirmation",
  AWAITING_PAYMENT = "awaiting_payment",
  CONFIRMED = "confirmed",
}
All status mutations validate incoming values against Object.values(OrderStatus) before write.

Order — root MongoDB document in the orders collection:

export interface Order {
  _id: string;
  customerId?: string;
  items: CartItem[];              // Runtime shape; persisted documents align with OrderItem
  totalAmount: number;
  customerInfo: { name, email, phone, notes?, socialNickname?, socialPlatform? };
  deliveryInfo: {
    method: "pickup" | "delivery";
    address?: string;
    deliveryDates: { date: Date; itemIds: string[]; timeSlot: string }[];
  };
  status: OrderStatus;
  isPaid: boolean;                // Financial truth: payment received and verified
  paymentDetails?: PaymentDetails;
  discountInfo?: { code?, name?, amount };
  createdAt: Date;
  source?: 'web' | 'instagram' | 'facebook' | 'phone' | 'other' | 'admin-custom';
  referenceImages?: string[];
  notesLog?: { id: string; content: string; createdAt: Date | string; author?: string }[];
  claimedByUid?: string | null;
  paymentLinkToken?: string;
  paymentLinkExpiresAt?: Date;
}
OrderItem — canonical persisted line-item shape (ObjectId-typed references). Mirrors CartItem manufacturing fields but uses ObjectId for productId, categoryId, diameterId, and discountId:

export interface OrderItem {
  id: string;
  productId?: ObjectId;
  categoryId?: ObjectId;
  name: string;
  flavor?: string;
  diameterId?: ObjectId;
  price: number;
  quantity: number;
  imageUrl?: string;
  inscription?: string;
  originalPrice?: number;
  discountName?: string | null;
  discountId?: string | ObjectId | null;
  rowTotal?: number;
  isCustom?: boolean;
  selectedConfig?: {
    quantityConfigId?: string;
    cake?: { flavorId: string; diameterId: string; inscription?: string };
    items?: { flavorId: string; count: number }[];
  };
  productType?: 'cake' | 'set' | 'combo' | 'custom';
  customSize?: string;
  customFlavor?: string;
  flavorNote?: string;
  isManualPrice?: boolean;
  designInstructions?: string;
  addons?: SelectedAddon[];
}
Order Filtering & Dashboard Logic
Page: src/app/bakery-manufacturing-orders/orders/page.tsx (ManageOrdersPage).

Server-side data window. Orders are fetched per calendar month, not globally:

GET /api/admin/orders?startDate={startOfMonth}&endDate={endOfMonth}
The API (src/app/api/admin/orders/route.ts) applies:

query["deliveryInfo.deliveryDates.date"] = { $gte: new Date(startDate), $lte: new Date(endDate) }
Results are sorted ascending by deliveryInfo.deliveryDates.0.date. Cross-month date selection triggers setCurrentMonth(startOfMonth(date)), which re-fetches via useEffect dependency on currentMonth.

Auxiliary lookups on mount: /api/availability (POST), /api/diameters, /api/admin/flavors — resolved into diametersMap and flavorMap passed to OrderCard for polymorphic item display.

Smart initial date selection (hasInitialized guard):

If any Order.deliveryInfo.deliveryDates[].date matches today → selectedDate = today, timeScope = 'day'.
Else → earliest future date across all orders in the batch → selectedDate = futureDates[0], timeScope = 'day'.
Else (no future dates) → fallback to today.
Empty month → today, timeScope = 'day'.
Client-side filtering pipeline (filteredOrders useMemo, three cascaded stages):

Stage Control Logic
1 — Status
OrdersToolbar tab (statusFilter)
"all": excludes OrderStatus.CANCELLED and OrderStatus.DELIVERED (active-work view). "pending_confirmation" → PENDING_CONFIRMATION. "processing" → IN_PROGRESS. "ready" → READY. "delivered" → DELIVERED. "cancelled" → CANCELLED.
2 — Time scope
timeScope toggle (day / week / month)
day: deliveryInfo.deliveryDates.some(d => toISODate(d.date) === toISODate(selectedDate)). week: isWithinInterval(d.date, { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) }). month: no date filter (all orders in fetched month).
3 — Search
searchQuery
Case-insensitive match on order._id, customerInfo.name, customerInfo.phone, customerInfo.email, customerInfo.socialNickname.
Month navigation (handleMonthChange) sets timeScope = 'month' and clears selectedDate. Date click (handleDateSelect) sets timeScope = 'day' and may switch currentMonth if the clicked date falls outside the loaded month.

Rendering: Filtered Order[] mapped to OrderCard in a responsive grid (grid-cols-1 md:grid-cols-2 xl:grid-cols-3). Header title reflects active scope: "Orders for MMM do" (day), "Orders for Week of MMM do" (week), "All Orders (MMMM)" (month).

Status Mutations
Two distinct mutation paths exist; they are not behaviorally equivalent.

Path A — Dashboard list (optimistic)
OrderCard exposes a <Select> bound to order.status listing all Object.values(OrderStatus). On change:

PATCH /api/admin/orders/{orderId}/status
Body: { status: OrderStatus }
Client applies optimistic update via setOrders(prev => prev.map(...)); on failure, rolls back to oldOrders and re-throws.

Route: src/app/api/admin/orders/[id]/status/route.ts

Validates status ∈ OrderStatus.
Auth: admin_session cookie → adminAuth.verifySessionCookie → users.findOne({ firebaseUid }) with role === 'admin'.
updateOne({_id: ObjectId(id) }, { $set: { status } }).
Side effect on OrderStatus.DELIVERED: re-fetches full Order, extracts unique productId values from Order.items, executes:
users.updateOne(
  { _id: ObjectId(order.customerId) },
  { $addToSet: { purchasedProductIds: { $each: productIds } } }
)
This aggregates purchase history for catalog recommendations. Only fires when order.customerId is present.
Path B — Order detail page
OrderDetailActions on src/app/bakery-manufacturing-orders/orders/[id]/page.tsx uses a staged select (newStatus) with explicit save:

PUT /api/admin/orders/{id}
Body: { status: newStatus }
Route: src/app/api/admin/orders/[id]/route.ts — general-purpose update via verifyAdminAPI(). Sets status in $set but does not trigger the DELIVERED → purchasedProductIds side effect. Also supports deliveryDates, items, totalAmount, customerInfo, source, isPaid, paymentDetails in the same handler.

Implication: Transitioning an Order to OrderStatus.DELIVERED from the dashboard list updates customer purchase history; the same transition from the detail page updates only Order.status.

Neither path modifies isPaid or paymentDetails — those are separate PUT fields on the detail route.

Admin Notes
Storage: Embedded array Order.notesLog on the order document. Not surfaced on the production print sheet.

Server Actions: src/app/actions/order-notes.ts ("use server")

Action MongoDB operation Validation
addOrderNote(orderId, content)
$push: { notesLog: newNote }
Rejects empty/whitespace content
updateOrderNote(orderId, noteId, newContent)
$set: { "notesLog.$.content": trimmed } with query { _id, "notesLog.id": noteId }
Positional operator targets single note
deleteOrderNote(orderId, noteId)
$pull: { notesLog: { id: noteId } }
—
Note document shape on push:

{
  id: new ObjectId().toString(),
  content: content.trim(),
  createdAt: new Date(),
  author: "Admin",   // hardcoded; no session UID resolution
}
ID type resolution (legacy compatibility): All three actions attempt new ObjectId(orderId) first. If matchedCount === 0 and the cast succeeded, a fallback query uses { _id: orderId } as a raw string (migrated/legacy orders). Returns { success: false, error: "Order not found" } if both fail.

On success: revalidatePath('/bakery-manufacturing-orders/orders/${orderId}').

UI: OrderNotesSection (src/components/admin/orders/OrderNotesSection.tsx) mounted on the order detail page. Consumes order: Order and onUpdate callback (fetchOrderAndDiameters). Uses useTransition for pending state. Notes sorted newest-first by createdAt. Supports inline edit (Pencil → Textarea → Save) and delete with useConfirmation danger dialog. Does not render author in the view layer — only content and formatted createdAt.

Production Print Page
Route: src/app/bakery-manufacturing-orders/orders/[id]/print/page.tsx (PrintOrderPage, "use client").

Entry point: Order detail page link opens in new tab:

<Link href={`/bakery-manufacturing-orders/orders/${order._id}/print`} target="_blank">
Data hydration (useEffect on params.id):

Promise.all([
  fetch(`/api/admin/orders/${id}`),   // → Order
  fetch("/api/admin/diameters"),       // → Diameter[] (size label resolution)
  fetch("/api/admin/flavors"),          // → Flavor[] → flavorMap Record<id, name>
])
A4 Layout
The page is a self-contained print document with inline CSS — no shared Tailwind print layer.

Constraint Value
Page width
210mm
Min height
297mm
Screen margin
24px auto, box-shadow preview
Print override
@media print: margin: 0, box-shadow: none, width: 100%, min-height: 100vh, print-color-adjust: exact
Vertical structure (.sheet flex column):

Header bar (.header, border-bottom: 3px solid) — three zones: order ID block (inverted), pickup/delivery datetime, payment badges.
Body (.body) — one .item-block per Order.items[] entry.
Total strip (.total-strip, inverted background) — Order.totalAmount, PaymentDetails.method, paidAt.
Customer footer (.customer-footer, 3-column grid) — name, contact, fulfillment method.
Two-Column Item Grid
Each OrderItem (iterated as order.items) renders as:

.item-block {
  display: grid;
  grid-template-columns: 220px 1fr;
}
Left column (.item-image-col, 220px, #fafafa background):

Label: "Reference"
Primary image: item.imageUrl || order.referenceImages?.[0] — 180×180px, object-fit: cover
Fallback: dashed "NO IMAGE" placeholder (180×180px)
Addon thumbnails: item.addons.filter(a => a.imageUrl) — 60×60px per addon below primary image
Right column (.item-details-col):

Name row: item.name + ×{quantity} badge (if quantity > 1)
2×2 spec grid (.spec-grid):
Size: item.customSize → item.selectedConfig.quantityConfigId → getDiameterLabel(item.diameterId, diameters) → "—"
Flavour: suppressed for simple sets (isSimpleSet). For combo sets: label "Bento Flavor", resolves selectedConfig.cake.flavorId via flavorMap. Otherwise: item.customFlavor or getFlavorName(item.flavor) (24-char hex ObjectId → map lookup; else raw string passthrough)
Type: item.productType or derived "combo set" / "simple set" / "standard"
Unit Price: item.price.toFixed(2)
Treats Breakdown (sets): item.selectedConfig.items[] → chips [{count}] {flavorName}
Add-ons: item.addons[] → chips with optional thumbnail, {name}: {variantName}
Inscription box (dashed border): item.inscription || item.selectedConfig?.cake?.inscription — Playfair Display 18px; empty state "No inscription"
Design Instructions (accent left-border box, conditional): item.designInstructions — only rendered when non-empty trim
Critical Production Data Fields
Fields the print sheet surfaces for physical bakery execution (mapped to Order / OrderItem):

Region Field(s) Source
Header ID
Truncated order ref
order._id.slice(-6).toUpperCase()
Fulfillment schedule
Date + time slot
order.deliveryInfo.deliveryDates[0] via getPickupInfo() — formatted "EEEE, MMMM d, yyyy" + timeSlot
Fulfillment mode
Pickup vs delivery prefix
order.deliveryInfo.method === "pickup"
Payment state
Paid / Unpaid badge
order.isPaid
Expected payment
Cash / e-transfer
order.paymentDetails?.expectedMethod
Order age
Created date
order.createdAt
Visual reference
Product/custom image
OrderItem.imageUrl or Order.referenceImages[0]
Product identity
Name, qty, type
OrderItem.name, quantity, productType
Manufacturing specs
Size, flavor, unit price
customSize, selectedConfig, diameterId, customFlavor, flavor
Set composition
Per-flavor counts
OrderItem.selectedConfig.items[]
Decorations
Addon variants + images
OrderItem.addons[]
Cake text
Inscription
OrderItem.inscription or selectedConfig.cake.inscription
Decorator notes
Design brief
OrderItem.designInstructions
Financial total
Charge amount
order.totalAmount
Payment record
Method + paid date
order.paymentDetails.method, paidAt
Customer identity
Name, notes, contact
order.customerInfo.{name, notes, phone, socialNickname, socialPlatform, email}
Logistics
Method + slot recap
order.deliveryInfo.method, pickup slot
Not rendered on print sheet: Order.notesLog, OrderItem.flavorNote, OrderItem.discountName, Order.status, Order.discountInfo.

Auto-Print Behavior
const printTriggered = useRef(false);
const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
Trigger useEffect (deps: [loading, imgLoaded, order]):

Abort if loading or printTriggered.current.
Collect withImages = order.items.filter(item => item.imageUrl).
allImgsReady = withImages.length === 0 || withImages.every((_, i) => imgLoaded[i]).
When ready: set printTriggered.current = true, then setTimeout(() => window.print(), 400).
Each primary reference <img> sets imgLoaded[idx] = true on both onLoad and onError (error treated as ready to avoid indefinite blocking). Addon images do not gate the print trigger.

Manual fallback: .no-print toolbar with PRINT / SAVE PDF (window.print()) and CLOSE (window.close()) — hidden in @media print via .no-print { display: none !important }.

Loading state: Full-viewport spinner with "Preparing production sheet…" until all three API calls resolve.
