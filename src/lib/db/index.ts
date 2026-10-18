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
// Tuned for Vercel functions, which are frozen between invocations: no background
// pool maintenance across freezes, idle sockets dropped before they go stale, and a
// server-selection window long enough for a full TLS/SCRAM re-handshake to Atlas.
const options = {
  maxPoolSize: 10,                  // Fluid compute: several concurrent requests per instance
  minPoolSize: 0,
  maxIdleTimeMS: 60_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
  serverSelectionTimeoutMS: 10_000, // Must stay below MONGO_OPERATION_DEADLINE_MS
  // Cap pool checkout waits — default 0 waits forever and caused 300s Vercel timeouts
  waitQueueTimeoutMS: MONGO_WAIT_QUEUE_TIMEOUT_MS,
};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(uri, options);
  const promise = client.connect();
  promise.catch((err) => {
    console.error('[MongoDB] Connection failed, resetting client:', err);
    // Only reset if a newer client has not already replaced this one.
    if (globalWithMongo._mongoClientPromise === promise) {
      globalWithMongo._mongoClientPromise = undefined;
    }
    client.close().catch(() => {});
  });
  return promise;
}

/** Live client promise; recreated lazily after a failed connect. */
export function getClientPromise(): Promise<MongoClient> {
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = createClientPromise();
  }
  return globalWithMongo._mongoClientPromise;
}

// Default export stays awaitable for existing `await clientPromise` call sites, but
// resolves the *current* client on every await instead of replaying a rejected promise.
const clientPromise: Promise<MongoClient> = {
  then: (onFulfilled, onRejected) => getClientPromise().then(onFulfilled, onRejected),
  catch: (onRejected) => getClientPromise().catch(onRejected),
  finally: (onFinally) => getClientPromise().finally(onFinally),
  [Symbol.toStringTag]: 'Promise',
};

/**
 * Acquire the shared MongoClient under a per-call deadline.
 * Prefer withMongoClient / withMongoRetry for query work so the whole
 * acquire+query path is bounded, not only connect().
 */
export function getMongoClient(): Promise<MongoClient> {
  return promiseWithTimeout(
    getClientPromise(),
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
      const client = await getClientPromise();
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
    const client = await getClientPromise();
    return client.db(process.env.MONGODB_DB_NAME).collection<IGalleryImage>("gallery_images");
  });
}

export { withMongoDeadline, MONGO_OPERATION_DEADLINE_MS, MONGO_WAIT_QUEUE_TIMEOUT_MS };
export default clientPromise;
