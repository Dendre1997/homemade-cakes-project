Content & Marketing
Type Definitions
Marketing and storefront content types are defined in src/types/index.ts:

Blog — article document in MongoDB blogs:

export interface Blog {
  _id: string;
  title: string;
  slug: string;                    // URL segment; globally unique
  content: string;                 // HTML from TipTap editor
  imageUrl: string;
  isActive: boolean;               // Published vs draft gate
  publishedAt: Date | string;
  createdAt: Date;
  updatedAt: Date;
  relatedProductIds?: string[];    // Cross-sell product references (DB)
  relatedProducts?: Product[];     // Populated at read time (not stored)
}
HeroSlide — carousel slide in MongoDB hero_slides:

export interface HeroSlide {
  _id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;                   // CTA destination (default "/products")
}
VideoBannerContent — singleton homepage video CTA in MongoDB site_content:

export interface VideoBannerContent {
  _id: string;                     // Fixed: "homepage-custom-cake-video"
  videoUrl: string;
  buttonText: string;
  linkUrl: string;
  isActive: boolean;
}
IGalleryImage — portfolio entry in MongoDB gallery (via getGalleryCollection()):

export interface IGalleryImage {
  _id: string | ObjectId;
  imageUrl: string;
  title: string;
  description?: string;
  categories: string[];            // ProductCategory._id strings for filtering
  collectionIds?: string[];
  decorationPrice?: number;        // Custom-work price baseline
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  defaultAddons?: { addonId: string; variantId: string }[];
}
SeasonalEvent — time-bounded campaign in MongoDB seasonals:

export interface SeasonalEvent {
  _id: string;
  name: string;
  description?: string;
  slug: string;                    // Auto-generated via slugify(name)
  heroBannerUrl?: string;
  themeColor?: string;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
}
Product linkage to seasonals is not stored on SeasonalEvent; it is maintained inversely on Product.seasonalEventIds[] via admin PUT logic.

Storefront Content Hub
Page: src/app/bakery-manufacturing-orders/content/page.tsx (ManageContentPage).

Navigation hub rendering two ContentCard entries:

Home Page Slider → /bakery-manufacturing-orders/content/hero-slides (HeroSlide CRUD)
Home Page Video Banner → /bakery-manufacturing-orders/content/video-banner (VideoBannerContent singleton editor)
Blogs, gallery, and seasonals are separate top-level admin routes outside this hub.

Blog Articles
List — src/app/bakery-manufacturing-orders/blogs/page.tsx
Server Component (RSC). Direct MongoDB read — no admin API intermediary:

db.collection<Blog>("blogs").find({}).sort({ createdAt: -1 })
Renders sortable table: thumbnail (Blog.imageUrl), title, status badge (Blog.isActive → "Published" / "Draft"), publishedAt (formatted), actions:

View Live: /blog/{slug} (new tab)
Edit: /bakery-manufacturing-orders/blogs/{_id}/edit
Create — /blogs/new
Server page loads active products via aggregation (isActive: true, category $lookup) and passes to NewBlogClient.

NewBlogClient → BlogForm → POST /api/admin/blogs.

Edit — /blogs/[id]/edit
EditBlogClient → BlogForm with initialData: Blog → PATCH /api/admin/blogs/{id}. Includes delete via DELETE with Cloudinary image cleanup.

BlogForm (src/components/admin/BlogForm.tsx)
Field Control Persistence
title
Input
Required
slug
Input
Auto-generated from title on create ([^a-z0-9]+ → -)
content
TipTap (StarterKit + ImageExtension)
Serialized as HTML via editor.getHTML()
imageUrl
Cloudinary direct upload (cloudinaryUploadUrl("image"))
Featured image
isActive
Checkbox
Publish gate
relatedProductIds
ProductPicker
Cross-sell array
Submit payload: Partial<Blog> with all above fields.

API — src/app/api/admin/blogs/
POST (verifyAdminAPI):

Required: title, slug, content
Slug uniqueness: findOne({ slug }) → 409
Insert: isActive ?? false, publishedAt: publishedAt ? new Date() : new Date(), relatedProductIds: [] default
revalidatePath("/", "page")
PATCH /[id]:

Partial $set on mutable Blog fields
Slug uniqueness excludes current _id
revalidatePath("/", "page")
DELETE /[id]:

Fetches Blog, destroys Cloudinary asset via getPublicIdFromUrl(blog.imageUrl)
deleteOne from blogs
revalidatePath("/", "page")
Portfolio Gallery
Page: src/app/bakery-manufacturing-orders/gallery/page.tsx (GalleryAdminPage, client component).

Data loading
Promise.all([
  fetch("/api/admin/gallery"),      // IGalleryImage[]
  fetch("/api/categories"),         // ProductCategory[] (ChipCheckbox targets)
  fetch("/api/collections/all"),    // Collection[]
])
UI model
Instagram-style grid-cols-2 md:grid-cols-4 mosaic. Each tile opens a full-screen Dialog with:

Left (60%): image preview, Cloudinary upload/replace, prev/next swipe navigation (keyboard ArrowLeft/ArrowRight)
Right (40%): metadata form bound to editingItem: Partial<IGalleryImage>
Unsaved changes guard: JSON.stringify(editingItem) !== JSON.stringify(original) blocks modal close (confirmation) and swipe navigation.

IGalleryImage field editing
Field UI Notes
imageUrl
Cloudinary upload
Required with title for save
title
Input
Required
description
Textarea
Optional
decorationPrice
Number input
Coerced to 0 if NaN on save
categories
ChipCheckbox per ProductCategory
Stores category _id strings
collectionIds
ChipCheckbox per Collection
isActive
Switch
false → "Hidden" overlay on grid tile
defaultAddons
AddonSelector
Mapped to { addonId, variantId } on save
API — src/app/api/admin/gallery/
Auth: custom isAdmin() (Firebase admin_session + users.role === 'admin').

GET: find({}).sort({ createdAt: -1 })

POST:

{
  imageUrl, title, description, categories, collectionIds,
  decorationPrice, isActive, defaultAddons
}
defaultAddons cast: addonId/variantId → ObjectId on insert.

PATCH /[id]: Dynamic $set for provided fields; updatedAt: new Date()

DELETE /[id]: Cloudinary destroy with invalidate: true, then deleteOne

Create flow: POST → fetchData() full reload. Update flow: optimistic local setImages map without refetch.

Homepage Hero Slides
Page: src/app/bakery-manufacturing-orders/content/hero-slides/page.tsx (ManageHeroSlidesPage).

Dual-panel layout: inline HeroSlideForm (create/edit) + AdminListItem list of existing slides.

Data flow
Operation Method Endpoint
List
GET
/api/admin/hero-slides
Create
POST
/api/admin/hero-slides
Update
PUT
/api/admin/hero-slides/{id}
Delete
DELETE
/api/admin/hero-slides/{id}
Form data type: HeroSlideFormData = Omit<HeroSlide, "_id">.

HeroSlideForm (src/components/admin/HeroSlideForm.tsx)
HeroSlide field Default Special behavior
title
""
Required
subtitle
""
link
"/products"
buttonText
"Order Now"
imageUrl
""
Cloudinary upload + react-easy-crop repositioning via generateCroppedUrl()
Orphaned Cloudinary assets cleaned via POST /api/admin/cloudinary-delete on replacement.

API — src/app/api/admin/hero-slides/
POST (verifyAdminAPI):

Required: title, imageUrl
Defaults: subtitle: "", link: "/products", buttonText: "Order Now", createdAt: new Date()
revalidatePath("/", "page")
PUT /[id]:

Image swap logic: destroys old Cloudinary asset when imageUrl changes or cleared (imageUrl === "")
$set: { title, subtitle, link, buttonText, imageUrl: finalImageUrl }
revalidatePath("/", "page")
DELETE /[id]: MongoDB delete + Cloudinary destroy + revalidatePath

Homepage Video Banner
Page: src/app/bakery-manufacturing-orders/content/video-banner/page.tsx (VideoBannerPage).

Singleton editor for one VideoBannerContent document. Does not use REST API routes — persists via Next.js Server Actions in src/app/actions/site-content.ts.

Storage model
const COLLECTION_NAME = "site_content";
const BANNER_ID = "homepage-custom-cake-video";
getVideoBanner() → findOne({_id: BANNER_ID }). Returns null if absent; UI initializes empty defaults with hardcoded_id.

saveVideoBanner(data) → updateOne({ _id: BANNER_ID }, { $set: { ...data, updatedAt } }, { upsert: true }).

Form fields (VideoBannerContent)
Field Control
videoUrl
VideoUploadPreview (.mp4, .mov Cloudinary upload)
buttonText
Input
linkUrl
Input (e.g. /custom-order)
isActive
Switch — "Activate Banner on Homepage"
On load: getVideoBanner() in useEffect. On submit: saveVideoBanner(formData) → revalidatePath("/").

Seasonal Events
Page: src/app/bakery-manufacturing-orders/seasonals/page.tsx (ManageSeasonalsPage).

UI modes
showForm = isCreating || editingEvent || seasonals.length === 0:

Form mode: SeasonalForm with cancel (if events exist)
Grid mode: SeasonalCard grid + "Create New Event" button
Data loading
Promise.all([
  fetch("/api/admin/seasonals"),
  fetch("/api/admin/products?context=admin"),
])
Product association resolution (edit only):

products.filter(p => p.seasonalEventIds?.includes(editingEvent._id))
  .map(p => p._id.toString())
→ initialSelectedProductIds passed to SeasonalForm
SeasonalForm (src/components/admin/SeasonalForm.tsx)
SeasonalEvent field Control
name
Input; drives slug via slugify(name)
slug
Auto-synced from name
description
Textarea
heroBannerUrl
Cloudinary upload + crop (ImageUploadPreview, allowPositioning)
themeColor
Color input (default #ff9900 create, #000000 edit fallback)
startDate / endDate
CustomDateRangePicker → yyyy-MM-dd
isActive
Checkbox
selectedProductIds
ProductPicker (not on SeasonalEvent interface; form extension)
imageScale
Crop scale metadata (submitted but not in SeasonalEvent type)
Submit: { ...formData, selectedProductIds, imageScale }.

API — src/app/api/admin/seasonals/
GET: find({}).sort({ startDate: -1 })

POST:

Required: name, startDate, endDate
Auto: slug: slugify(name), themeColor: "#f6dcda", isActive ?? false
Does not process selectedProductIds — product linkage requires subsequent PUT
PUT /[id]:

Updates SeasonalEvent document fields; re-slugs on name change
heroBannerUrl swap with Cloudinary cleanup (same pattern as hero slides)
Product sync when selectedProductIds array provided:
// Remove event from products no longer selected
products.updateMany(
  { seasonalEventIds: eventId, _id: { $nin: selectedIds } },
  { $pull: { seasonalEventIds: eventId } }
)
// Add event to newly selected products
products.updateMany(
  {_id: { $in: selectedIds } },
  { $addToSet: { seasonalEventIds: eventId } }
)
revalidatePath("/", "page")
DELETE /[id]: Deletes seasonal document + Cloudinary banner destroy. Does not $pull from products (orphaned seasonalEventIds may remain).

Cross-Cutting Concerns
Concern Implementation
Admin auth
verifyAdminAPI() (blogs, hero-slides, seasonals) or custom isAdmin() (gallery)
Media storage
Cloudinary direct client upload; server-side destroy on delete/replace
Cache invalidation
revalidatePath("/", "page") on blog, hero-slide, seasonal mutations; revalidatePath("/") on video banner
Publish gates
Blog.isActive, IGalleryImage.isActive, SeasonalEvent.isActive, VideoBannerContent.isActive
Slug uniqueness
Enforced on Blog.slug (409 on collision); SeasonalEvent.slug regenerated from name without explicit collision check
Product cross-linking
Blog.relatedProductIds[] (embedded on blog doc); Product.seasonalEventIds[] (inverse relation on seasonal PUT)
Discount targeting
DiscountTargetType: "seasonal" consumes SeasonalEvent._id via Product.seasonalEventIds (see promotions engine)
