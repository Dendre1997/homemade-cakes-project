import { ObjectId } from "mongodb";
export interface Flavor {
  _id: string;
  name: string;
  price: number;
  description?: string;
  categoryIds?: string[];
  imageUrl?: string;
}

export interface Decoration {
  _id: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryIds?: string[];
  type: string;
}

export interface Allergen {
  _id: string;
  name: string;
}

export interface Diameter {
  _id: string;
  name: string;
  sizeValue: number;
  servings: string;
  illustration: string;
  categoryIds?: string[];
}

export interface AvailableDiameterConfig {
  diameterId: string;
  multiplier: number;
}

// ... existing imports

export interface AppSettings {
  _id: string; // constant: "global_settings"
  checkout: {
    isDeliveryEnabled: boolean;
    disabledMessage?: string;
  };
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  structureBasePrice: number;
  availableFlavorIds: string[];
  availableDiameterConfigs: AvailableDiameterConfig[];
  allergenIds: string[];
  isActive: boolean;
  inscriptionSettings?: {
    isAvailable: boolean;
    price: number;
    maxLength: number;
  };
  collectionIds?: string[];
  seasonalEventIds?: string[];
  
  // SEO
  slug: string;
  
  productType?: 'cake' | 'set' | 'custom'; // Defaults to 'cake'
  availableQuantityConfigs?: {
    _id?: string;
    label: string;
    quantity: number;
    price: number;
  }[];
  comboConfig?: {
    hasCake: boolean;
    cakeFlavorIds: string[];
    cakeDiameterIds: string[];
    allowInscription: boolean;
  };
}

export interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  structureBasePrice: number;
  isActive: boolean;
  availableFlavorIds: string[];
  allergenIds: string[];
  availableDiameterConfigs: { diameterId: string; multiplier: number }[];
  imageUrls: string[];
  inscriptionSettings?: {
    isAvailable: boolean;
    price: number;
    maxLength: number;
  };
  collectionIds?: string[];
  seasonalEventIds?: string[];
  
  slug?: string;

  // NEW FIELDS for Form
  productType?: 'cake' | 'set' | 'custom';
  availableQuantityConfigs?: {
    label: string;
    quantity: number;
    price: number;
  }[];
  comboConfig?: {
    hasCake: boolean;
    cakeFlavorIds: string[];
    cakeDiameterIds: string[];
    allowInscription: boolean;
  };
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  manufacturingTimeInMinutes?: number;
  imageUrl: string;
}

export interface ProductWithCategory extends Product {
  category: ProductCategory;
  availableFlavors: Flavor[];
  availableDiameters: Diameter[];
}

export interface Collection {
  _id: string,
  name: string,
  description?: string,
  imageUrl?: string
  slug: string;
}

export interface SeasonalEvent {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  heroBannerUrl?: string;
  themeColor?: string;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  productId?: string;
  categoryId?: string;
  name: string;
  flavor?: string;
  diameterId?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  inscription?: string;
  originalPrice?: number;
  discountName?: string | null;
  discountId?: string | null;
  rowTotal?: number;
  isCustom?: boolean;
  
  // NEW FIELD
  selectedConfig?: {
    quantityConfigId?: string;
    cake?: {
      flavorId: string;
      diameterId: string;
      inscription?: string;
    };
    items?: { flavorId: string; count: number }[];
  };

  // Custom Order Fields
  productType?: 'cake' | 'set' | 'custom';
  customSize?: string;
  customFlavor?: string;
  isManualPrice?: boolean;
  adminNotes?: string;
}
export type UniqueCartItem = CartItem & {
  uniqueId: string;
  time: number;
};

export enum OrderStatus {
  NEW = "new",
  PAID = "paid",
  IN_PROGRESS = "in-progress",
  READY = "ready",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  PENDING_CONFIRMATION = "pending_confirmation",
}

export interface Order {
  _id: string;
  customerId?: string;
  items: CartItem[];
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
  deliveryInfo: {
    method: "pickup" | "delivery";
    address?: string;
    deliveryDates: { date: Date; itemIds: string[]; timeSlot: string }[];
  };
  status: OrderStatus;
  paymentDetails?: {
    transactionId: string;
    status: string;
  };
  discountInfo?: {
    code?: string;
    name?: string;
    amount: number;
  };
  createdAt: Date;
  source?: 'web' | 'instagram' | 'facebook' | 'phone' | 'other' | 'admin-custom';
  referenceImages?: string[];
  isPaid?: boolean;
  notesLog?: {
    id: string; 
    content: string;
    createdAt: Date | string;
    author?: string; 
  }[];
}
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
  
  // NEW FIELD (Synced with CartItem)
  selectedConfig?: {
    quantityConfigId?: string;
    cake?: {
      flavorId: string;
      diameterId: string;
      inscription?: string;
    };
    items?: { flavorId: string; count: number }[];
  };

  // Custom Order Fields
  productType?: 'cake' | 'set' | 'custom';
  customSize?: string;
  customFlavor?: string;
  isManualPrice?: boolean;
  adminNotes?: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  role: "customer" | "admin";
  name?: {
    first?: string;
    last?: string;
  };
  phone?: string;
  addresses?: Address[];
  purchasedProductIds?: string[];
}

export interface ScheduleSettings {
  _id: string;
  leadTimeDays: number;
  defaultWorkMinutes: number;
  defaultAvailableHours: string[];

  dateOverrides: {
    date: Date;
    workMinutes?: number;
    isBlocked?: boolean;
    availableHours?: string[]
  }[];
}

export interface HeroSlide {
  _id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  link?: string; 
}


export type DiscountType = "percentage" | "fixed";
export type DiscountTrigger = "automatic" | "code";
export type DiscountTargetType =
  | "all"
  | "category"
  | "collection"
  | "seasonal"
  | "product";

export interface Discount {
  _id: string | ObjectId;
  name: string;
  code: string; 

  type: DiscountType;
  value: number; // 10
  trigger: DiscountTrigger;

  
  targetType: DiscountTargetType;
  targetIds: (string | ObjectId)[];



  isActive: boolean;
  startDate: Date | string;
  endDate: Date | string;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount: number;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string; // HTML content
  imageUrl: string;
  isActive: boolean;
  publishedAt: Date | string;
  createdAt: Date;
  updatedAt: Date;
  relatedProductIds?: string[]; // Stored in DB
  relatedProducts?: Product[]; // Populated by API
}

export interface VideoBannerContent {
  _id: string; 
  videoUrl: string;
  buttonText: string;
  linkUrl: string;
  isActive: boolean;
}

export interface CustomOrder {
  _id: string;
  status: 'new' | 'negotiating' | 'converted' | 'rejected' | string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventDate?: string | Date;
  servingSize?: string | number;
  eventType?: string;
  description: string;
  budgetRange?: string;
  referenceImageUrls?: string[];
  communicationMethod?: string;
  convertedOrderId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Admin fields
  agreedPrice?: number;
  adminNotes?: string;
  adminSelectedImage?: string;
}
