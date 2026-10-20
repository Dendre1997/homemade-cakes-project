/**
 * Shared MongoDB projections for order/custom-order list reads.
 * Keep heavy blobs out of list/dashboard payloads at the driver level.
 */

/** Orders: inbox, production queue, capacity inputs. */
export const ORDER_LIST_PROJECTION = {
  notesLog: 0,
  paymentToken: 0,
  referenceImages: 0,
  "items.imageUrl": 0,
  "items.imageUrls": 0,
  "items.selectedConfig": 0,
} as const;

/** Custom orders: AI / brief payloads (no reference image blobs). */
export const CUSTOM_ORDER_BRIEF_PROJECTION = {
  "items.referenceImages": 0,
  "items.priceBreakdown": 0,
  referenceImages: 0,
  referenceImageUrls: 0,
  adminSelectedImage: 0,
} as const;

/** Custom orders: admin list / dashboard compact rows. */
export const CUSTOM_ORDER_LIST_PROJECTION = {
  addons: 0,
  priceBreakdown: 0,
  "items.addons": 0,
  "items.priceBreakdown": 0,
  adminNotes: 0,
  idempotencyKey: 0,
  userId: 0,
  updatedAt: 0,
  "contact.phoneDigits": 0,
} as const;
