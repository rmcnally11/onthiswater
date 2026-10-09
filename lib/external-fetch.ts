import { Agent } from "undici";

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
  const request = globalThis.fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    cache: init.cache ?? "no-store",
    signal: controller.signal,
    dispatcher: agentFor(timeoutMs),
  } as RequestInit);
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
