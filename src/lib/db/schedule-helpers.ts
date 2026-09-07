import clientPromise from "@/lib/db";
import { isValidDateKey, toDateKey } from "@/lib/db/capacity";

export type ScheduleCalendarAction =
  | "block"
  | "unblock"
  | "update_capacity"
  | "update_slots";

/** Legacy alias for the block-dates PATCH route. */
export type ScheduleBlockAction = Extract<
  ScheduleCalendarAction,
  "block" | "unblock"
>;

export type DateOverrideEntry = {
  date: Date;
  workMinutes?: number;
  isBlocked?: boolean;
  availableHours?: string[];
};

export type ModifyScheduleDatesResult = {
  success: true;
  action: ScheduleCalendarAction;
  modifiedDates: string[];
  workMinutes?: number | null;
  availableHours?: string[] | null;
};

export type ModifyScheduleDatesAudit = {
  adminUid?: string;
  reason?: string;
  tool?: string;
};

export type ModifyScheduleDatesOptions = {
  workMinutes?: number | null;
  availableHours?: string[] | null;
  audit?: ModifyScheduleDatesAudit;
};

export class ModifyScheduleDatesError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "ModifyScheduleDatesError";
  }
}

/** Matches Calgary browser local-midnight → ISO pattern used by the admin UI (MDT). */
export function dateKeyToStoredDate(dateKey: string): Date {
  return new Date(`${dateKey}T06:00:00.000Z`);
}

export function normalizeDateOverrides(raw: unknown): DateOverrideEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (entry): entry is Record<string, unknown> =>
        entry !== null && typeof entry === "object"
    )
    .map((entry) => ({
      date:
        entry.date instanceof Date
          ? entry.date
          : new Date(entry.date as string | number),
      ...(typeof entry.workMinutes === "number"
        ? { workMinutes: entry.workMinutes }
        : {}),
      ...(entry.isBlocked === true ? { isBlocked: true } : {}),
      ...(Array.isArray(entry.availableHours)
        ? { availableHours: entry.availableHours as string[] }
        : {}),
    }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()));
}

function validateDates(dates: string[]): string[] {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new ModifyScheduleDatesError("At least one date is required.", 400);
  }

  const uniqueDates = [...new Set(dates.map((date) => date.trim()))];
  const invalid = uniqueDates.filter((date) => !isValidDateKey(date));
  if (invalid.length > 0) {
    throw new ModifyScheduleDatesError(
      `Invalid date(s): ${invalid.join(", ")}. Use YYYY-MM-DD.`,
      400
    );
  }

  return uniqueDates;
}

function shouldKeepOverride(entry: DateOverrideEntry): boolean {
  if (entry.isBlocked === true) return true;
  if (typeof entry.workMinutes === "number") return true;
  if (Array.isArray(entry.availableHours) && entry.availableHours.length > 0) {
    return true;
  }
  return false;
}

function applyWorkMinutes(
  entry: DateOverrideEntry,
  workMinutes: number | null
): DateOverrideEntry {
  const next: DateOverrideEntry = { ...entry };

  if (workMinutes === null) {
    delete next.workMinutes;
  } else {
    next.workMinutes = workMinutes;
  }

  return next;
}

function applyAvailableHours(
  entry: DateOverrideEntry,
  availableHours: string[] | null
): DateOverrideEntry {
  const next: DateOverrideEntry = { ...entry };

  if (availableHours === null) {
    delete next.availableHours;
  } else {
    next.availableHours = availableHours;
  }

  return next;
}

function createOverrideEntry(
  dateKey: string,
  workMinutes?: number | null,
  availableHours?: string[] | null
): DateOverrideEntry {
  const entry: DateOverrideEntry = {
    date: dateKeyToStoredDate(dateKey),
  };

  if (typeof workMinutes === "number") {
    entry.workMinutes = workMinutes;
  }

  if (Array.isArray(availableHours)) {
    entry.availableHours = availableHours;
  }

  return entry;
}

function applyBlockUnblock(
  overrides: DateOverrideEntry[],
  dateKeys: string[],
  action: Extract<ScheduleCalendarAction, "block" | "unblock">
): DateOverrideEntry[] {
  if (action === "unblock") {
    const remove = new Set(dateKeys);
    return overrides.filter(
      (entry) => !remove.has(toDateKey(entry.date) ?? "")
    );
  }

  const next = [...overrides];

  for (const dateKey of dateKeys) {
    const simulatedDate = dateKeyToStoredDate(dateKey);
    const index = next.findIndex((entry) => toDateKey(entry.date) === dateKey);

    if (index >= 0) {
      next[index] = {
        ...next[index],
        date: simulatedDate,
        isBlocked: true,
      };
    } else {
      next.push({
        date: simulatedDate,
        isBlocked: true,
        availableHours: [],
      });
    }
  }

  return next;
}

function applyCapacityUpdate(
  overrides: DateOverrideEntry[],
  dateKeys: string[],
  workMinutes: number | null
): DateOverrideEntry[] {
  const next = [...overrides];

  for (const dateKey of dateKeys) {
    const index = next.findIndex((entry) => toDateKey(entry.date) === dateKey);

    if (index >= 0) {
      next[index] = applyWorkMinutes(next[index], workMinutes);
    } else if (workMinutes !== null) {
      next.push(createOverrideEntry(dateKey, workMinutes));
    }
  }

  return next.filter(shouldKeepOverride);
}

function applySlotsUpdate(
  overrides: DateOverrideEntry[],
  dateKeys: string[],
  availableHours: string[] | null
): DateOverrideEntry[] {
  const next = [...overrides];

  for (const dateKey of dateKeys) {
    const index = next.findIndex((entry) => toDateKey(entry.date) === dateKey);

    if (index >= 0) {
      next[index] = applyAvailableHours(next[index], availableHours);
    } else if (availableHours !== null) {
      next.push(createOverrideEntry(dateKey, undefined, availableHours));
    }
  }

  return next.filter(shouldKeepOverride);
}

function serializeOverrides(overrides: DateOverrideEntry[]) {
  return overrides.filter(shouldKeepOverride).map((entry) => {
    const serialized: DateOverrideEntry = { date: entry.date };

    if (entry.isBlocked === true) {
      serialized.isBlocked = true;
      serialized.availableHours = entry.availableHours ?? [];
    }

    if (typeof entry.workMinutes === "number") {
      serialized.workMinutes = entry.workMinutes;
    }

    if (Array.isArray(entry.availableHours) && !serialized.isBlocked) {
      serialized.availableHours = entry.availableHours;
    }

    return serialized;
  });
}

function validateActionInputs(
  action: ScheduleCalendarAction,
  options?: ModifyScheduleDatesOptions
): { workMinutes?: number | null; availableHours?: string[] | null } {
  if (action === "update_capacity") {
    if (options?.workMinutes === undefined) {
      throw new ModifyScheduleDatesError(
        "update_capacity requires workMinutes (number or null to reset).",
        400
      );
    }
    if (
      options.workMinutes !== null &&
      (!Number.isInteger(options.workMinutes) || options.workMinutes < 0)
    ) {
      throw new ModifyScheduleDatesError(
        "workMinutes must be a non-negative integer or null.",
        400
      );
    }
    return { workMinutes: options.workMinutes };
  }

  if (action === "update_slots") {
    if (options?.availableHours === undefined) {
      throw new ModifyScheduleDatesError(
        "update_slots requires availableHours (string array or null to reset).",
        400
      );
    }
    if (
      options.availableHours !== null &&
      (!Array.isArray(options.availableHours) ||
        options.availableHours.some((slot) => typeof slot !== "string"))
    ) {
      throw new ModifyScheduleDatesError(
        "availableHours must be an array of time-slot strings or null.",
        400
      );
    }
    return { availableHours: options.availableHours };
  }

  return {};
}

/**
 * Atomically update calendar overrides on the singleton `settings` document.
 */
export async function modifyScheduleDates(
  dates: string[],
  action: ScheduleCalendarAction,
  options?: ModifyScheduleDatesOptions
): Promise<ModifyScheduleDatesResult> {
  if (
    action !== "block" &&
    action !== "unblock" &&
    action !== "update_capacity" &&
    action !== "update_slots"
  ) {
    throw new ModifyScheduleDatesError("Invalid schedule action.", 400);
  }

  const uniqueDates = validateDates(dates);
  const fieldUpdates = validateActionInputs(action, options);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection("settings");

  const settings = await collection.findOne({});
  const currentOverrides = normalizeDateOverrides(settings?.dateOverrides);

  let updatedOverrides: DateOverrideEntry[];

  switch (action) {
    case "block":
    case "unblock":
      updatedOverrides = applyBlockUnblock(currentOverrides, uniqueDates, action);
      break;
    case "update_capacity":
      updatedOverrides = applyCapacityUpdate(
        currentOverrides,
        uniqueDates,
        fieldUpdates.workMinutes!
      );
      break;
    case "update_slots":
      updatedOverrides = applySlotsUpdate(
        currentOverrides,
        uniqueDates,
        fieldUpdates.availableHours!
      );
      break;
  }

  await collection.updateOne(
    {},
    {
      $set: { dateOverrides: serializeOverrides(updatedOverrides) },
      $setOnInsert: {
        leadTimeDays: 3,
        defaultWorkMinutes: 240,
        defaultAvailableHours: [],
        weekdayHours: {},
      },
    },
    { upsert: true }
  );

  const result: ModifyScheduleDatesResult = {
    success: true,
    action,
    modifiedDates: uniqueDates,
    ...(fieldUpdates.workMinutes !== undefined
      ? { workMinutes: fieldUpdates.workMinutes }
      : {}),
    ...(fieldUpdates.availableHours !== undefined
      ? { availableHours: fieldUpdates.availableHours }
      : {}),
  };

  const audit = options?.audit;
  const auditAdminUid = audit?.adminUid?.trim();
  if (auditAdminUid && auditAdminUid !== "unknown-admin") {
    await db.collection("ai_action_log").insertOne({
      adminUid: auditAdminUid,
      tool: audit?.tool ?? "manageCalendar",
      input: {
        action,
        dates: uniqueDates,
        reason: audit?.reason,
        ...(fieldUpdates.workMinutes !== undefined
          ? { workMinutes: fieldUpdates.workMinutes }
          : {}),
        ...(fieldUpdates.availableHours !== undefined
          ? { availableHours: fieldUpdates.availableHours }
          : {}),
      },
      output: result,
      approvedAt: new Date(),
      targetCollection: "settings",
      targetId: settings?._id?.toString() ?? "singleton",
      createdAt: new Date(),
    });
  }

  return result;
}
