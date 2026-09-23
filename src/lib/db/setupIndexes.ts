import type { Db, IndexDirection } from "mongodb";
import clientPromise from "@/lib/db";

interface IndexDefinition {
  /** Explicit name keeps re-runs idempotent and makes conflicts diagnosable. */
  name: string;
  key: Record<string, IndexDirection>;
  unique?: boolean;
}

export type IndexSetupStatus = "created" | "exists" | "conflict" | "failed";

export interface IndexSetupResult {
  collection: string;
  index: string;
  status: IndexSetupStatus;
  error?: string;
}

export interface IndexSetupReport {
  ok: boolean;
  durationMs: number;
  created: number;
  existing: number;
  failed: number;
  results: IndexSetupResult[];
}

/**
 * Indexes required by the admin dashboard and the upcoming Baker AI tools.
 * Every collection scan these replace was previously a full COLLSCAN.
 */
const INDEX_PLAN: Record<string, IndexDefinition[]> = {
  orders: [
    {
      name: "deliveryInfo_deliveryDates_date_1",
      key: { "deliveryInfo.deliveryDates.date": 1 },
    },
    { name: "status_1", key: { status: 1 } },
    { name: "isPaid_1", key: { isPaid: 1 } },
    { name: "createdAt_-1", key: { createdAt: -1 } },
    {
      name: "customerInfo_phoneDigits_1",
      key: { "customerInfo.phoneDigits": 1 },
    },
    { name: "customerInfo_email_1", key: { "customerInfo.email": 1 } },
  ],
  custom_orders: [
    { name: "status_1", key: { status: 1 } },
    { name: "date_1", key: { date: 1 } },
    { name: "contact_phoneDigits_1", key: { "contact.phoneDigits": 1 } },
    { name: "contact_email_1", key: { "contact.email": 1 } },
  ],
  ai_action_log: [
    {
      name: "adminUid_1_createdAt_-1",
      key: { adminUid: 1, createdAt: -1 },
    },
  ],
  recipes: [
    { name: "slug_1", key: { slug: 1 }, unique: true },
    { name: "flavorId_1", key: { flavorId: 1 } },
    { name: "isActive_1", key: { isActive: 1 } },
  ],
};

/** IndexOptionsConflict / IndexKeySpecsConflict — same name, different definition. */
const INDEX_CONFLICT_CODES = new Set([85, 86]);

function getErrorCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function createIndexSafely(
  db: Db,
  collection: string,
  definition: IndexDefinition,
  existingNames: Set<string>
): Promise<IndexSetupResult> {
  if (existingNames.has(definition.name)) {
    return { collection, index: definition.name, status: "exists" };
  }

  try {
    await db.collection(collection).createIndex(definition.key, {
      name: definition.name,
      background: true,
      ...(definition.unique ? { unique: true } : {}),
    });

    return { collection, index: definition.name, status: "created" };
  } catch (error) {
    const code = getErrorCode(error);

    // A concurrent run or a pre-existing equivalent index is not a failure.
    if (code !== undefined && INDEX_CONFLICT_CODES.has(code)) {
      return {
        collection,
        index: definition.name,
        status: "conflict",
        error: getErrorMessage(error),
      };
    }

    return {
      collection,
      index: definition.name,
      status: "failed",
      error: getErrorMessage(error),
    };
  }
}

/**
 * Creates every index in INDEX_PLAN. Safe to run repeatedly: existing indexes
 * are detected up front and conflicts are reported rather than thrown, so a
 * partial failure never blocks the remaining collections.
 */
export async function setupDatabaseIndexes(): Promise<IndexSetupReport> {
  const startedAt = Date.now();
  const results: IndexSetupResult[] = [];

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);

  for (const [collection, definitions] of Object.entries(INDEX_PLAN)) {
    let existingNames = new Set<string>();

    try {
      const existing = await db.collection(collection).indexes();
      existingNames = new Set(
        existing.map((index) => index.name).filter(Boolean) as string[]
      );
    } catch (error) {
      // Collection may not exist yet — createIndex will create it.
      console.warn(
        `[setupIndexes] Could not list indexes for "${collection}":`,
        getErrorMessage(error)
      );
    }

    for (const definition of definitions) {
      results.push(
        await createIndexSafely(db, collection, definition, existingNames)
      );
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const existing = results.filter(
    (r) => r.status === "exists" || r.status === "conflict"
  ).length;
  const failed = results.filter((r) => r.status === "failed").length;

  const report: IndexSetupReport = {
    ok: failed === 0,
    durationMs: Date.now() - startedAt,
    created,
    existing,
    failed,
    results,
  };

  console.log(
    `[setupIndexes] created=${created} existing=${existing} failed=${failed} in ${report.durationMs}ms`
  );

  return report;
}
