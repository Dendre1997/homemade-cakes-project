import { MongoClient, Collection } from 'mongodb';
import { IGalleryImage } from '@/types';
import {
  withMongoRetry,
  MongoUnavailableError,
  isMongoTransientError,
} from '@/lib/db/withMongoRetry';
import {
  MongoDeadlineError,
  MONGO_OPERATION_DEADLINE_MS,
  MONGO_WAIT_QUEUE_TIMEOUT_MS,
  promiseWithTimeout,
  withMongoDeadline,
} from '@/lib/db/mongoTimeout';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing Environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 3,            // Shared Atlas tier: limit per serverless instance
  minPoolSize: 0,            // Allow idle connections to close
  connectTimeoutMS: 15000,   // Prevent timing out on cold starts
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  maxIdleTimeMS: 10000,      // Terminate idle connections quickly
  // Cap pool checkout waits — default 0 waits forever and caused 300s Vercel timeouts
  waitQueueTimeoutMS: MONGO_WAIT_QUEUE_TIMEOUT_MS,
};

let clientPromise: Promise<MongoClient>;

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  const promise = client.connect();
  // Clear cache on failure so the next request creates a fresh connection
  promise.catch((err) => {
    console.error('[MongoDB] Connection failed, clearing cache:', err);
    globalWithMongo._mongoClientPromise = undefined;
  });
  globalWithMongo._mongoClientPromise = promise;
}
clientPromise = globalWithMongo._mongoClientPromise!;

/**
 * Acquire the shared MongoClient under a per-call deadline.
 * Prefer withMongoClient / withMongoRetry for query work so the whole
 * acquire+query path is bounded, not only connect().
 */
export function getMongoClient(): Promise<MongoClient> {
  return promiseWithTimeout(
    clientPromise,
    MONGO_OPERATION_DEADLINE_MS,
    `MongoDB client acquire timed out after ${MONGO_OPERATION_DEADLINE_MS}ms`
  );
}

/**
 * Run work against the shared client under a hard operation deadline (~15s).
 * Use this for call sites that do not go through withMongoRetry.
 * Deadline expiry surfaces as MongoUnavailableError for consistent fallbacks.
 */
export async function withMongoClient<T>(
  operation: (client: MongoClient) => Promise<T>
): Promise<T> {
  try {
    return await withMongoDeadline(async () => {
      const client = await clientPromise;
      return operation(client);
    }, MONGO_OPERATION_DEADLINE_MS);
  } catch (error) {
    if (error instanceof MongoDeadlineError || isMongoTransientError(error)) {
      console.error('[MongoDB] Client operation failed fast:', error);
      throw new MongoUnavailableError(error);
    }
    throw error;
  }
}

/**
 * Type-safe helper to get the gallery_images collection
 */
export async function getGalleryCollection(): Promise<Collection<IGalleryImage>> {
  return withMongoRetry(async () => {
    const client = await clientPromise;
    return client.db(process.env.MONGODB_DB_NAME).collection<IGalleryImage>("gallery_images");
  });
}

export { withMongoDeadline, MONGO_OPERATION_DEADLINE_MS, MONGO_WAIT_QUEUE_TIMEOUT_MS };
export default clientPromise;
