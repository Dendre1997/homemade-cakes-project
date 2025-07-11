import { ObjectId } from 'mongodb';

export interface Flavor {
  _id: ObjectId;
  name: string;
  price: number;
  description?: string;
}

export interface Decoration {
  _id: ObjectId;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface Allergen {
  _id: ObjectId;
  name: string;
}

export interface Diameter {
  _id: ObjectId;
  sizeValue: number;
  unit: string;
}

export interface AvailableDiameterConfig {
  diameterId: ObjectId;
  multiplier: number;
}

export interface Product {
  _id: ObjectId;
  name: string;
  description: string;
  imageUrls: string[];

  structureBasePrice: number;
  availableFlavorIds: ObjectId[];
  availableDiameterConfigs: AvailableDiameterConfig[];
  allergenIds: ObjectId[];

  isActive: boolean;
}
