Data Models Reference
All types are exported from src/types/index.ts. MongoDB ObjectId appears where persisted documents use native driver types at write time.

Catalog Types
Name Description Key Fields
Flavor
Sellable flavor variant with optional per-category scoping and surcharge price.
_id, name, price, description?, categoryIds?[], imageUrl?
Addon
Configurable add-on product with one-or-more priced variants (e.g., topper styles).
_id, name, description?, imageUrl?, categoryIds?[], isActive, variants[] (name, price, _id?, imageUrl?)
SelectedAddon
Denormalized add-on snapshot embedded in cart/order line items after variant selection.
addonId, name, variantId?, variantName, price, imageUrl?
Allergen
Allergen label referenced by Product.allergenIds.
_id, name
Diameter
Cake size tier with physical metadata and optional base price override.
_id, name, sizeValue, servings, illustration, imageUrl?, categoryIds?[], basePrice?
AvailableDiameterConfig
Per-product diameter pricing rule: fixed price or multiplier over structure base.
diameterId, price?, multiplier?
Product
Core catalog SKU document supporting cakes, sets, combos, and custom product types.
_id, name, description, imageUrls[], categoryId, structureBasePrice, availableFlavorIds[], availableDiameterConfigs[], allergenIds[], isActive, inscriptionSettings?, collectionIds?[], seasonalEventIds?[], slug, productType?, availableQuantityConfigs?[], comboConfig?, defaultAddons?[]
ProductFormData
Admin product editor payload; mirrors Product without _id, with optional slug and form-oriented quantity configs (no_id on box configs).
Same structural fields as Product minus _id; slug?; availableQuantityConfigs entries omit_id
ProductCategory
Top-level product taxonomy node with manufacturing time and optional category-type discriminator.
_id, name, slug, manufacturingTimeInMinutes?, imageUrl, basePrice?, categoryType? ('single' | 'set' | 'combo')
ProductWithCategory
SSR/API-enriched Product with resolved category, flavors, and diameters for storefront rendering.
Extends Product + category: ProductCategory, availableFlavors: Flavor[], availableDiameters: Diameter[]
Collection
Curated product grouping for collection pages and discount targeting.
_id, name, description?, imageUrl?, slug
AppSettings
Singleton global settings document (_id: "global_settings"). Controls order acceptance, checkout logistics, and live-chat bot config.
_id, store? (isAcceptingOrders, vacationMessage?), checkout (isDeliveryEnabled, deliveryFee?, minOrderForDelivery?, pickupAddress?, …), support? (isLiveChatEnabled, botGreetingMessage?)
Order Types
Name Description Key Fields
CartItem
Client-side and in-flight order line item; carries pricing, configuration, discount metadata, and custom-order manufacturing fields.
id, productId?, categoryId?, name, flavor?, diameterId?, price, quantity, imageUrl?, inscription?, originalPrice?, discountName?, discountId?, rowTotal?, selectedConfig?, productType?, customSize?, customFlavor?, designInstructions?, addons?[], isCustom?, isManualPrice?
UniqueCartItem
Type alias: CartItem augmented with ephemeral client identity for mini-cart deduplication.
CartItem + uniqueId: string, time: number
OrderStatus
String enum governing the full order lifecycle from intake through fulfilment and cancellation.
NEW, PAID, IN_PROGRESS, READY, DELIVERED, CANCELLED, PENDING_CONFIRMATION, AWAITING_PAYMENT, CONFIRMED
PaymentDetails
Structured payment record on Order; method is actual completion form, expectedMethod is admin-set intent from custom-order conversion.
method ('cash' | 'e-transfer' | 'square' | 'manual'), expectedMethod?, transactionId?, paidAt?
Order
Root order document; financial truth via isPaid + totalAmount; embeds CartItem[] at runtime.
_id, customerId?, items[], totalAmount, customerInfo, deliveryInfo, status: OrderStatus, isPaid, paymentDetails?, discountInfo?, createdAt, source?, referenceImages?[], notesLog?[], claimedByUid?, paymentToken? (secure hex token guarding the public Payment Hub link /pay/[orderId]?token=[token])
OrderItem
Persisted line-item shape with ObjectId-typed foreign keys; synced field set with CartItem minus ephemeral client fields.
id, productId?: ObjectId, categoryId?: ObjectId, diameterId?: ObjectId, price, quantity, rowTotal?, discountId?: ObjectId, selectedConfig?, productType?, customSize?, designInstructions?, addons?[]
CustomOrder
Pre-conversion custom cake request submitted via the public custom-order pipeline; admin-mutable before converted → Order.
_id, status, date, timeSlot, category, details (size, flavor, designNotes, …), referenceImages[], contact, convertedOrderId?, allergies?, agreedPrice?, adminNotes?, deliveryMethod?, addons?[]
ScheduleSettings
Capacity and scheduling engine configuration: lead time, per-day work minutes, hour slots, and date-level overrides.
_id, leadTimeDays, defaultWorkMinutes, defaultAvailableHours[], weekdayHours?, dateOverrides[] (date, workMinutes?, isBlocked?, availableHours?[])
User Types
Name Description Key Fields
Address
Embedded shipping/billing address on User.addresses.
street, city, postalCode, country, isDefault
User
Application user bound to Firebase Auth; role discriminates admin vs customer access.
_id, firebaseUid, email, role ("customer" | "admin"), name? (first?, last?), phone?, addresses?[], purchasedProductIds?[]
Discount Types
Name Description Key Fields
DiscountType
Type alias: arithmetic mode for discount application.
"percentage" | "fixed"
DiscountTrigger
Type alias: activation mechanism for a discount rule.
"automatic" | "code"
DiscountTargetType
Type alias: polymorphic scope determining how targetIds is evaluated against cart items.
"all" | "category" | "collection" | "seasonal" | "product"
Discount
Promotion rule document in MongoDB discounts collection.
_id, name, code, type: DiscountType, value, trigger: DiscountTrigger, targetType: DiscountTargetType, targetIds[], isActive, startDate, endDate, minOrderValue?, usageLimit?, usedCount
Chat Types
Name Description Key Fields
MessageSender
Type alias: author role for an IMessage.
'client' | 'admin' | 'bot'
ChatStatus
Type alias: support ticket lifecycle state on IChat.
'bot_active', 'waiting_admin', 'admin_active', 'archived_bot', 'resolved'
IMessage
Embedded message within IChat.messages[]; broadcast via Pusher as the real-time payload shape.
id, sender: MessageSender, text, createdAt
IChat
Support conversation document in MongoDB chats collection.
_id?, userId, status: ChatStatus, hasUnread, messages: IMessage[], createdAt, updatedAt
Content Types
Name Description Key Fields
SeasonalEvent
Time-bounded marketing campaign; products link via inverse Product.seasonalEventIds.
_id, name, description?, slug, heroBannerUrl?, themeColor?, startDate, endDate, isActive
HeroSlide
Homepage carousel slide in MongoDB hero_slides.
_id, imageUrl, title, subtitle?, buttonText?, link?
Blog
Article document in MongoDB blogs; content is TipTap HTML.
_id, title, slug, content, imageUrl, isActive, publishedAt, createdAt, updatedAt, relatedProductIds?[], relatedProducts?[] (populated)
VideoBannerContent
Singleton homepage video CTA in MongoDB site_content (_id: "homepage-custom-cake-video").
_id, videoUrl, buttonText, linkUrl, isActive
IGalleryImage
Portfolio gallery entry in MongoDB gallery; supports category/collection filtering and default add-on presets for custom orders.
_id, imageUrl, title, description?, categories[], collectionIds?[], decorationPrice?, isActive, createdAt, updatedAt, defaultAddons?[]
