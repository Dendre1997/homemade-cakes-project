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
  
  store?: {
    isAcceptingOrders: boolean;
    vacationMessage?: string;
  };

  checkout: {
    isDeliveryEnabled: boolean;
    disabledMessage?: string;
    
    // New logistics fields
    deliveryFee?: number;
    minOrderForDelivery?: number;
    deliveryInstructions?: string;
    isPickupEnabled?: boolean;
    pickupAddress?: string;
    pickupInstructions?: string;
  };
  
  support?: {
    isLiveChatEnabled: boolean;
    botGreetingMessage?: string;
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
  basePrice?: number;
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
  AWAITING_PAYMENT = "awaiting_payment",
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
  status: 'pending_review' | 'converted' | 'rejected' | string;
  date: Date;
  timeSlot: string;
  category: 'Cake' | 'Bento' | 'Cupcakes' | 'Macarons' | string;
  details: {
    size?: string;
    flavor?: string;
    textOnCake?: string;
    designNotes?: string;
    [key: string]: any;
  };
  referenceImages: string[];
  contact: {
    name: string;
    phone: string;
    email: string;
    socialNickname?: string;
    socialPlatform?: "instagram" | "facebook";
  };
  
  convertedOrderId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Customer-submitted allergy info
  allergies?: string;

  // Admin fields
  agreedPrice?: number;
  approximatePrice?: number;
  adminNotes?: string;
  deliveryMethod?: "pickup" | "delivery" | string;
  [key: string]: any;
}

// --- STATUSES AND ROLES ---

// Who sent the message
export type MessageSender = 'client' | 'admin' | 'bot';

// Chat lifecycle status
export type ChatStatus = 
  | 'bot_active'    // Client is talking to the bot (hidden in admin panel)
  | 'waiting_admin' // Client requested a human (shows as "new" in admin panel)
  | 'admin_active'  // Admin replied and is conducting the dialogue
  | 'archived_bot'  // Client closed the chat while still talking to the bot
  | 'resolved';     // Admin resolved the issue and closed the chat

// --- DATA STRUCTURE ---

// Individual message within the array
export interface IMessage {
  id: string; // Unique message ID (e.g., crypto.randomUUID())
  sender: MessageSender;
  text: string;
  createdAt: Date;
}

// Main chat object (MongoDB Document)
export interface IChat {
  _id?: string | ObjectId;
  userId: string; // Client ID from NextAuth session
  status: ChatStatus;
  hasUnread: boolean; // For highlighting with a red dot in the admin panel
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}
