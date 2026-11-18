import { AsyncLocalStorage } from "node:async_hooks";
import { Agent } from "undici";

/** Past mornings and past letters cache upstream reads for 30 days. */
export const HISTORICAL_REVALIDATE = 2592000;

const historicalFetch = new AsyncLocalStorage<number>();

/**
 * Run `fn` so `fetchExternal` uses `next: { revalidate }` instead of `cache: "no-store"`.
 * A no-store fetch during render forces the page to `Cache-Control: private, no-store`,
 * which the CDN will not keep.
 */
export function withFetchRevalidate<T>(seconds: number, fn: () => Promise<T>): Promise<T> {
  return historicalFetch.run(seconds, fn);
}

export function withHistoricalFetches<T>(fn: () => Promise<T>): Promise<T> {
  return withFetchRevalidate(HISTORICAL_REVALIDATE, fn);
}

export function fetchCacheFields(explicit?: RequestCache): { cache?: RequestCache; revalidate?: number } {
  const historical = historicalFetch.getStore();
  if (historical != null) return { revalidate: historical };
  return { cache: explicit ?? "no-store" };
}

/**
 * Undici's default header timeout is 300 seconds. Next's patched fetch drops
 * AbortSignal on a stale `revalidate` refetch and then waits for that refetch
 * before the invocation can finish, so a quiet upstream runs out the clock.
 * A dispatcher timeout applies even when the signal is missing.
 */
const agents = new Map<number, Agent>();

let timeoutScale = 1;

/** Tests shrink every deadline. Production stays at 1. */
export function setExternalTimeoutScaleForTests(scale: number) {
  timeoutScale = scale;
}

function scaled(ms: number) {
  return Math.max(50, Math.round(ms * timeoutScale));
}

/** Same clock as fetch deadlines. Production scale is 1. */
export function scaledExternalMs(ms: number) {
  return scaled(ms);
}

function agentFor(ms: number) {
  const existing = agents.get(ms);
  if (existing) return existing;
  const agent = new Agent({
    connectTimeout: ms,
    headersTimeout: ms,
    bodyTimeout: ms,
  });
  agents.set(ms, agent);
  return agent;
}

export class UpstreamTimeout extends Error {
  constructor(ms: number) {
    super(`upstream timed out after ${ms}ms`);
    this.name = "UpstreamTimeout";
  }
}

function isTimeout(error: unknown) {
  if (error instanceof UpstreamTimeout) return true;
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

export async function fetchExternal(
  url: string | URL,
  init: {
    method?: string;
    headers?: HeadersInit;
    body?: string;
    timeoutMs: number;
    cache?: RequestCache;
  },
): Promise<Response> {
  const timeoutMs = scaled(init.timeoutMs);
  const controller = new AbortController();
  const kill = setTimeout(() => controller.abort(), timeoutMs);
  let extra: ReturnType<typeof setTimeout> | undefined;
  const fields = fetchCacheFields(init.cache);
  const requestInit: RequestInit & { next?: { revalidate: number }; dispatcher: Agent } = {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: controller.signal,
    dispatcher: agentFor(timeoutMs),
  };
  if (fields.revalidate != null) requestInit.next = { revalidate: fields.revalidate };
  else requestInit.cache = fields.cache;
  const request = globalThis.fetch(url, requestInit);
  try {
    return await Promise.race([
      request,
      new Promise<Response>((_, reject) => {
        extra = setTimeout(() => reject(new UpstreamTimeout(timeoutMs)), timeoutMs + 200);
      }),
    ]);
  } catch (error) {
    if (isTimeout(error) || controller.signal.aborted) throw new UpstreamTimeout(timeoutMs);
    throw error;
  } finally {
    clearTimeout(kill);
    clearTimeout(extra);
    // The deadline can win before undici rejects. Observe that rejection so it
    // does not surface later as an unhandled "fetch failed".
    request.catch(() => {});
  }
}
