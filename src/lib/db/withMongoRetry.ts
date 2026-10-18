import {
  MongoDeadlineError,
  MONGO_OPERATION_DEADLINE_MS,
  withMongoDeadline,
} from "@/lib/db/mongoTimeout";

// The driver already retries reads/writes once on network errors (retryReads/retryWrites),
// so one app-level retry is enough to cover a client reset after a failed connect.
const RETRY_DELAYS_MS = [500] as const;
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
// A retry only makes sense if a full server-selection window still fits in the deadline.
const MIN_BUDGET_FOR_RETRY_MS = 10_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isMongoTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { name?: string; message?: string };
  const name = err.name ?? "";
  const message = err.message ?? "";

  return (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTimeoutError" ||
    name === "MongoPoolClearedError" ||
    name === "WaitQueueTimeoutError" ||
    name === "MongoWaitQueueTimeoutError" ||
    name === "MongoOperationTimeoutError" ||
    name === "MongoDeadlineError" ||
    message.includes("Server selection timed out") ||
    message.includes("connection pool") ||
    message.includes("Timed out while checking out a connection")
  );
}

/**
 * Thrown after retry attempts are exhausted for transient MongoDB errors,
 * or when an operation hits the hard app-level deadline.
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
 * Pool-queue timeouts mean the pool is already starved; re-queueing only adds load.
 * They are still transient (mapped to MongoUnavailableError), just never retried.
 */
function isRetryableMongoError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  const message = (error as { message?: string } | null)?.message ?? "";
  if (
    name === "MongoWaitQueueTimeoutError" ||
    name === "WaitQueueTimeoutError" ||
    message.includes("Timed out while checking out a connection")
  ) {
    return false;
  }
  return isMongoTransientError(error);
}

async function runWithRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  const startedAt = Date.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Deadline exhausted — do not burn remaining budget on further retries.
      if (error instanceof MongoDeadlineError) {
        console.error(`[MongoDB] Operation deadline exceeded:`, error);
        throw new MongoUnavailableError(error);
      }

      if (!isMongoTransientError(error)) {
        throw error;
      }

      const remainingMs = MONGO_OPERATION_DEADLINE_MS - (Date.now() - startedAt);
      const canRetry =
        attempt < MAX_ATTEMPTS - 1 &&
        isRetryableMongoError(error) &&
        remainingMs - RETRY_DELAYS_MS[attempt] >= MIN_BUDGET_FOR_RETRY_MS;

      if (!canRetry) {
        console.error(
          `[MongoDB] Transient error, giving up after ${attempt + 1} attempt(s):`,
          error
        );
        throw new MongoUnavailableError(error);
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

/**
 * Runs a MongoDB query with exponential backoff on transient connection errors.
 * Entire retry sequence is capped by MONGO_OPERATION_DEADLINE_MS (~15s).
 * Happy path: single attempt, zero added latency beyond the query itself.
 */
export async function withMongoRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await withMongoDeadline(
      () => runWithRetries(operation),
      MONGO_OPERATION_DEADLINE_MS
    );
  } catch (error) {
    if (error instanceof MongoDeadlineError) {
      console.error(`[MongoDB] Retry budget exceeded:`, error);
      throw new MongoUnavailableError(error);
    }
    throw error;
  }
}
