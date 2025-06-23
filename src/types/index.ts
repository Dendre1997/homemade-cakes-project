import { ObjectId } from "mongodb";

export interface Flavors {
    _id: ObjectId;
    name: string;
    price: number;
    description?: string;
}

export interface Decorations {
    _id: ObjectId;
    name: string;
    price: number;
    imageUrl?: string; 
}

export interface Allergen {
    _id: ObjectId;
    name: string;
}