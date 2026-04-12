import { MongoClient, Collection } from 'mongodb';
import { IGalleryImage } from '@/types';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing Enviroment variable: "MONGODB_URL" ');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Type-safe helper to get the gallery_images collection
 */
export async function getGalleryCollection(): Promise<Collection<IGalleryImage>> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME).collection<IGalleryImage>("gallery_images");
}

export default clientPromise;
