import { createHash } from "node:crypto";
import { fetchExternal } from "@/lib/external-fetch";

/** Resend accepts at most this many emails in one batch request. */
export const RESEND_BATCH_LIMIT = 100;

export type BatchMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stable for subscriber + Chicago date + cadence. Not an address. */
  idempotencyKey: string;
};

export type BatchSendResult = {
  idempotencyKey: string;
  sent: boolean;
  id: string | null;
  why: string | null;
};

export function subscriberHash(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

/** `cadence/yyyy-mm-dd/<hash>`. Same key the same day replays instead of sending twice. */
export function dispatchIdempotencyKey(cadence: string, ymd: string, email: string) {
  const key = `${cadence}/${ymd}/${subscriberHash(email)}`;
  if (key.length < 1 || key.length > 256) throw new Error("Idempotency key is out of range.");
  return key;
}

function fromAddress() {
  return process.env.RESEND_FROM?.trim() || "On This Water <onboarding@resend.dev>";
}

function assertOneRecipient(to: readonly string[]) {
  if (to.length !== 1 || !to[0]) throw new Error("Refusing to address more than one recipient.");
}

/**
 * One address per message. Resend stores Idempotency-Key on the HTTP request,
 * so each subscriber is its own batch of one. Calls flush in chunks of
 * RESEND_BATCH_LIMIT and never put a second address on To, Cc, or Bcc.
 */
export async function sendResendBatch(messages: BatchMessage[]): Promise<BatchSendResult[]> {
  if (!messages.length) return [];
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return messages.map((message) => ({
      idempotencyKey: message.idempotencyKey,
      sent: false,
      id: null,
      why: "missing RESEND_API_KEY",
    }));
  }
  const from = fromAddress();
  const results: BatchSendResult[] = [];
  for (let i = 0; i < messages.length; i += RESEND_BATCH_LIMIT) {
    const group = messages.slice(i, i + RESEND_BATCH_LIMIT);
    const settled = await Promise.all(group.map((message) => postOne(key, from, message)));
    results.push(...settled);
  }
  return results;
}

async function postOne(key: string, from: string, message: BatchMessage): Promise<BatchSendResult> {
  assertOneRecipient([message.to]);
  try {
    const res = await fetchExternal("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify([
        {
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
      ]),
      timeoutMs: 10000,
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{ id?: string }>;
      message?: string;
    };
    if (res.status === 409) {
      return { idempotencyKey: message.idempotencyKey, sent: true, id: null, why: "already sent" };
    }
    if (!res.ok) {
      return {
        idempotencyKey: message.idempotencyKey,
        sent: false,
        id: null,
        why: json.message ?? `Resend ${res.status}`,
      };
    }
    return {
      idempotencyKey: message.idempotencyKey,
      sent: true,
      id: json.data?.[0]?.id ?? null,
      why: null,
    };
  } catch (error) {
    return {
      idempotencyKey: message.idempotencyKey,
      sent: false,
      id: null,
      why: error instanceof Error ? error.message : "Resend failed",
    };
  }
}

export async function sendResend(to: string[], subject: string, html: string, text: string) {
  assertOneRecipient(to);
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { sent: false as const, id: null as string | null, why: "missing RESEND_API_KEY" };
  const from = fromAddress();
  const res = await fetchExternal("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
    timeoutMs: 10000,
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) throw new Error(json.message ?? `Resend ${res.status}`);
  return { sent: true as const, id: json.id ?? null, why: null as string | null };
}
