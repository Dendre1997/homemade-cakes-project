Dynamic Catalog Management
Entity Model & Relational Graph
The catalog is composed of five primary MongoDB collections — categories, flavors, diameters, addons, and products — that form a hub-and-spoke relational graph. The products collection acts as the hub: it stores foreign-key arrays that reference documents in all four spoke collections. There are no MongoDB join tables or embedded sub-documents for cross-collection references; instead, the native MongoDB aggregation $lookup stage is used at read time to hydrate the sparse ID references into full documents.

The type contract for every entity is defined in 

src/types/index.ts
:

categories  ←── ProductCategory
flavors     ←── Flavor
diameters   ←── Diameter
addons      ←── Addon
products    ←── Product (references all four above)
Every entity in the spoke collections carries an optional categoryIds: string[] field that scopes that entity to one or more product categories. This makes ProductCategory the root node of the dependency graph — it must exist before flavors, diameters, or products can be created.

Type Interfaces
ProductCategory (

index.ts:160
):

ts
export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;                            // URL-safe identifier, auto-generated via slugify()
  manufacturingTimeInMinutes?: number;     // Used by the scheduling engine to compute baking capacity
  imageUrl: string;
  basePrice?: number;
  categoryType?: 'single' | 'set' | 'combo';
}
Flavor (

index.ts:2
):

ts
export interface Flavor {
  _id: string;
  name: string;
  price: number;         // Added to the product's structureBasePrice at checkout
  description?: string;
  categoryIds?: string[]; // Scopes this flavor to specific ProductCategory documents
  imageUrl?: string;
}
Diameter (

index.ts:40
):

ts
export interface Diameter {
  _id: string;
  name: string;
  sizeValue: number;      // Numeric value in inches
  servings: string;       // Human-readable serving estimate string
  illustration: string;   // Maps to a named SVG icon component (e.g. "SixInchCakeIcon")
  imageUrl?: string;
  categoryIds?: string[];  // Scopes this diameter to specific ProductCategory documents
  basePrice?: number;      // Optional override; AvailableDiameterConfig.price takes precedence on a Product
}
AvailableDiameterConfig (

index.ts:51
):

ts
export interface AvailableDiameterConfig {
  diameterId: string;   // ObjectId reference → diameters collection
  price?: number;       // Per-product price override; supersedes Diameter.basePrice
  multiplier?: number;  // Optional price multiplier applied during cart pricing
}
This intermediary interface is the join record between a Product and its applicable Diameter documents. It allows a single Diameter (e.g. a 6-inch size) to carry a different price on each product that references it, without mutating the source Diameter document.

Addon (

index.ts:20
):

ts
export interface Addon {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryIds?: string[];
  isActive: boolean;
  variants: {
    _id?: string;      // Synthetic ObjectId string, generated server-side on creation
    name: string;
    price: number;
    imageUrl?: string;
  }[];
}
Addon is the only entity that contains embedded sub-documents (variants). Each variant is a concrete purchasable option (e.g. "Small Bouquet", "Large Bouquet") with its own price. The _id on each variant is a synthetic ObjectId string generated during the POST /api/admin/addons write, not a MongoDB-native sub-document _id — this allows client-side lookups by variant ID without a separate collection scan.

Product (

index.ts:86
):

ts
export interface Product {
  _id: string;
  name: string;
  description: string;
  imageUrls: string[];
  categoryId: string;                          // ObjectId → categories collection
  structureBasePrice: number;                  // Base price before flavor/diameter/addon additions
  availableFlavorIds: string[];                // ObjectId[] → flavors collection
  availableDiameterConfigs: AvailableDiameterConfig[]; // Embedded join records → diameters
  allergenIds: string[];                       // ObjectId[] → allergens collection
  isActive: boolean;
  inscriptionSettings?: { isAvailable: boolean; price: number; maxLength: number; };
  collectionIds?: string[];                    // ObjectId[] → collections collection
  seasonalEventIds?: string[];                 // ObjectId[] → seasonals collection
  slug: string;                                // SEO URL segment, collision-safe
  productType?: 'cake' | 'set' | 'combo' | 'custom';
  availableQuantityConfigs?: { _id?: string; label: string; quantity: number; price: number; }[];
  comboConfig?: { hasCake: boolean; cakeFlavorIds: string[]; cakeDiameterIds: string[]; allowInscription: boolean; };
  defaultAddons?: { addonId: string; variantId: string }[];
}
CRUD Architecture — API Layer
Every catalog API route is protected by verifyAdminAPI() from 

src/lib/auth/adminOnly.ts
, which validates the admin_session cookie before any database access occurs. Routes that perform mutations call revalidatePath("/", "page") after a successful write to invalidate Next.js's RSC cache for the entire storefront, ensuring the next public request reflects the catalog change.

ProductCategory — /api/admin/categories
POST (

source
):

The route destructures name, manufacturingTimeInMinutes, imageUrl, basePrice, and categoryType from the request body as Partial<ProductCategory>. The name field is mandatory; all other fields have defaults. Before insertion, slugify(name) generates the URL-safe slug. The write payload is:

ts
const newCategoryData = {
  name,
  slug,                                                       // auto-derived via slugify(name)
  manufacturingTimeInMinutes: Number(manufacturingTimeInMinutes) || 0,
  imageUrl: imageUrl || "",
  basePrice: Number(basePrice) || 0,
  categoryType: categoryType || 'single',
};
await db.collection("categories").insertOne(newCategoryData);
Note that MongoDB auto-generates the _id; it is not present in newCategoryData. The slug is not unique-checked at the DB level in this route — slug uniqueness is enforced only on Product creation.

GET returns db.collection("categories").find({}).toArray() — an unfiltered full scan. Because categories are a small, bounded dataset, no pagination or projection is applied.

Flavor — /api/admin/flavors
POST (

source
):

Validates that name is present and price is a strict number (typeof price !== 'number' check — this blocks string-coerced numeric inputs). The write payload:

ts
const newFlavorData = {
  name,
  price,
  description: description || "",
  categoryIds: categoryIds || [],   // string[] of ProductCategory _id values
  imageUrl: imageUrl || "",
};
await db.collection('flavors').insertOne(newFlavorData);
categoryIds defaults to an empty array if not supplied, making a flavor global (available to all categories) by omission.

GET accepts an optional ?categoryId=<id> query parameter. When present, it builds a filter { categoryIds: categoryId }. MongoDB's native array field query (field equals element) is used here — it matches any document where the categoryIds array contains the supplied value. This is the mechanism that powers the category-scoped flavor loading in the product creation UI.

Diameter — /api/admin/diameters
POST (

source
):

Requires name, sizeValue (as a strict number), servings, and illustration. The illustration field stores the string name of an SVG icon component (e.g. "SixInchCakeIcon"), not the icon itself. The admin UI in 

ManageDiametersPage
 resolves this string back to a React component at render time via the availableIcons lookup map. The basePrice field is conditionally included:

ts
const newDiameterData: any = {
  name, sizeValue, servings, illustration, imageUrl,
  categoryIds: categoryIds || [],
};
if (basePrice !== undefined && basePrice !== null) {
  newDiameterData.basePrice = basePrice;   // Omitted entirely if not supplied
}
await db.collection('diameters').insertOne(newDiameterData);
The conditional basePrice exclusion is intentional — omitting the field rather than writing null or 0 allows the pricing engine to distinguish "no base price set" from "base price is zero." This matters because the per-product AvailableDiameterConfig.price override takes precedence when it exists.

GET accepts ?categoryId=<id> with the same array element query pattern as the flavors route.

Addon — /api/admin/addons
POST (

source
):

Requires name and at least one element in variants. The variant array is normalized during write: each variant that does not already have an _id receives a synthetic one generated with new ObjectId().toString():

ts
const newAddonData = {
  name,
  description: description || "",
  imageUrl: imageUrl || "",
  categoryIds: categoryIds || [],
  isActive: isActive !== undefined ? isActive : true,
  variants: variants.map(v => ({
    ...v,
    _id: v._id || new ObjectId().toString()   // Synthetic ObjectId string, not a native sub-doc _id
  })),
};
await db.collection("addons").insertOne(newAddonData);
The response body includes the full newAddonData merged with the MongoDB-generated insertedId, making the created document immediately available to the caller without a round-trip findOne.

GET returns db.collection("addons").find({}).toArray() — a full scan with no category filtering, because addons are displayed globally in the UI list and filtered client-side by the admin.

Product — /api/admin/products and /api/admin/products/[id]
POST — Product Creation (

source
):

This route performs the most complex write in the catalog system. Every ID field received from the client as a plain string is explicitly converted to a MongoDB ObjectId before insertion. The conversion is exhaustive:

ts
categoryId:               new ObjectId(categoryId),
availableFlavorIds:       availableFlavorIds?.map(id => new ObjectId(id)) || [],
allergenIds:              allergenIds?.map(id => new ObjectId(id)) || [],
availableDiameterConfigs: availableDiameterConfigs?.map(config => ({
                            ...config,
                            diameterId: new ObjectId(config.diameterId)   // Converts AvailableDiameterConfig.diameterId
                          })) || [],
collectionIds:            collectionIds?.map(id => new ObjectId(id)) || [],
defaultAddons:            defaultAddons?.map(da => ({
                            addonId:   new ObjectId(String(da.addonId)),
                            variantId: new ObjectId(String(da.variantId))
                          })) || [],
This ObjectId conversion is what allows $lookup aggregations to join on _id — the stored type must match the foreignField type exactly. Flavors and diameters stored in the spoke collections use BSON ObjectId as their _id type, so all foreign key references in the products document must also be ObjectId, not strings.

Set/Combo pricing rule: When productType === 'set', the route auto-computes structureBasePrice before insertion:

ts
const firstBoxPrice = availableQuantityConfigs?.[0]?.price || 0;
if (comboConfig?.hasCake) {
  finalPrice = userInputPrice + firstBoxPrice;  // Combo: user's cake price + box price
} else {
  finalPrice = firstBoxPrice;                   // Simple set: box price only (user input ignored)
}
Collision-safe slug generation: The slug is produced from generateSlug(name) and then entered into a while loop that queries db.collection("products").findOne({ slug }) until a unique value is found, appending an incrementing counter suffix if collisions exist:

ts
let slug = generateSlug(name);
let counter = 0;
while (!isUnique) {
  const existing = await db.collection("products").findOne({ slug });
  if (!existing) { isUnique = true; }
  else { slug = `${generateSlug(name)}-${counter++}`; }
}
GET — Product List with Category Join: The collection-level GET runs an aggregation with a $lookup from categories and an $unwind to flatten the one-element array into an embedded object. A context=admin query parameter bypasses the isActive: true filter, returning inactive products only visible to administrators.

PUT — Product Update (

source
):

The update handler performs the same ObjectId conversion as the POST for every association field in the request body, then applies them atomically with $set:

ts
await collection.updateOne(
  { _id: new ObjectId(id) },
  { $set: body }   // body has been mutated in-place: all string IDs converted to ObjectId
);
Image orphan cleanup: Before the $set, the handler computes the diff between existingProduct.imageUrls and body.imageUrls. Any Cloudinary URLs present in the old set but absent from the new set are extracted into their Cloudinary public_id values via getPublicIdFromUrl() and passed to cloudinary.api.delete_resources(publicIds, { invalidate: true }). This call is intentionally fire-and-forget (.then().catch() without await), so Cloudinary cleanup never blocks the database write or the HTTP response.

Slug immutability rule: A slug is only updated if body.slug is explicitly present in the request body. If the admin changes the product name, the slug is deliberately not regenerated — preventing broken SEO URLs from name edits. When a slug override is provided, the route runs findOne({ slug, _id: { $ne: new ObjectId(id) } }) before applying it, rejecting slug values already in use by another product with 409 Conflict.

GET — Single Product with Full Aggregation: The single-product GET accepts either a MongoDB ObjectId string or a slug string as the [id] parameter, using isValidObjectId(id) to select the query type. It runs a five-stage $lookup pipeline:

products → categories   (localField: categoryId)
         → flavors       (localField: availableFlavorIds)
         → diameters     (localField: availableDiameterConfigs.diameterId)
         → collections   (localField: collectionIds)
         → seasonals     (localField: seasonalEventIds)
The category lookup is followed by $unwind: { preserveNullAndEmptyArrays: true } to flatten it from an array to a single embedded object, matching the ProductWithCategory type consumed by the storefront.

DELETE — Cascading Asset Removal: Before the MongoDB deletion, the handler fetches productToDelete.imageUrls, converts all URLs to Cloudinary public_id values, and calls await cloudinary.api.delete_resources(publicIds) — this await is synchronous (blocking), unlike the PUT cleanup, ensuring all Cloudinary assets are removed before the document is deleted from MongoDB.

Admin UI — Category-Scoped Form Architecture
The product creation page at 

/bakery-manufacturing-orders/products/create
 enforces a two-step UX that mirrors the data dependency graph:

Step 1 — Category selection: The admin selects a ProductCategory from a <Select> dropdown populated by GET /api/admin/categories. Until a category is chosen, the product form is not rendered.

Step 2 — Category-scoped dependent data: Whenever selectedCategoryId changes, a useEffect fires two parallel requests:

ts
fetch(`/api/admin/flavors?categoryId=${selectedCategoryId}`)
fetch(`/api/admin/diameters?categoryId=${selectedCategoryId}`)
These requests hit the GET handlers that apply the { categoryIds: categoryId } array-element filter described above. The returned Flavor[] and Diameter[] are passed into ProductForm as the available options, ensuring the admin can only assign flavors and diameters that are already scoped to the selected category.

The catalog management pages for flavors (

/catalog/flavors
), diameters (

/catalog/diameters
), and addons (

/catalog/addons
) follow an identical two-panel split layout: a creation/edit form on the left third, and a searchable, filterable list on the right two-thirds. All three pages co-fetch categories alongside their primary entity via Promise.all, building a local categoryMap (a Map<_id, name>) for displaying resolved category names in the list rather than raw ObjectId strings. CRUD operations are dispatched to their respective entity endpoints, and after any successful mutation the page re-fetches the full entity list via a memoized useCallback (fetchFlavors / fetchDiameters / fetchAddons) to keep local state consistent without a full page navigation.