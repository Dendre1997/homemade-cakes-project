import {
  MongoDeadlineError,
  MONGO_OPERATION_DEADLINE_MS,
  withMongoDeadline,
} from "@/lib/db/mongoTimeout";

const RETRY_DELAYS_MS = [100, 300, 900] as const;
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

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

async function runWithRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

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
