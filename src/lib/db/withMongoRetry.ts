const RETRY_DELAYS_MS = [100, 300, 900] as const;
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMongoTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { name?: string; message?: string };
  const name = err.name ?? "";
  const message = err.message ?? "";

  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoTimeoutError" ||
    name === "MongoPoolClearedError" ||
    message.includes("Server selection timed out") ||
    message.includes("connection pool")
  );
}

/**
 * Thrown after retry attempts are exhausted for transient MongoDB errors.
 * Pages can catch this to render fallback UI instead of a raw 500.
 */
export class MongoUnavailableError extends Error {
  readonly cause?: unknown;

  constructor(cause?: unknown) {
    super("Database temporarily unavailable. Please try again shortly.");
    this.name = "MongoUnavailableError";
    this.cause = cause;
  }
}

/**
 * Runs a MongoDB query with exponential backoff on transient connection errors.
 * Happy path: single attempt, zero added latency.
 */
export async function withMongoRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isMongoTransientError(error) || attempt === MAX_ATTEMPTS - 1) {
        if (isMongoTransientError(error)) {
          console.error(
            `[MongoDB] Transient error after ${MAX_ATTEMPTS} attempts:`,
            error
          );
          throw new MongoUnavailableError(error);
        }
        throw error;
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      console.warn(
        `[MongoDB] Transient error (attempt ${attempt + 1}/${MAX_ATTEMPTS}), retrying in ${delayMs}ms:`,
        error
      );
      await delay(delayMs);
    }
  }

  throw new MongoUnavailableError(lastError);
}
