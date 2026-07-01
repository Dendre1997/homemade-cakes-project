Custom Order Pipeline
Data Interfaces
The pipeline operates across two distinct MongoDB collections and two corresponding TypeScript interfaces defined in 

src/types/index.ts
.

CustomOrder (

index.ts:459
) is the raw intake document. It lives in the custom_orders collection and represents an unpriced, unconfirmed request from a customer:

ts
export interface CustomOrder {
  _id: string;
  status: 'pending_review' | 'converted' | 'rejected' | string;
  date: Date;
  timeSlot: string;
  category: 'Cake' | 'Bento' | 'Cupcakes' | 'Macarons' | string;
  details: {
    size?: string;
    flavor?: string;
    flavorNote?: string;
    textOnCake?: string;
    designNotes?: string;
    [key: string]: any;
  };
  referenceImages: string[];
  contact: { name: string; phone: string; email: string; socialNickname?: string; socialPlatform?: "instagram" | "facebook"; };
  convertedOrderId?: string;      // Set after conversion — foreign key → orders collection
  userId?: string;                // Set if the submitter was authenticated
  allergies?: string;
  agreedPrice?: number;           // Written by admin during review
  approximatePrice?: number;
  adminNotes?: string;
  deliveryMethod?: "pickup" | "delivery" | string;
  addons?: SelectedAddon[];
}
Order (

index.ts:269
) is the production order document in the orders collection. It is structured identically to a standard checkout order and participates in the same status machine, payment tracking, and scheduling systems:

ts
export interface Order {
  _id: string;
  customerId?: string;
  items: CartItem[];
  totalAmount: number;
  customerInfo: { name: string; email: string; phone: string; notes?: string; socialNickname?: string; socialPlatform?: "instagram" | "facebook"; };
  deliveryInfo: { method: "pickup" | "delivery"; address?: string; deliveryDates: { date: Date; itemIds: string[]; timeSlot: string }[]; };
  status: OrderStatus;
  isPaid: boolean;
  paymentDetails?: PaymentDetails;
  discountInfo?: { code?: string; name?: string; amount: number; };
  createdAt: Date;
  source?: 'web' | 'instagram' | 'facebook' | 'phone' | 'other' | 'admin-custom';
  referenceImages?: string[];
  notesLog?: { id: string; content: string; createdAt: Date | string; author?: string; }[];
  claimedByUid?: string | null;
  paymentToken?: string;
}
The source: 'admin-custom' value in Order is the auditable marker distinguishing converted custom requests from regular web checkout orders.

Payment Hub (manual Interac e-Transfer). On order creation (web checkout and custom-order conversion) a secure `paymentToken` (a hex string from Node's `crypto.randomBytes(16)`) is persisted on the Order. The admin shares a self-serve link of the form `/pay/[orderId]?token=[token]`. The public route at `src/app/pay/[orderId]/page.tsx` strictly matches BOTH `_id` AND `paymentToken` before rendering the Payment Hub, which surfaces the amount, the destination e-Transfer email (from `app_settings.eTransferEmail`), and the order reference with one-tap copy buttons. There is no expiry — persistent by design, since e-Transfers can be delayed.

NOTE: This manual Interac e-Transfer flow and Payment Hub is a temporary solution. It will eventually be replaced by a direct payment gateway integration (e.g., Stripe).

Phase 1 — Client Wizard: Dynamic Option Fetching
The customer-facing intake lives at 

/custom-order
\custom-order\page.tsx) and is a six-step wizard built with react-hook-form + zod validation (customOrderSchema) and Framer Motion animated step transitions. The outer page component (CustomOrderPage) wraps the main content in a <Suspense> boundary because useSearchParams() is required during hydration for the deep-link entry path.

URL parameter hydration. A stateless WizardHydrator child component reads category and image URL search params and silently injects them into the form state via setValue() from useFormContext:

ts
const category = searchParams.get("category");
const image = searchParams.get("image");
if (category) setValue("category", category, { shouldValidate: true });
if (image) setValue("referenceImages", [image], { shouldValidate: true });
This mechanism enables the portfolio gallery to create a deep link directly to Step 2 (Category) pre-selected, skipping Step 1, while also pre-populating referenceImages[0]. When hasInspiration is true (an image param is detected), handleNext from Step 0 jumps to Step 2 instead of Step 1, and handleBack from Step 2 jumps back to Step 0 — the category step is bypassed entirely in the navigation flow.

Lazy-loaded catalog options. Flavors and categories are not fetched on initial page load. They are fetched only when the user advances to Step 2 (Details), and only if they have not been fetched already (guarded by categories.length === 0 && flavors.length === 0):

ts
useEffect(() => {
  if (currentStep === 2 && categories.length === 0 && flavors.length === 0) {
    Promise.all([fetch("/api/categories"), fetch("/api/flavors")])
      .then(([catRes, flavRes]) => { ... });
  }
}, [currentStep, categories.length, flavors.length]);
These are public (non-admin) read endpoints. The fetched data is used in two ways: the categories array is matched against the form's category string value to resolve the active category's _id (activeCategoryId), and the flavors array is then filtered client-side by f.categoryIds.includes(activeCategoryId) to produce filteredFlavors. The filteredFlavors are displayed below the form in a FlavorCarousel component during Step 2 — they serve as an informational reference, not as a controlled selection list. The customer types their flavor preference as free text in Step 2, and the carousel provides visual context for available options.

Idempotency key. A crypto.randomUUID() value is generated once into a useRef on component mount. This key is included in the final POST /api/custom-orders payload to prevent duplicate submissions from double-clicks or network retries. The API is expected to reject a second request carrying the same key.

Submission payload. On Step 4 (Contact), the submit button triggers handleSubmit(onSubmit). The onSubmit handler builds the payload:

ts
const payload = {
  ...data,                                 // Full CustomOrderFormData from react-hook-form
  idempotencyKey: idempotencyKeyRef.current,
  ...(user?._id ? { userId: user._id } : {}),  // Optionally links to authenticated User
};
await fetch("/api/custom-orders", { method: "POST", body: JSON.stringify(payload) });
The returned orderId (the MongoDB _id of the new custom_orders document) is stored in state and passed to Step 5 (Step6Success) for display and DM reference. After submission, the wizard advances to Step 5 and no further form fields are accessible.

Phase 2 — Admin Review: Draft Save
The admin reviews the CustomOrder document at 

/bakery-manufacturing-orders/custom-orders/[id]
. This page is a React Server Component marked dynamic = 'force-dynamic' and revalidate = 0 — Next.js never caches it. It performs a direct MongoDB findOne({ _id: new ObjectId(id) }) on the custom_orders collection server-side, serializes BSON dates and ObjectIds to plain strings/ISO strings, and passes the result as initialOrder: CustomOrder to CustomOrderDetailClient.

CustomOrderDetailClient is a thin client boundary that wraps CustomOrderDetail in a next/dynamic import with ssr: false — this ensures the heavy form UI is never server-rendered, avoiding hydration mismatches with Cloudinary upload state and modal interactions.

Local draft state. Inside 

CustomOrderDetail
, the initialOrder prop is loaded into component state via useState<CustomOrder>(initialOrder). All admin edits — agreed price, logistics fields, contact overrides, note text, additional reference image uploads — are applied to this local order state via handleFieldChange(field, value), which does a shallow merge: setOrder(prev => ({ ...prev, [field]: value })). No intermediate autosave occurs. The in-memory state is the working draft.

Cloudinary reference image upload (admin-side). The admin can attach additional images directly from the detail view. handleImageUpload uploads each File object directly to Cloudinary from the browser via the unsigned upload preset (using cloudinaryUploadUrl("image") and appendCloudinaryUploadPreset(formData) from @/lib/cloudinaryClient). The returned secure_url values are appended to order.referenceImages in local state. No server-side signed upload is performed here — images go directly from the admin's browser to Cloudinary.

Draft save — PUT /api/admin/custom-orders/[id] (

source
):

The handleSave function in CustomOrderDetail serializes the entire order state object and sends it:

ts
await fetch(`/api/admin/custom-orders/${order._id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(order),          // Full CustomOrder state as draft
});
The API route performs its own getAdminDb() auth check (verifying admin_session cookie → adminAuth.verifySessionCookie → User.role === "admin" in MongoDB). The route destructures _id out of the body before writing to avoid MongoDB's immutable _id field error, then applies a $set with updatedAt: new Date() appended:

ts
const { _id, ...updateData } = body;
await db.collection("custom_orders").updateOne(
  { _id: new ObjectId(id) },
  { $set: { ...updateData, updatedAt: new Date() } }
);
This is an unrestricted $set — whatever fields are present in the CustomOrder state (including admin-only fields like agreedPrice, adminNotes, addons, deliveryMethod) are written directly to the document. After a successful save, router.refresh() is called to trigger a server-side re-fetch of the RSC page, updating the serialized initialOrder prop without a full navigation.

Rejection (soft-delete). If the admin rejects the request, DELETE /api/admin/custom-orders/[id] is called. Rather than deleting the document, the route performs a replaceOne that overwrites the full document with a sparse { status: 'rejected', ... } skeleton. The original customer-submitted reference images are then purged from Cloudinary, with a protected-set check: any image URL that also appears in the products or gallery_images collections (matched at public_id level via getPublicIdFromUrl) is exempt from deletion.

Phase 3 — Conversion: POST /api/admin/custom-orders/[id]/convert
Conversion is triggered when the admin confirms the ConfirmationModal inside CustomOrderDetail. The modal requires the admin to select a payment method (expectedMethod: 'cash' | 'e-transfer') before confirming. The handleConvertConfirm function in CustomOrderDetail sends:

ts
await fetch(`/api/admin/custom-orders/${order._id}/convert`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agreedPrice: Number(order.agreedPrice),
    expectedMethod,                // Required: 'cash' | 'e-transfer'
    date: order.date,              // Admin may have edited the pickup date before converting
    timeSlot: order.timeSlot,
    deliveryMethod: order.deliveryMethod,
  }),
});
The convert route at 

/api/admin/custom-orders/[id]/convert
 performs a full multi-step mutation pipeline:

Step 1 — Auth. The route performs its own inline session verification (does not use verifyAdminAPI()): it reads admin_session, calls adminAuth.verifySessionCookie(sessionCookie, true), then does a findOne<User>({ firebaseUid: decodedToken.uid }) and checks user.role !== "admin".

Step 2 — Input validation. expectedMethod must be 'cash' or 'e-transfer' (strict allowlist). agreedPrice must be present and > 0. A missing expectedMethod returns 400; a missing agreedPrice also returns 400. If customOrder.status === "converted", the route returns 400 immediately — idempotency guard against duplicate conversion.

Step 3 — Name-to-ObjectId resolution. The CustomOrder stores category, details.flavor, and details.size as free-text strings (what the customer typed). Before constructing the Order, the route resolves each string to a MongoDB ObjectId via separate findOne queries:

Category: db.collection("categories").findOne({ $or: [{ name: category }, { name: category + "s" }, { name: category + "S" }] }) — the $or handles the singular/plural normalization issue (e.g., the wizard stores "Cake" but the catalog stores "Cakes").
Flavor: db.collection("flavors").findOne({ name: { $regex: /^flavorName$/i } }) — case-insensitive exact match.
Diameter/Size: db.collection("diameters").findOne({ name: /^sizeName$/i, $or: [{ categoryIds: resolvedCategoryId }, { categoryIds: resolvedCategoryId.toString() }] }) — filtered by the resolved category to avoid cross-category size name collisions.
These resolved ObjectId values (resolvedCategoryId, resolvedFlavorId, resolvedDiameterId) are embedded in the generated CartItem alongside the original string values, which are preserved for receipt display:

ts
const item = {
  id: `${newOrderId.toString()}-custom-1`,
  name: `Custom ${customOrder.category}`,
  productType: "custom",
  price: Number(agreedPrice),
  originalPrice: Number(agreedPrice),
  quantity: 1,
  customSize: sizeName,            // String — preserved for receipt
  diameterId: resolvedDiameterId,  // ObjectId — for analytics
  customFlavor: flavorName,        // String — preserved for receipt
  flavorId: resolvedFlavorId,      // ObjectId — for analytics
  isManualPrice: true,
  isCustom: true,
  rowTotal: Number(agreedPrice),
  inscription: customOrder.details?.textOnCake,
  designInstructions: customOrder.details?.designNotes,
  categoryId: resolvedCategoryId,
  addons: customOrder.addons || [],
};
Step 4 — Order document construction. A new ObjectId (newOrderId) is pre-generated before the database writes. The Order document is assembled with the following critical field assignments:

ts
const newOrder = {
  _id: newOrderId,
  customerId: customOrder.userId ? new ObjectId(customOrder.userId) : null,
  items: [item],
  totalAmount: Number(agreedPrice),
  customerInfo: {
    name: legalName || "Customer",
    email: contact.email || "",
    phone: contact.phone || "",
    socialNickname: socialNick || undefined,
    socialPlatform: socialPlat,
    notes: ["Converted from Custom Request", allergyNote].filter(Boolean).join(" | "),
  },
  deliveryInfo: {
    method: deliveryMethod ?? customOrder.deliveryMethod ?? "pickup",
    deliveryDates: [{ date: new Date(date ?? customOrder.date), itemIds: [item.id], timeSlot: timeSlot ?? customOrder.timeSlot ?? "12:00 PM" }],
  },
  status: OrderStatus.AWAITING_PAYMENT,   // ← Initial state for manual payment flow
  source: "admin-custom",
  referenceImages: customOrder.referenceImages || [],
  createdAt: new Date(),
  isPaid: false,
  paymentDetails: {
    expectedMethod: expectedMethod as 'cash' | 'e-transfer',  // ← No transactionId yet
  },
  notesLog: adminNotes ? [{ id: new ObjectId().toString(), content: adminNotes, createdAt: new Date(), author: "Admin" }] : [],
};
Key invariants in this document:

status is set to OrderStatus.AWAITING_PAYMENT ("awaiting_payment") — not PENDING_CONFIRMATION or CONFIRMED. This places the order in the waiting-for-payment queue in the admin order management view.
isPaid: false is the authoritative payment truth field.
paymentDetails.expectedMethod records the agreed payment form without a transactionId or paidAt — those fields are populated later when the admin confirms receipt of cash or e-transfer.
deliveryInfo.deliveryDates is a single-element array, matching the Order interface's structure used by the scheduling engine.
Allergy information from customOrder.allergies is injected into customerInfo.notes with a ⚠️ prefix so it is surfaced in every order receipt display, rather than being buried in a separate field.
Step 5 — Two-document atomic write sequence. The conversion is executed as two sequential MongoDB operations (not wrapped in a session transaction):

ts
// 1. Insert the new Order
await ordersColl.insertOne(newOrder);
// 2. Replace the CustomOrder with a sparse converted skeleton
await customOrdersColl.replaceOne(
  { _id: new ObjectId(id) },
  {
    _id: new ObjectId(id),
    userId: customOrder.userId,
    status: 'converted',
    convertedOrderId: newOrderId.toString(),  // Foreign key → orders collection
    category: customOrder.category,
    date: customOrder.date || customOrder.eventDate,
    contact: { name: customOrder.contact?.name || customOrder.customerName, email: customOrder.contact?.email || customOrder.customerEmail },
    agreedPrice: Number(agreedPrice),
    createdAt: customOrder.createdAt || customOrder.date || new Date(),
    updatedAt: new Date()
  }
);
The replaceOne is used — not updateOne — so the resulting custom_orders document is collapsed to a minimal skeleton with only audit-critical fields retained. All the original customer-submitted intake fields (details, referenceImages, allergies, adminNotes, etc.) are intentionally discarded from the custom order document; they have been either migrated into the new Order document or are no longer needed. The convertedOrderId string serves as the cross-collection link from the CustomOrder record to the production Order.

Step 6 — Transactional email. After both writes succeed, the route conditionally dispatches an OrderConfirmationEmail via Resend. The dispatch is skipped if customerInfo.email is empty or contains @placeholder.com. When it fires, the route hydrates the email template by fetching all flavors and diameters from MongoDB into lookup maps (Record<string, string>) — this is required because the OrderConfirmationEmail component resolves ObjectId references to human-readable names. The compiled Order object (with ObjectIds stringified) and both maps are passed to render(OrderConfirmationEmail(...)) from @react-email/render, which produces the raw HTML string sent via resend.emails.send. Email failure is caught and logged but does not affect the HTTP response — the conversion is already persisted.

Response. On success, the route returns { success: true, newOrderId: string, paymentToken: string }. The `paymentToken` is a secure hex string persisted on the new Order. Back in CustomOrderDetail.handleConvertConfirm (and CustomOrderCard.handleConvert), the returned `newOrderId` + `paymentToken` are used to build the Payment Hub link `${window.location.origin}/pay/${orderId}?token=${paymentToken}`, surfaced via CustomOrderDetailHeader as a "Copy Payment Link" button. For already-converted orders opened later, the admin UI resolves the token by fetching the Order from GET /api/admin/orders/[id].

NOTE: This manual Interac e-Transfer flow and Payment Hub is a temporary solution. It will eventually be replaced by a direct payment gateway integration (e.g., Stripe).