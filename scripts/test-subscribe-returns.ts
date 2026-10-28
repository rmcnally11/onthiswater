import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { welcomeDeskIds } from "@/lib/samples";
import { enqueueWelcome, guardWelcome, subscribeNote } from "@/lib/welcome-queue";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;

const route = readFileSync(new URL("../app/api/subscribe/route.ts", import.meta.url), "utf8");
assert.equal(route.includes("await sendWelcomeEmails"), false);
assert.match(route, /enqueueWelcome\(after/);
assert.match(route, /sentNow: false/);
assert.match(route, /maxDuration = 300/);

assert.deepEqual(
  welcomeDeskIds({ desks: ["galveston", "islamorada", "nope"], coasts: ["texas"] }),
  ["galveston"],
);

const logged: unknown[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  logged.push(args);
};
await guardWelcome(async () => {
  throw new Error("resend quiet");
});
console.error = originalError;
assert.equal(logged.length, 1);
assert.match(String(logged[0]), /Welcome mail did not send/);

let sendStarted = false;
let release!: () => void;
const gate = new Promise<void>((resolve) => {
  release = resolve;
});
let queued: (() => Promise<void>) | undefined;
const started = Date.now();
enqueueWelcome(
  (task) => {
    queued = task;
  },
  async () => {
    sendStarted = true;
    await gate;
  },
);
const body = {
  ok: true as const,
  sentNow: false as const,
  note: subscribeNote(["texas"], "airtable"),
};
const elapsed = Date.now() - started;
assert.equal(body.sentNow, false);
assert.match(body.note, /Welcome notes are on the way/);
assert.equal(sendStarted, false);
assert.equal(typeof queued, "function");
assert.ok(elapsed < 50, `response assembled in ${elapsed}ms`);

const pending = queued!();
await Promise.resolve();
assert.equal(sendStarted, true);
let settled = false;
pending.then(() => {
  settled = true;
});
await Promise.resolve();
assert.equal(settled, false);
release();
await pending;
assert.equal(settled, true);

console.log("ok subscribe returns before welcome");
