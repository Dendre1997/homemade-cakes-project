/**
 * Hard deadlines for MongoDB work so serverless requests never hang to Vercel's ~300s limit.
 *
 * waitQueueTimeoutMS (driver) caps pool checkout waits.
 * MONGO_OPERATION_DEADLINE_MS caps app-level Promise.race around acquire + query work,
 * leaving a little headroom under typical Vercel limits while still failing fast.
 */
export const MONGO_WAIT_QUEUE_TIMEOUT_MS = 10_000;
export const MONGO_OPERATION_DEADLINE_MS = 15_000;

export class MongoDeadlineError extends Error {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "MongoDeadlineError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Race a promise against a timer. Clears the timer when the promise settles.
 * Does not cancel the underlying work (driver has no AbortSignal on most ops).
 */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = `Operation timed out after ${ms}ms`
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new MongoDeadlineError(message, ms));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Run an async Mongo-backed operation under a hard deadline.
 */
export async function withMongoDeadline<T>(
  operation: () => Promise<T>,
  ms: number = MONGO_OPERATION_DEADLINE_MS
): Promise<T> {
  return promiseWithTimeout(
    operation(),
    ms,
    `MongoDB operation timed out after ${ms}ms`
  );
}
