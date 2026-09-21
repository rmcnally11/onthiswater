# Link Airtable to On This Water

Airtable is the list. Resend is only the stamp that sends the mail. Do not use a Resend Audience, Contacts list, or `RESEND_AUDIENCE_ID` as the subscriber store.

The table already exists. Production cannot read or write it until you put an Airtable personal access token on Vercel and redeploy.

**Table:** [Subscribers](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6) (Airtable base is still named Field Brief until you rename it in the Airtable UI)

Your operator row is already on it: `rmcnally11@gmail.com`, the original seven desks, Daily / Weekly / Calendar / Seasonal, Status **Active**. New Carolina and Azores waters typecast on write — add them to the row if you want those mornings.

---

## What each piece does

| Piece | Job |
| --- | --- |
| [Subscribers table](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6) | Who is on the list, which desks, which cadence, Active / Paid / Unsubscribed |
| `AIRTABLE_API_KEY` on Vercel | Lets `/join` write a row and lets the 5am cron read Active / Paid rows |
| `RESEND_API_KEY` | Sends the mail. Not the list. |
| `RESEND_FROM` | Who the mail is from. Needs a verified domain before family inboxes accept it. |
| `SUBSCRIBER_EMAILS` | Optional belt-and-suspenders for you only. Those addresses get every desk. |

Without the Airtable token, a live `/join` signup is `via: "local"` and dies on the next Vercel instance. The cron then only sees `SUBSCRIBER_EMAILS` (you), not the family.

---

## 1. Create an Airtable personal access token

1. Open [airtable.com/create/tokens](https://airtable.com/create/tokens) while signed in as the account that owns the list base (still named Field Brief in Airtable unless you rename it).
2. Click **Create new token**.
3. Name it `On This Water production`.
4. Under **Scopes**, add exactly these:
   - `data.records:read`
   - `data.records:write`
5. Under **Access**, click **Add a base** → pick that list base only. Do not grant every base in Costal Cavaliers.
6. Click **Create token**.
7. Copy the value once. It starts with `pat`. Airtable will not show it again.

Do not paste this token into the repo, a commit, a chat, or a screenshot.

---

## 2. Put the token on Vercel

The variable name must be exactly `AIRTABLE_API_KEY`. The app also accepts `AIRTABLE_TOKEN`, but use `AIRTABLE_API_KEY`.

1. Open the [Vercel dashboard](https://vercel.com/dashboard) and the **onthiswater** project.
2. Go to **Settings → Environment Variables**.
3. Click **Add New**.
4. **Key:** `AIRTABLE_API_KEY`
5. **Value:** the `pat…` token from step 1.
6. Environment: check **Production**. Also check **Preview** if you want preview deploys to write the same table.
7. Leave **Sensitive** on if Vercel offers it.
8. Save.

Saving the variable does **not** attach it to the deployment that is already live. You must redeploy.

---

## 3. Redeploy Production

1. In the same project, open **Deployments**.
2. Open the current **Production** deployment (the one serving [onthiswater.com](https://onthiswater.com)).
3. Click the **⋯** menu → **Redeploy**.
4. Do **not** check “Use existing Build Cache” if that option is there. You want a fresh process with the new env.
5. Wait until the deployment is **Ready**.

CLI equivalent if you already have the Vercel CLI linked:

```bash
echo "YOUR_PAT_HERE" | vercel env add AIRTABLE_API_KEY production
vercel --prod
```

Do not put the token in a committed `.env` file. `.env*` is gitignored.

---

## 4. Prove the link

### A. Status ping (no email)

Open:

https://onthiswater.com/api/subscribe

You want:

```json
{ "list": "airtable", "airtable": true, "ok": true }
```

`count` is how many Active / Paid rows the cron can see. It should be at least `1` (you).

If you get `{ "list": "unlinked", "airtable": false }`, the variable is missing on that deployment. Repeat steps 2–3.

If `airtable` is true but `ok` is false, the token is present and Airtable rejected it. Check scopes (`data.records:read` + `data.records:write`) and that the token is scoped to this list base.

### B. A real signup

Family door: [onthiswater.com/join?coasts=texas](https://onthiswater.com/join?coasts=texas)

Or from a terminal:

```bash
curl -sS -X POST https://onthiswater.com/api/subscribe \
  -H 'content-type: application/json' \
  -d '{"email":"FAMILY_EMAIL_HERE","desks":["galveston"],"cadence":["daily","weekly","calendar","seasonal"],"source":"Letter"}'
```

You want `"via":"airtable"` in the JSON. Then open the [Subscribers table](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6) and confirm the new row: Name, Email, Home ZIP, Coasts they fish `galveston`, What they receive all four, Status **Active**.

`via: "local"` means that production process still does not have the token.

### C. Operator page

The [Subscribers table](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6) should show the same rows. There is no list page on the site.

---

## 5. Add family by hand tonight (optional)

You do not have to wait for `/join` if you want names on the list now. After the token is on Vercel, the cron reads whatever is Active / Paid on the table.

1. Open [Subscribers](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6).
2. Click **+** to add a record.
3. Fill:

| Field | What to put |
| --- | --- |
| Name | The name they go by |
| Email | Their real address |
| Home ZIP | Home ZIP or postal code |
| Coasts they fish | Micro-areas. Texas `galveston` or the whole set (`sabine`, `galveston`, `matagorda`, `aransas`, `corpus`, `baffin`, `lower-laguna`). Florida is not only `islamorada` — add `biscayne`, `key-largo`, `florida-bay`, `marathon`, `key-west`, `boca-grande`, `jupiter`. Carolinas: `hatteras`, `morehead-city`, `wilmington`, `charleston`, `hilton-head`, `myrtle-beach`. Azores: `horta`, `sao-miguel`. |
| What they receive | `Daily` (5am brief), `Weekly` (Saturday letter), `Calendar` (Sunday month grid), `Seasonal` (1st fundamentals) |
| Status | **Active** |
| How they joined | `Operator` if you typed it; `/join` writes `Letter` |
| Joined on | Today (`YYYY-MM-DD`) |
| Notes | Optional |

A Texas-only row must **not** include Andros, Alphonse, or Horta. Empty Desks is not “every letter water” — the cron skips a row with no desks.

To take someone off: set Status to **Unsubscribed**. Do not delete the row unless you mean to lose the history.

`Paid` is the later monetize hook. The cron treats Paid the same as Active.

---

## 6. The stamp (separate from the list)

Linking Airtable does not deliver mail to family inboxes by itself.

Resend is still in test mode on `On This Water <onboarding@resend.dev>` until you set `RESEND_FROM`. That fallback address can only deliver to the Resend-account email (`rmcnally11@gmail.com`). Family rows will be on the table and the cron will try them; Resend will refuse anyone else until you:

1. Add and verify `onthiswater.com` at [resend.com/domains](https://resend.com/domains).
2. Set `RESEND_FROM` on Vercel to `On This Water <line@onthiswater.com>` (or another address on that domain).
3. Redeploy Production.

Until then: the list is real, the 5am job can see family rows, and only your inbox can receive the stamp.

---

## What the cron does once the token is live

Schedule: `0 10 * * *` UTC = 5:00 a.m. Galveston CDT.

1. `listSubscribers()` reads Active / Paid rows from this table (plus `SUBSCRIBER_EMAILS` if set).
2. Daily: each desk’s 5am line goes only to addresses that elected that desk **and** Daily.
3. Saturday (Chicago): Weekly letter, elected desks only.
4. Sunday: Calendar month grid.
5. 1st of the month: Seasonal fundamentals.

Force tests (operator):

- Daily: `/api/cron/dispatch?force=1&desk=galveston`
- Weekly / calendar / seasonal: add `&weekly=1`, `&calendar=1`, or `&seasonal=1`
- One of each sample: `/api/cron/samples?send=1&to=YOUR_EMAIL`

Hobby is one daily cron. Those query flags are how you fire a mail off-schedule.

---

## Field IDs (already wired in code)

You should not have to change these. They live in `lib/airtable-list.ts`.

| Field | ID | Type |
| --- | --- | --- |
| Name | `fld3dNtADK32TeRYD` | text |
| Email | `fldxbuLSA1abol1QD` | email |
| Home ZIP | `fld5CbrwcpJwkubQ4` | text |
| Coasts they fish | `fldfp7bhxDuVsvLDs` | multiple select of micro-areas (`galveston`, `islamorada`, `florida-bay`, `jupiter`, …). New ids typecast on write. |
| Status | `fldNvuox5pwxbDc9i` | single select: `Active`, `Paid`, `Unsubscribed` |
| How they joined | `fldCrpEUBV2t9a5oh` | single select: `Brief`, `Letter`, `Morning`, `Operator` |
| Joined on | `fldTQcD4XDpVsdy6f` | date |
| Notes | `fldYDuwwxmogAbDvl` | long text |
| What they receive | `fldedcanNXcoKuOnM` | multiple select: `Daily`, `Weekly`, `Calendar`, `Seasonal` |

Base `app3GRvkkpJdnVIKy`. Table `tblqoCAVvAvEFYMe6`. Workspace is Costal Cavaliers for now; remap later if you want.

Do not rename choice values. The app writes those exact strings.

---

## Optional: an Airtable form that writes the same table

`/join` is the product door once the token is on Vercel. If you also want a form that writes the table with no app in the middle:

1. Open the [Subscribers table](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6).
2. **+** next to the views → **Form**.
3. Keep Name, Email, Home ZIP, Coasts they fish, and What they receive. Hide Status and set its default to **Active**. Hide How they joined / Joined on / Notes or default How they joined to `Letter`.
4. Share the form link if you want. Rows still need Status **Active** and at least one desk for the cron to send.

The 5am job still needs `AIRTABLE_API_KEY` on Vercel to *read* those rows. A form without the token is a notebook the cron cannot see.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/api/subscribe` GET says `unlinked` | Variable not on that deployment | Add `AIRTABLE_API_KEY`, redeploy Production |
| POST returns `via: "local"` | Same | Same |
| GET says `ok: false` / POST 500 with `Airtable 401` or `403` | Bad or under-scoped token | New PAT with read + write on this list base only |
| `Airtable 404` | Wrong base/table (should not happen; IDs are in code) | Do not change `lib/airtable-list.ts` IDs |
| Row appears, family gets no mail | List is linked; stamp is still test-mode Resend | Verify a domain, set `RESEND_FROM`, redeploy |
| You get mail, family does not | `SUBSCRIBER_EMAILS` and/or your row work; Resend refuses other inboxes | Same domain step |
| Family on the table, still no 5am | Token missing, Status not Active, or Desks empty | Status **Active**, at least `galveston` for Texas |
| Texas signup got Andros | Their Desks include `andros` | Edit the row |

I cannot set the Vercel variable from this session. Vercel’s project API is not authenticated here. The three clicks that finish the link are: create the PAT, paste it as `AIRTABLE_API_KEY`, redeploy Production.
