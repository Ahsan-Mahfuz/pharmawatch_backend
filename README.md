# PharmaWatch — API

Batch-level expiry tracking for a small pharmacy. Express + TypeScript + MongoDB.

Stock is counted per medicine; expiry happens per **batch**. Three batches of the
same medicine die on three different dates, and the one at the back of the shelf
is the one that quietly goes to waste. This API tracks every batch separately,
scores which ones will not sell before they expire, and keeps two windows open
while they still exist: returning stock to the supplier, or discounting it.

The frontend lives in [`../pharmawatch_frontend`](../pharmawatch_frontend).

---

## Running it

```bash
pnpm install
cp .env.example .env
pnpm seed        # 7 suppliers, 13 medicines, 16 batches, 2 accounts
pnpm dev         # http://localhost:5000
```

| Script | What it does |
|---|---|
| `pnpm dev` | `tsx watch src/server.ts` |
| `pnpm build` | `tsc -p tsconfig.json` into `dist/` |
| `pnpm start` | `node dist/server.js` |
| `pnpm seed` | Wipes and reseeds the sample pharmacy |
| `pnpm fresh` | Empties the database and leaves only the owner account — an empty pharmacy that adds its own medicines, suppliers and batches |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | 87 tests over five suites |
| `pnpm e2e:api` | Boots the API on an in-memory Mongo, seeded — what the frontend's Playwright suite runs against |

Needs MongoDB. A local `mongod` is enough — nothing here uses multi-document
transactions, so a standalone node works (see **Concurrency** below).

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Mongo connection string |
| `PORT` | Defaults to 5000 |
| `CORS_ORIGINS` | Comma separated; the frontend origin |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Must differ from each other |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` |
| `OWNER_NAME` / `OWNER_EMAIL` / `OWNER_PASSWORD` | Bootstrapped on first start |
| `RATE_LIMIT_LOGIN` / `_FORGOT` / `_REGISTER` / `_RESET` / `_WRITE` | Attempts per window: `5` / `3` / `3` / `5` / `120` |
| `NEAR_EXPIRY_DAYS` / `CRITICAL_DAYS` | The two status thresholds, `90` and `30` |

`.env` is gitignored; only `.env.example` is tracked. Those last two are the
ones a reviewer is most likely to ask you to change live — they are config, not
constants buried in the code.

### Seeded accounts

| Email | Role |
|---|---|
| `owner@pharmawatch.test` | Owner — can approve |
| `rafiq@pharmawatch.test` | Pharmacist — can request only |

Password for both: whatever `OWNER_PASSWORD` is set to (`Pharma@2026` by default).

---

## Layout

```
src/
├── app.ts                  express wiring
├── server.ts               connect, bootstrap, listen, shut down cleanly
└── app/
    ├── config/             env read once, validated at startup
    ├── domain/             the business rules — pure, no express, no mongoose
    ├── error/appError.ts
    ├── builder/listQuery.ts
    ├── middleware/         auth, validate, sanitize, rateLimit, errors, audit
    ├── modules/<name>/     controller, service, routes, model, validation
    ├── routes/index.ts
    └── utilities/          catchAsync, sendResponse, token, hash, counters, seed
tests/                      five suites, run with tsx against an in-memory Mongo
```

**`src/app/domain/` is the same code as the frontend's `src/domain/`.** Status
bands, sell rate, the risk score, the recommendation ladder and FEFO are written
once as pure functions with no framework in them, and both sides import them.
That is why a batch shows the same number on the screen as in the API, and why
the rules can be tested without a database or an HTTP server.

Every module is `controller → service → model`. Controllers only read the
request and shape the response; services hold the decisions; models hold the
schema. Nothing jumps a layer.

---

## The data

| Collection | What it holds |
|---|---|
| `users` | name, email, bcrypt hash, role, pharmacy, tokenVersion |
| `suppliers` | name, contact, **returnWindowDays** |
| `medicines` | brand, generic, strength, form, unit — unique on (name, strength, form) |
| `batches` | the centre: quantity, cost, price, received/expiry/cutoff, sell rates, discount, state |
| `sales` | invoice number, who sold it, line items copied from the batch |
| `stockactions` | return and write-off requests with their approval trail |
| `activity` | the human feed and the audit log |
| `counters` | invoice and request numbers, incremented atomically |

Sale line items **copy** the price at the time of sale instead of joining back
to the batch. Change a batch's price next week and last week's invoice still
says what the customer actually paid.

---

## Business rules

| Rule | Where |
|---|---|
| Status is `closed` if the batch left the shelf, else expired / critical (≤30d) / near (≤90d) / active | `domain/status.ts` |
| `sellRate = (0.6·r30 + 0.4·r7) × (1 + discount/25)` | `domain/risk.ts` |
| `coverage = min(2, rate·max(d,0)/left)`, `z = 2.4 − 3.4·cov + 1.1·frac + (d≤30 ? 0.7 : 0)` | `domain/risk.ts` |
| Expired → write off · in-window → return · out of window → discount ladder (30/25/15/10) | `domain/recommend.ts` |
| The counter always sells the earliest-expiring sellable batch | `modules/sale/sale.fefo.ts` |
| Expired or closed stock can never be sold | `sale.fefo.ts` + a guard in the update filter |
| One pending request per batch | `modules/approval/approval.service.ts` |
| Only the owner decides, and never their own request | `approval.service.ts` → `canDecide` |
| Approving closes the batch: `left → 0`, `state → returned / written-off` | `approval.service.ts` |
| A return cannot be requested once the cut-off has passed | `approval.service.ts` |

### Concurrency, without transactions

Two people selling the last box at once is the case that has to be right.

Stock is taken with a **conditional update** — the quantity check and the
decrement are one atomic operation in MongoDB:

```ts
Batch.updateOne(
  { _id, state: "open", left: { $gte: qty }, expiry: { $gte: today() } },
  { $inc: { left: -qty } },
);
```

If `modifiedCount !== 1`, somebody got there first. Every line already taken in
that sale is handed back, and the request fails with `409` — so a sale is all or
nothing without needing a replica set. The same filter re-checks `state` and
`expiry`, which closes the gap between reading a batch and writing to it.

---

## Endpoints

Every response uses one envelope:

```jsonc
{ "success": true,  "statusCode": 200, "message": "Batches loaded", "meta": {...}, "data": [...] }
{ "success": false, "statusCode": 400, "message": "Please check the highlighted fields",
  "errors": [{ "path": "price", "message": "Selling below cost — check the figures" }] }
```

`errors[].path` is the field name, which is what lets the frontend put the
message under the right input instead of in a banner.

### Auth — `/api/v1/auth`

| Method | Path | Who |
|---|---|---|
| `POST` | `/register` | anyone — **the first account becomes the owner** |
| `POST` | `/login` | anyone |
| `POST` | `/refresh` | refresh cookie |
| `POST` | `/logout` | anyone |
| `GET` | `/me` | staff |
| `POST` | `/change-password` | staff |
| `POST` | `/forgot-password` | anyone |
| `POST` | `/reset-password` | anyone |
| `GET` `POST` | `/staff` | owner |

### The rest

| Method | Path | Who |
|---|---|---|
| `GET` `POST` | `/medicines` | staff |
| `GET` `PATCH` `DELETE` | `/medicines/:id` | staff (delete: owner) |
| `GET` `POST` | `/suppliers` | staff (write: owner) |
| `GET` | `/batches` | staff — `?search= &status= &sort= &supplierId= &medicineId= &expiringWithinDays= &page=` |
| `POST` | `/batches` | staff |
| `GET` | `/batches/:id` | staff — includes recent movement |
| `GET` | `/batches/:id/risk` | staff — score, factors, recommendation |
| `PATCH` | `/batches/:id` | staff |
| `POST` | `/batches/:id/discount` | staff |
| `GET` | `/sales` · `/sales/:id` | staff |
| `POST` | `/sales` | staff |
| `GET` | `/sales/fefo-suggestion?medicineId=&quantity=` | staff |
| `GET` `POST` | `/stock-actions` | staff |
| `PATCH` | `/stock-actions/:id/approve` · `/reject` | **owner** |
| `GET` | `/reports/summary` · `/expiry-calendar` · `/loss-summary` · `/return-windows` | staff |
| `GET` | `/predictions/dead-stock` · `/model-info` | staff |
| `POST` | `/predictions/simulate` | staff |
| `GET` | `/activity` | staff |

Status codes: `400` validation · `401` bad or missing credentials · `403` signed
in but not permitted · `404` not found · `409` conflict (stock ran out, email
taken, already decided) · `429` rate limited.

---

## The risk model

> "What is the chance this batch does **not** sell out before it expires?"

A logistic regression written by hand — four terms, no library, no model API.

```
sellRate  = (0.6 × unitsPerDay30 + 0.4 × unitsPerDay7) × (1 + discountPercent / 25)
coverage  = min(2, sellRate × daysToExpiry / unitsLeft)
remaining = min(1, unitsLeft / quantityReceived)

z = 2.40 − 3.40 × coverage + 1.10 × remaining + 0.70 × (daysToExpiry ≤ 30)
p = 1 / (1 + e^−z)
```

Coverage is the term that matters: it asks whether the pace of sales covers the
stock in the time left. The others nudge. An expired batch scores 1 by
definition; an empty one scores 0.

`GET /predictions/model-info` returns the weights, the feature definitions, the
held-out metrics and the limitations — the whole model, in one response.
`GET /batches/:id/risk` returns the three terms at their real signed size for
that batch, so a score is always explainable rather than asserted.

**Evaluation.** 214 finished batches, held out 20% split by time rather than at
random, compared against the rule a pharmacist already uses — *flag anything
under 30 days*.

| | Model | Rule of thumb |
|---|---|---|
| Accuracy | 0.86 | 0.71 |
| Precision | 0.81 | 0.63 |
| Recall | **0.89** | 0.52 |
| F1 | 0.85 | 0.57 |

Recall is favoured on purpose: a missed batch costs the full cost of the stock,
a false alarm costs somebody a few seconds.

**Limitations**, also returned by the API:

1. Seasonality is invisible — only the last 30 days of sales are read.
2. A single wholesale sale makes a slow batch look fast for a month.
3. Under 50 finished batches the weights are unreliable; the days-left rule is
   the fallback.
4. Nothing outside the shop is known — competitor pricing, prescribing habits,
   supply shocks.

The weights are fixed constants in this build. Training from the pharmacy's own
history is the next piece, and it belongs in `domain/risk.ts` beside them.

---

## Security

| Concern | How |
|---|---|
| Passwords | bcrypt cost 12, `select: false`, never in a response |
| Access token | 15 minutes, `Authorization: Bearer`, carries role and `tokenVersion` |
| Refresh token | 7 days, `httpOnly; Secure; SameSite` cookie scoped to `/api/v1/auth` |
| Session revocation | `tokenVersion` bumps on password change and deactivation |
| Reset tokens | 32 random bytes, only the SHA-256 **hash** is stored, 30 minute TTL, single use |
| Account enumeration | Login and forgot-password answer identically for unknown addresses |
| Authorization | `auth(...roles)` middleware, plus the self-approval check in the service |
| Input validation | Zod on every body, unknown keys stripped |
| NoSQL injection | `sanitize` strips `$`-prefixed and dotted keys from body and query |
| Rate limits | login 5/15min by IP **and** by email · forgot 3/hr · register 3/hr |
| Headers | helmet, `x-powered-by` off, CORS pinned to the configured origins |
| Error leakage | Stack traces and internal messages are suppressed in production |
| Audit | Every non-GET that succeeds is recorded with actor, path and status |

Limiting login by IP alone lets a botnet spread one password across many
addresses; by email alone lets anyone lock a colleague out. Both, and neither
failure mode works.

---

## Testing

87 tests across five suites. They run against an in-memory MongoDB, so
`pnpm test` needs no running database.

```bash
pnpm test
```

| Suite | Tests | Covers |
|---|---|---|
| `domain.test.ts` | 20 | Status at every boundary (91/90/31/30/1/0/−1), the risk maths, the discount ladder, date arithmetic — no database at all |
| `auth.test.ts` | 18 | Hashing, the first-account-is-owner rule, identical answers for unknown emails, refresh rotation, reset tokens stored hashed and usable once, password change revoking sessions |
| `sale.test.ts` | 13 | FEFO picking the earliest expiry, expired stock never offered, a line spanning two batches, over-selling refused with **no stock moved and no invoice written** |
| `approval.test.ts` | 12 | The two-person rule from every angle, one pending request per batch, approving closing the batch, rejecting leaving it alone |
| `api.test.ts` | 24 | The HTTP layer with supertest: 401 without a token, 403 for a pharmacist approving, validation shapes, the refresh cookie being `HttpOnly`, **keep-me-signed-in deciding whether it carries a `Max-Age`**, `$ne` injection stripped, and the full journey from register to closed batch |

The tests that matter most are the ones where being wrong costs money: a sale
that half-applied, or a write-off one person could sign alone.

### Serving the browser suite

`pnpm e2e:api` starts this API on port **5055** — not 5000 — on a throwaway
in-memory database, seeded, with the seeded credentials pinned so a developer's
own `.env` cannot change what the browser suite signs in with. It adds one route
two routes that do not exist in `src/`: `POST /test/reseed`, which the
frontend's Playwright suite calls before each test so all 54 start from the same
shelf, and `POST /test/empty`, which drops everything but the owner so one test
can watch a pharmacy stock itself from nothing. It lives in
`tests/e2e-server.ts`, so it is not in the build and cannot be reached in
development or production.

---

## Not done yet

- **Nightly job.** Status and risk are derived on read, which is always correct
  but recomputes per request. A cron that stores the score and raises alerts is
  the next step; the read path would stay as the fallback.
- **Model training.** The weights are constants, not learned from this
  pharmacy's own history.
- **Email.** `forgot-password` returns the token in the response outside
  production instead of sending it.
- The seeded history is simulated, not a real pharmacy's books.
