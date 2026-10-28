/** One coast. Long enough for a slow gauge, far inside the 300s function limit. */
export const COAST_DEADLINE_MS = 45_000;

export class DeadlineError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "DeadlineError";
  }
}

/** Stop waiting. The inner promise is observed so a late rejection is not a runtime error. */
export function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(label, ms)), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Abort the underlying call and also stop waiting if abort is ignored.
 * Blob's client uses undici directly, whose default header timeout is 300s.
 */
export function withAbortDeadline<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const kill = setTimeout(() => controller.abort(), ms);
  let extra: ReturnType<typeof setTimeout> | undefined;
  const pending = run(controller.signal);
  pending.catch(() => {});
  return Promise.race([
    pending,
    new Promise<T>((_, reject) => {
      extra = setTimeout(() => {
        controller.abort();
        reject(new DeadlineError("upstream", ms));
      }, ms + 250);
    }),
  ]).finally(() => {
    clearTimeout(kill);
    clearTimeout(extra);
  });
}
