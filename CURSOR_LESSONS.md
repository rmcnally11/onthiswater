# Cursor lessons

Read this before changing the repo. The notes below come from `git log` and PRs #18–#23. Follow them.

## 1. The Nov 3 digest never read the list (PR #23)

On 2026-11-03 the cron fired at 10:00 UTC, which was 4:00am CST. The Airtable subscriber read timed out at 8 seconds (`AIRTABLE_TIMEOUT_MS` in `lib/airtable-list.ts`, error `upstream timed out after 8000ms`). That run read 0 subscribers and sent 0 mail.

PR #23 moved that one dispatch read to a 20s timeout and 3 attempts (backoff 2s, then 5s). It merged at 2026-11-03 12:39:28 UTC (6:39am CST), after the failed run. The first cron that could exercise the retry was the next day: 2026-11-04 10:00 UTC (4:00am CST).

The PR description and `npm run test:dispatch` did not prove a slow or timed-out Airtable read. `scripts/test-dispatch.ts` calls `setExternalTimeoutScaleForTests(0.05)` before the hang case, so the assertion is `upstream timed out after 1000ms` and the whole sequence must finish in under 8s. `hangAirtable` never returns a body. A “recovered” attempt is an instant HTTP 500 followed by an instant empty 200, not a slow read that then returns rows. The description never says when the next cron would run the change, or which log line to check after merge.

**Rule.** Any change to the cron or the dispatch path must do all three:

1. Include a test that simulates an Airtable timeout and a slow response: a read that takes real time, then either times out or returns rows. Scaling the clock and asserting the suite stayed fast does not count.
2. State when the next cron run will exercise the change. Use the clock in the next section.
3. Give a post-merge check that names the log line. A good read is one JSON line with `scope` `"dispatch"`, `stage` `"subscribers"`, `ok` true, and `count` greater than 0. A miss is `ok` false, `count` 0, and an `error` containing `timed out`, with no later `stage` `"send"`. After three failed attempts the job throws `Subscriber list could not be read. No mail was sent.` and `GET /api/cron/dispatch` returns 502.

The same PR keeps Status `Excluded` sticky: a re-signup leaves the row `Excluded`, returns the normal success JSON, and queues no welcome. Dispatch still lists only `Active` or `Paid`.

## 2. Say the cron clock, including DST

`vercel.json` schedules `/api/cron/dispatch` at `0 10 * * *` UTC. That is 4:00am CST and 5:00am CDT (America/Chicago). DST starts the second Sunday in March and ends the first Sunday in November. 2026-11-03 was already CST, so that morning was 4:00am, not 5:00am.

Any PR that touches the cron, the digest, or “the 5am mail” names both CST and CDT. README’s list section currently says `0 10 * * *` = 5:00 a.m. Galveston CDT. That line is the CDT half only.

## 3. One address per message (PR #19)

Mail each subscriber alone. `To` is one address. There is no `Cc` and no `Bcc`. Batches to Resend are chunks of at most 100, and each request is still one address. The idempotency key is `cadence/yyyy-mm-dd/<sha256 prefix>` from `dispatchIdempotencyKey` in `lib/send.ts`. A same-day re-run replays or gets 409. Treat 409 as already sent.

When Airtable is configured and the subscriber read throws, log it and skip the send. Return 502. Do not fall through to `SUBSCRIBER_EMAILS`.

## 4. Answer `/api/subscribe` before the welcome mail (PR #18)

A production `POST /api/subscribe` on 2026-10-27 took about 148 seconds. Airtable had the row in about 2 seconds. The route was awaiting welcome mail that loaded every Saturday desk.

Save the row, respond, then send. The JSON keeps `sentNow: false`. Welcome mail is queued with `after()` and cannot throw back into the response. The welcome build uses only the desks on that request.

## 5. A malformed `/book` URI is 404 (PR #20)

A probe hit `/book` with a broken percent-escape. Decoding `searchParams` and the water cookie threw `URIError: URI malformed` and the page returned 500.

A malformed path or query on `/book` resolves to the normal not-found page (404). Well-formed links (`area=galveston`, `%20`, `%25`) still decode and render.

## 6. How a change ships

- One PR per change.
- The Vercel preview is green.
- All tests pass.
- Nothing merges without Robert’s explicit yes. An open PR is not a yes. PR #22 is still open.
- No environment-variable changes and no deploy changes (`vercel.json`, domains, project settings) unless that is the change Robert asked for.

Do not send mail, post, or hit a live webhook to prove a change.
