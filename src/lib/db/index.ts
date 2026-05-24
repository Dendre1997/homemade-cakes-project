import { MongoClient, Collection } from 'mongodb';
import { IGalleryImage } from '@/types';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing Environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,           // Keep pool size small in serverless
  minPoolSize: 0,            // Allow idle connections to close
  connectTimeoutMS: 15000,   // Prevent timing out on cold starts
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 15000,
  maxIdleTimeMS: 10000,      // Terminate idle connections quickly
};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Attach a dummy catch to prevent Unhandled Promise Rejection crashes 
// if the connection fails before it's explicitly awaited.
clientPromise.catch(console.error);


/**
 * Type-safe helper to get the gallery_images collection
 */
export async function getGalleryCollection(): Promise<Collection<IGalleryImage>> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME).collection<IGalleryImage>("gallery_images");
}

export default clientPromise;
