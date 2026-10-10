import { get, put, del } from "@vercel/blob";
import type { Briefing, CalendarDay } from "@/lib/types";

/**
 * One morning record per deployment environment, area, activity, local date,
 * and local hour. Preview and development never read or write production's
 * blobs. The card page, the card image (a shot of that page), /api/tweets,
 * and /api/briefing all read this record. It lives in Vercel Blob so separate
 * serverless invocations and regions see the same bytes. The first writer
 * wins; everyone else re-reads that record instead of keeping their own compute.
 */
export type MorningSnapshot = {
  v: 1;
  briefing: Briefing;
  yolo: CalendarDay | null;
};

/**
 * Current month and the next one, in the area's timezone. /calendar, the
 * calendar card, /api/tweets calendars, and the morning line's best dry day
 * all read this record. A separate key from the morning snapshot.
 */
export type CalendarMonthSnapshot = {
  year: number;
  month: number;
  label: string;
  days: CalendarDay[];
};

export type CalendarSnapshot = {
  v: 1;
  months: CalendarMonthSnapshot[];
};

export type SnapshotStore<T = MorningSnapshot> = {
  read(key: string): Promise<T | null>;
  /** Leave an existing record in place. */
  create(key: string, value: T): Promise<"created" | "exists">;
  retire?(key: string): Promise<void>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSnapshot(value: unknown): value is MorningSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as MorningSnapshot;
  return row.v === 1 && !!row.briefing && typeof row.briefing.overall === "number";
}

/** Vercel sets VERCEL_ENV to production, preview, or development. */
export function snapshotEnv(raw = process.env.VERCEL_ENV) {
  const env = (raw || "development").toLowerCase();
  return /^[a-z0-9-]+$/.test(env) ? env : "development";
}

export function snapshotKey(
  areaId: string,
  activity: string,
  dateYmd: string,
  hourKey: string,
  env = snapshotEnv(),
) {
  return `morning/v1/${snapshotEnv(env)}/${areaId}/${activity}/${dateYmd}/${hourKey}.json`;
}

export function calendarSnapshotKey(
  areaId: string,
  activity: string,
  dateYmd: string,
  hourKey: string,
  env = snapshotEnv(),
) {
  return `calendar/v1/${snapshotEnv(env)}/${areaId}/${activity}/${dateYmd}/${hourKey}.json`;
}

export function memorySnapshotStore<T = MorningSnapshot>(): SnapshotStore<T> {
  const rows = new Map<string, T>();
  return {
    async read(key) {
      const hit = rows.get(key);
      return hit ? clone(hit) : null;
    },
    async create(key, value) {
      if (rows.has(key)) return "exists";
      rows.set(key, clone(value));
      return "created";
    },
    async retire(key) {
      rows.delete(key);
    },
  };
}

function blobReadOptions() {
  return {
    access: "private" as const,
    useCache: false,
    // A fresh signal skips Next's per-request fetch dedupe if the SDK ever
    // calls the patched global fetch. @vercel/blob currently uses undici.
    abortSignal: new AbortController().signal,
  };
}

/**
 * Per-instance memory in front of Blob. Keys are hour-scoped and first-writer
 * wins, so a record never changes once read; caching it saves a Blob read on
 * every later request in the same instance (the 429 source on 10/10/26).
 */
const MEMO_MAX = 500;
const memo = new Map<string, unknown>();
function remember(key: string, value: unknown) {
  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(key, value);
}

/** True for a Blob rate-limit or quota error. */
export function isBlobThrottle(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /429|too many requests|rate limit|quota/i.test(msg);
}

function blobJsonStore<T>(isValue: (value: unknown) => value is T): SnapshotStore<T> {
  return {
    async read(key) {
      if (memo.has(key)) return clone(memo.get(key) as T);
      const result = await get(key, blobReadOptions());
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      try {
        const text = await new Response(result.stream).text();
        const parsed: unknown = JSON.parse(text);
        if (!isValue(parsed)) return null;
        remember(key, parsed);
        return clone(parsed);
      } catch {
        return null;
      }
    },
    async create(key, value) {
      try {
        await put(key, JSON.stringify(value), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
          cacheControlMaxAge: 60 * 60 * 24,
          abortSignal: new AbortController().signal,
        });
        return "created";
      } catch (error) {
        const stored = await get(key, blobReadOptions()).catch(() => null);
        if (stored && stored.statusCode === 200) return "exists";
        throw error;
      }
    },
    async retire(key) {
      memo.delete(key);
      await del(key).catch(() => undefined);
    },
  };
}

function blobSnapshotStore(): SnapshotStore {
  return blobJsonStore(isSnapshot);
}

function isCalendarMonth(value: unknown): value is CalendarMonthSnapshot {
  if (!value || typeof value !== "object") return false;
  const month = value as CalendarMonthSnapshot;
  return (
    typeof month.year === "number" &&
    typeof month.month === "number" &&
    typeof month.label === "string" &&
    Array.isArray(month.days)
  );
}

function isCalendarSnapshot(value: unknown): value is CalendarSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as CalendarSnapshot;
  return row.v === 1 && Array.isArray(row.months) && row.months.length >= 2 && row.months.every(isCalendarMonth);
}

let resolved: SnapshotStore | null = null;
let calendarResolved: SnapshotStore<CalendarSnapshot> | null = null;

export function snapshotStore(): SnapshotStore {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Morning snapshot store is not configured");
  }
  if (!resolved) {
    resolved = process.env.BLOB_READ_WRITE_TOKEN ? blobSnapshotStore() : memorySnapshotStore();
  }
  return resolved;
}

export function calendarSnapshotStore(): SnapshotStore<CalendarSnapshot> {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Calendar snapshot store is not configured");
  }
  if (!calendarResolved) {
    calendarResolved = process.env.BLOB_READ_WRITE_TOKEN
      ? blobJsonStore(isCalendarSnapshot)
      : memorySnapshotStore<CalendarSnapshot>();
  }
  return calendarResolved;
}

/** True when the current month has at least one day with a forecast wind. */
export function calendarHasForecastWind(snap: CalendarSnapshot) {
  return (snap.months[0]?.days ?? []).some((day) => day.windMph != null);
}

/** Best dry day is the current month's outlined day. The next month is not a candidate. */
export function calendarSnapshotYolo(snap: CalendarSnapshot): CalendarDay | null {
  return snap.months[0]?.days.find((day) => day.yolo) ?? null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function windInSnapshot(snap: MorningSnapshot) {
  const weather = snap.briefing.conditions.weather;
  return snap.briefing.kind !== "today" || weather.windMph != null;
}

/**
 * Read the stored hour. On a miss, compute, write only if the key is still
 * empty, then return whatever is stored so two callers cannot each keep
 * their own result.
 */
export async function readOrCreate(
  store: SnapshotStore,
  key: string,
  compute: () => Promise<MorningSnapshot>,
  retireKey?: string,
): Promise<MorningSnapshot> {
  let hit: MorningSnapshot | null;
  try {
    hit = await store.read(key);
  } catch (error) {
    if (!isBlobThrottle(error)) throw error;
    // Blob is throttled: serve a fresh compute rather than skipping the desk.
    return clone(await compute());
  }
  if (hit) return hit;

  const fresh = clone(await compute());
  if (!windInSnapshot(fresh)) {
    const raced = await store.read(key).catch(() => null);
    return raced ?? fresh;
  }

  try {
    await store.create(key, fresh);
  } catch (error) {
    if (isBlobThrottle(error)) return fresh;
    throw error;
  }
  if (retireKey && retireKey !== key) void store.retire?.(retireKey);

  for (let attempt = 0; attempt < 8; attempt++) {
    const stored = await store.read(key).catch((error) => {
      if (isBlobThrottle(error)) return fresh;
      throw error;
    });
    if (stored) return stored;
    await sleep(40 * (attempt + 1));
  }
  throw new Error("Morning snapshot was not readable after write");
}

/**
 * Same first-writer rule as the morning record. A current month with no
 * forecast wind is returned and not stored, so a later caller can fill the hour.
 */
export async function readOrCreateCalendar(
  store: SnapshotStore<CalendarSnapshot>,
  key: string,
  compute: () => Promise<CalendarSnapshot>,
): Promise<CalendarSnapshot> {
  let hit: CalendarSnapshot | null;
  try {
    hit = await store.read(key);
  } catch (error) {
    if (!isBlobThrottle(error)) throw error;
    // Blob is throttled: serve a fresh compute rather than skipping the calendar.
    return clone(await compute());
  }
  if (hit) return hit;

  const fresh = clone(await compute());
  if (!calendarHasForecastWind(fresh)) {
    const raced = await store.read(key).catch(() => null);
    return raced ?? fresh;
  }

  try {
    await store.create(key, fresh);
  } catch (error) {
    if (isBlobThrottle(error)) return fresh;
    throw error;
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const stored = await store.read(key).catch((error) => {
      if (isBlobThrottle(error)) return fresh;
      throw error;
    });
    if (stored) return stored;
    await sleep(40 * (attempt + 1));
  }
  throw new Error("Calendar snapshot was not readable after write");
}
