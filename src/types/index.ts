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
  category: {
    _id: string;
    name: string;
  };
}