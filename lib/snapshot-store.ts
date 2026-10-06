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

export type SnapshotStore = {
  read(key: string): Promise<MorningSnapshot | null>;
  /** Leave an existing record in place. */
  create(key: string, value: MorningSnapshot): Promise<"created" | "exists">;
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

export function memorySnapshotStore(): SnapshotStore {
  const rows = new Map<string, MorningSnapshot>();
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

function blobSnapshotStore(): SnapshotStore {
  return {
    async read(key) {
      const result = await get(key, blobReadOptions());
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      try {
        const text = await new Response(result.stream).text();
        const parsed: unknown = JSON.parse(text);
        return isSnapshot(parsed) ? parsed : null;
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
      await del(key).catch(() => undefined);
    },
  };
}

let resolved: SnapshotStore | null = null;

export function snapshotStore(): SnapshotStore {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Morning snapshot store is not configured");
  }
  if (!resolved) {
    resolved = process.env.BLOB_READ_WRITE_TOKEN ? blobSnapshotStore() : memorySnapshotStore();
  }
  return resolved;
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
  const hit = await store.read(key);
  if (hit) return hit;

  const fresh = clone(await compute());
  if (!windInSnapshot(fresh)) {
    const raced = await store.read(key);
    return raced ?? fresh;
  }

  await store.create(key, fresh);
  if (retireKey && retireKey !== key) void store.retire?.(retireKey);

  for (let attempt = 0; attempt < 8; attempt++) {
    const stored = await store.read(key);
    if (stored) return stored;
    await sleep(40 * (attempt + 1));
  }
  throw new Error("Morning snapshot was not readable after write");
}
