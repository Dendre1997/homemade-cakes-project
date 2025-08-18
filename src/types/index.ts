import { ObjectId } from 'mongodb';

export interface Flavor {
  _id: ObjectId;
  name: string;
  price: number;
  description?: string;
  categoryIds?: string[];
}

export interface Decoration {
  _id: ObjectId;
  name: string;
  price: number;
  imageUrl?: string;
  categoryIds?: string[];
}

export interface Allergen {
  _id: ObjectId;
  name: string;
}

export interface Diameter {
  _id: ObjectId;
  name: string;
  sizeValue: number;
  categoryIds?: string[];
}

export interface AvailableDiameterConfig {
  diameterId: string;
  multiplier: number;
}

export interface Product {
  _id: ObjectId;
  name: string;
  description: string;
  imageUrls: string[];
  categoryId: ObjectId;
  structureBasePrice: number;
  availableFlavorIds: ObjectId[];
  availableDiameterConfigs: AvailableDiameterConfig[];
  allergenIds: ObjectId[];
  isActive: boolean;
  // defaultFlavorId?: ObjectId;
  // defaultDiameterId?: ObjectId;
}

export interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  structureBasePrice: number;
  isActive: boolean;
  availableFlavorIds: string[]
  allergenIds: string[];
  availableDiameterConfigs: { diameterId: string; multiplier: number }[];
  imageUrls: string[];
}

export interface ProductCategory {
  _id: ObjectId;
  name: string;
}

export interface ProductWithCategory extends Product {
  category: ProductCategory;
  availableFlavors: Flavor[];
  availableDiameters: Diameter[];
}

export interface OrderItem {
  id: string;
  productId: ObjectId;
  name: string;
  flavor: string;
  diameterId: ObjectId;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  _id: ObjectId;
  customerId?: ObjectId;
  items: OrderItem[];
  totalAmount: number;
  
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  deliveryInfo: {
    method: "pickup" | "delivery";
    address?: string;
    deliveryDate: Date;
  };
  status: "new" | "paid" | "In nprogress" | "ready" | "delivered" | "cancelled";
  paymentDetails?: {
    transactionId: string;
    status: string;
  };
  createdAt: Date;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  _id: ObjectId;
  firebaseUid: string; // ID from Firebase Authentication
  email: string;
  role: "customer" | "admin";
  name?: {
    first?: string;
    last?: string;
  };
  phone?: string;
  addresses?: Address[];
}