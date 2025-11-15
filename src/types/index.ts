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
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  manufacturingTimeInMinutes?: number;
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


// Order Types
export interface CartItem {
  id: string;
  productId: string;
  categoryId: string;
  name: string;
  flavor: string;
  diameterId: string;
  price: number;
  quantity: number;
  imageUrl: string;
  inscription?: string;
  
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
  createdAt: Date;
}
export interface OrderItem {
  id: string;
  productId: ObjectId;
  categoryId: ObjectId;
  name: string;
  flavor: string;
  diameterId: ObjectId;
  price: number;
  quantity: number;
  imageUrl: string;
  inscription?: string;
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

