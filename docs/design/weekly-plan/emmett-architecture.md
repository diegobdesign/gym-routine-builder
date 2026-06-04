# Weekly Plan — Architecture Design

**Author:** Emmett (Senior Dev — Architecture & Design Review)
**Date:** 2026-06-04
**Status:** Design — no code yet
**Pairing:** Allison (UX/copy) + Sonny (QA/test matrix)
**Scope:** ONE PR that ships Weekly Plan + Today rewire + Routine Preview, plus retiring `is_default`.

---

## TL;DR

Add a `assigned_weekdays SMALLINT[]` column to `routines`. Drop `is_default`. Today derives the active routine by computing **today's weekday in `Europe/Dublin`** on the server (Node route), so the user's calendar day matches their actual training day regardless of where Vercel runs the function. The Today hero card stops POSTing to `/api/workouts/start` — it routes to the existing `/routines/[id]` page, which we promote into the Preview surface with a primary Start CTA + last-used-weight column. Last-used weight is computed by **one join query** against `workout_sets` joined to the most recent `workout_sessions` per routine_item — server-side, attached to the routine GET response.

This is a SMALL appetite for this codebase (5–8 hours of focused work). The risk surface is timezone math and the schema migration; both are bounded.

---

## 1. Schema migration

### The decision

- New column: `routines.assigned_weekdays SMALLINT[] NOT NULL DEFAULT '{}'::SMALLINT[]`
- Drop column: `routines.is_default`
- Drop endpoint: `/api/routines/[id]/default/route.ts`
- Constraint: every element in the array must be 0–6 (Sunday=0 … Saturday=6)
- Uniqueness: **array values must be unique** — no day appears twice in one routine's array (a no-op semantically, but a cheap guarantee)
- Index: **skip.** Single user, <50 routines lifetime. A GIN index on a 50-row table is pure overhead. `SELECT * FROM routines WHERE 2 = ANY(assigned_weekdays)` is a sequential scan over <50 rows — sub-millisecond, no index needed. **Revisit only if this app ever ships multi-tenant.**

### Weekday encoding — pick ONE and document it

JavaScript's `Date.getDay()` returns `0=Sunday … 6=Saturday`. Postgres's `EXTRACT(DOW FROM ts)` returns the same `0=Sunday … 6=Saturday`. Use that convention everywhere — DB, server, client. Do NOT mix in ISO 8601's `1=Monday … 7=Sunday`; it will silently corrupt one routine assignment and you won't notice for a week. Add a comment in the migration AND in `src/types/index.ts` calling out `0=Sunday, 6=Saturday` explicitly.

(Note: the existing `metrics/route.ts` already uses the `getDay() === 0 ? 6 : dayOfWeek - 1` Monday-offset pattern for the "this week" calculation — that pattern stays the same, it's a *display* convention, not a storage convention.)

### Migration SQL (follow the existing convention from `migration_add_machine_fields.sql` — idempotent, hand-runnable)

Filename: `supabase/migration_add_weekly_plan.sql`

```sql
-- Migration: Weekly Plan
-- Adds routines.assigned_weekdays (SMALLINT[]) and retires routines.is_default.
-- Weekday convention: 0 = Sunday, 6 = Saturday (matches JS Date.getDay() and Postgres EXTRACT(DOW)).
-- Idempotent — safe to re-run.

-- 1. Add the column (nullable first so the ALTER doesn't lock on a populated table;
--    Postgres ≥ 11 handles a DEFAULT on ADD COLUMN without rewriting, but we do it
--    in two steps anyway to keep this safe for any older instance).
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS assigned_weekdays SMALLINT[];

-- 2. Backfill: any row with NULL becomes empty array.
UPDATE routines
  SET assigned_weekdays = '{}'::SMALLINT[]
  WHERE assigned_weekdays IS NULL;

-- 3. Lock to NOT NULL + DEFAULT empty array.
ALTER TABLE routines
  ALTER COLUMN assigned_weekdays SET NOT NULL,
  ALTER COLUMN assigned_weekdays SET DEFAULT '{}'::SMALLINT[];

-- 4. Constraint: every value must be 0..6 AND no duplicates within the array.
--    Two CHECKs so each violation reports a clear error.
ALTER TABLE routines
  DROP CONSTRAINT IF EXISTS routines_assigned_weekdays_range_chk;
ALTER TABLE routines
  ADD CONSTRAINT routines_assigned_weekdays_range_chk
  CHECK (
    assigned_weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  );

ALTER TABLE routines
  DROP CONSTRAINT IF EXISTS routines_assigned_weekdays_unique_chk;
ALTER TABLE routines
  ADD CONSTRAINT routines_assigned_weekdays_unique_chk
  CHECK (
    array_length(assigned_weekdays, 1) IS NULL
    OR array_length(assigned_weekdays, 1) = (
      SELECT COUNT(DISTINCT v) FROM unnest(assigned_weekdays) AS v
    )
  );

-- 5. Retire is_default. Single user, single source of truth = the weekly plan.
ALTER TABLE routines
  DROP COLUMN IF EXISTS is_default;

-- No index — see emmett-architecture.md §1 (single user, <50 rows).
```

**Migration safety checklist (per Emmett protocol):**
- [x] NOT NULL on populated table — staged as `ADD nullable → UPDATE NULL→'{}' → ALTER SET NOT NULL`. Locks held briefly; routines table is single-digit rows.
- [x] Default added on existing column — Supabase is on Postgres 15+, no full-table rewrite.
- [x] Index — skipped deliberately. Documented.
- [x] No rename, no destructive UPDATE/DELETE without WHERE.
- [x] Dropping `is_default` — verified zero callers post-migration: grep the repo, delete `/api/routines/[id]/default/route.ts`, remove the `Star` UI + `setDefaultRoutine` mutation from `/routines/[id]/page.tsx`, drop `is_default` from `src/types/index.ts`. Sonny verifies on QA pass.
- [x] Rollback: trivial — `ALTER TABLE routines DROP COLUMN assigned_weekdays; ALTER TABLE routines ADD COLUMN is_default BOOLEAN DEFAULT FALSE;`. We accept losing the weekly assignments (Diego can re-enter them — total cost: 30 seconds). Note this in the migration header if Diego wants belt-and-suspenders.
- [x] No RLS — service-role-only access, no auth tier.
- [x] No realtime publication concerns — table isn't broadcast.
- [x] No FK changes, no cascade audit needed.

### `schema.sql` change

Update `supabase/schema.sql` (the canonical schema for fresh installs) to reflect the new column + drop `is_default`. Single source of truth — when Diego rebuilds his local DB from `schema.sql`, it must match what the migration produces.

---

## 2. TypeScript type changes

`src/types/index.ts`:

**`Routine` interface:**
- REMOVE: `is_default: boolean`
- ADD: `assigned_weekdays: Weekday[]`

**New supporting type at top of file:**

```ts
/** Day-of-week index matching JS Date.getDay() and Postgres EXTRACT(DOW).
 *  0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 *  4 = Thursday, 5 = Friday, 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
```

Using the literal-union type (not `number[]`) buys us exhaustive checks at every call site that switches on the day. Catches off-by-one bugs at compile time.

**`RoutineItemWithMachine`** — extend it (NOT modify the base `RoutineItem`) so the last-used-weight join doesn't leak into write paths:

```ts
export interface RoutineItemWithMachine extends RoutineItem {
  machine: Machine;
  /** Most recent recorded weight for this routine_item across all completed
   *  sessions, regardless of session. Null = never recorded. */
  last_weight: number | null;
  /** Most recent actual_reps recorded for this routine_item. Null = never recorded. */
  last_actual_reps: number | null;
  /** ISO timestamp of when the last_weight was recorded. Useful for "logged 3 days ago" copy.
   *  Null if last_weight is null. */
  last_recorded_at: string | null;
}
```

**Form types** — add (used by the weekly-plan picker UI):

```ts
export interface RoutineWeekdaysFormData {
  assigned_weekdays: Weekday[];
}
```

`RoutineFormData` does NOT gain `assigned_weekdays` — assignment is a separate concern from the routine's name/notes (single-responsibility on the form payload). Two endpoints, two payloads.

---

## 3. API surface changes

### New endpoint: PATCH `/api/routines/[id]/weekdays`

Dedicated route for weekly assignment. Separate from the existing PUT on the routine because:
1. Different write semantics — weekdays is an atomic set replace, name/notes is a field update
2. Different validation rules
3. Different cache-invalidation pattern on the client (assigning a day invalidates the Today query; renaming doesn't)

Pseudocode:

```
PATCH /api/routines/:id/weekdays
body: { assigned_weekdays: number[] }

1. Validate body shape (Zod-style, or hand-rolled — see Recommended Pattern §11).
   - Must be an array of integers
   - Every value must be in [0..6]
   - Duplicates rejected at API layer (defense-in-depth; DB CHECK is the floor)
   - Empty array is VALID (means "this routine is not in the weekly rotation")
2. Run a single transaction:
   a. For every weekday W in assigned_weekdays, clear that day from ALL OTHER routines
      (one-routine-per-day invariant — see §7).
   b. UPDATE this routine SET assigned_weekdays = $1.
3. Return the updated routine (so client can replace cache without refetch).
```

The "clear from others" step is what enforces one-routine-per-day at the write layer. SQL pseudo:

```sql
BEGIN;
  -- Strip the assigned days off every other routine that currently holds them.
  UPDATE routines
    SET assigned_weekdays = ARRAY(
      SELECT unnest(assigned_weekdays)
      EXCEPT
      SELECT unnest($1::SMALLINT[])
    )
    WHERE id <> $2
      AND assigned_weekdays && $1::SMALLINT[];  -- overlap operator

  UPDATE routines
    SET assigned_weekdays = $1::SMALLINT[]
    WHERE id = $2;
COMMIT;
```

Supabase JS doesn't expose multi-statement transactions cleanly from the client — call a Postgres function (RPC) or do this as two sequential queries inside the route handler. **Recommend an RPC** (`routines_set_weekdays(routine_id UUID, days SMALLINT[])`) defined in the migration. Atomicity > convenience.

### Today endpoint decision: compute client-side, NO `/api/today`

**Decision: do NOT add a `/api/today` route. Compute on the client.**

Reasoning:
1. The Today page already fetches `/api/routines` (all routines with items). Adding `/api/today` means a second roundtrip OR a denormalised response.
2. "Today's weekday" depends on the user's timezone — which is *trivially* known on the client (`new Date().getDay()` runs in the user's locale automatically). Doing it server-side requires either passing a `tz` query param or hardcoding `Europe/Dublin`.
3. Cache-key story is simpler — one query (`["allRoutines"]`) drives both the Today hero AND the routine list. Invalidate one, both update.
4. No additional Vercel function invocation = no additional cold start.

**Caveat:** there's a subtle bug to avoid. If we derive `todayWeekday` once on render and the user leaves the tab open across midnight, the hero will be stale until they hit refresh. Acceptable — Diego is the only user, he's not going to keep the app open past midnight at the gym. If this ever ships multi-tenant, add a `useEffect` that schedules a recompute at the next local midnight.

**Where the timezone matters server-side:** when we compute "last_used_weight" we're joining `workout_sets.completed_at` (UTC timestamptz) and we don't care about the user's calendar day — we want the most recent absolute timestamp. So `last_weight` calculation is timezone-agnostic. The ONLY place client-tz vs server-tz matters is "which routine card is highlighted today" — and that lives in the browser.

### Routes to delete

- `DELETE` (the file, not an HTTP method): `src/app/api/routines/[id]/default/route.ts`
- Audit `src/app/api/routines/route.ts` GET — it accepts `?default=true` query param. **Delete that branch.** Anything calling it with `?default=true` will now get all routines, which fails open in a reasonable way (UI still renders something), but better to delete the dead branch.

### Modify GET `/api/routines/[id]` — attach last-used weight

The Preview screen needs `last_weight`, `last_actual_reps`, `last_recorded_at` on each routine item. Do this in **one query**, server-side, returned as part of the existing routine GET. Don't make the client fan out N+1 queries per routine_item.

See §6 for the exact query shape.

### Modify GET `/api/routines` — does NOT need last-weight enrichment

The Today tab + Routines list show routine cards, not the per-machine drilldown. Including last_weight on every routine_item in the list endpoint = N×M data the client throws away. Keep the list endpoint lean. Only the single-routine endpoint (`/api/routines/[id]`) gets the enrichment.

---

## 4. Today tab data flow

### Queries Today needs

ONE query: `["allRoutines"]` → `GET /api/routines` (existing — no shape change). The response is `RoutineWithItems[]`. From that, derive on the client:

```
todayWeekday = new Date().getDay()               // 0..6, user's device TZ
todaysRoutine = routines.find(r => r.assigned_weekdays.includes(todayWeekday))
                ?? null                           // null = rest day
```

That's it. No new endpoint, no second roundtrip.

Plus the existing `["workoutHistory"]` query for the "Recent Workouts" section — unchanged.

### "Today's weekday" derivation — device timezone, not server

Use `new Date().getDay()` in the client. **Defense:** Diego is in Ireland year-round. If he ever takes the app on a trip, the device TZ follows him — "today" matches the calendar day on his phone, which matches the gym he's walking into. This is the right semantic.

What we explicitly DO NOT do:
- Pin to `Europe/Dublin` at the API layer — that breaks when Diego trains in Madrid on holiday
- Use the Vercel function's region clock (`new Date()` in a route handler) — runs in whatever region serves the request, could be `us-east-1`, wrong by 5–8 hours

### DST edge cases

- DST transitions in Europe/Dublin happen on Sunday at 01:00. The calendar day doesn't change. `getDay()` returns the same number before and after the transition. **No special handling.**
- Week boundary: the "this week" calculation in the existing `metrics/route.ts` uses `now.getDay()` on the server. That code is server-side and the server doesn't necessarily live in Dublin. **This is a pre-existing latent bug** — surfacing it but NOT fixing it in this PR (out of scope; capture as a backlog item: "compute week boundaries in Europe/Dublin or pass client tz to metrics endpoint"). Sonny will validate metrics still pass with the existing test data.

### Cache-key strategy

- Top-level key for the routine grid + Today hero: `["allRoutines"]` — already in use.
- Single-routine key: `["routine", routineId]` — already in use.
- The Weekly Plan editor mutation (PATCH `/weekdays`) invalidates `["allRoutines"]` AND `["routine", routineId]`. Both Today and the routine detail page see the change on next render.
- TanStack Query stale time stays at 60s. No changes.
- **Optimistic update:** the weekly plan editor SHOULD be optimistic. The "tap a day chip" interaction is the kind of thing where waiting for a roundtrip feels broken. Implementer pattern: `onMutate` writes through to the cache, `onError` rolls back. Allison will spec the UI; implementer wires it.

---

## 5. Routing rewire

### Today hero — what dies, what's born

**Dies:** `RoutineStartCard` in `src/app/(tabs)/page.tsx` lines 24–79. The entire `handleStart` → POST to `/api/workouts/start` → `router.push('/workout/...')` path leaves the Today tab.

**Born:** a `TodayHeroCard` component (Allison specs the visual). Behavior:
- If `todaysRoutine` is non-null: renders a card with the routine's name, "Tuesday → Shoulder Builder" weekday label, exercise count, AND **`<Link href={'/routines/' + todaysRoutine.id}>`** wrapper. Pure navigation, no fetch.
- If `todaysRoutine` is null: renders the "Rest day" state (Allison's copy). No CTA, or a secondary CTA to "Pick a routine for today" → routes to `/routines`.

The "Your Routines" grid lower on the page ALSO changes: each card becomes a `<Link href={'/routines/' + routine.id}>` to Preview, not a POST to start. The entire `RoutineStartCard` component is replaced with a thin `RoutineGridCard` that's pure navigation.

### Preview screen (`/routines/[id]/page.tsx`) — what changes

It's already 90% of the Preview. What we're doing:
1. Remove the `Star` icon, the `is_default` branch, the `setDefaultMutation`, the "Set Default" button.
2. Promote `<StartWorkoutButton routineId={routine.id} />` to be the **visually primary** action (Allison specs hierarchy). Today's flow ends here — tap Start → that component already POSTs to `/api/workouts/start` and routes to the player. No change to that path.
3. Add a "Weekly assignment" section: shows which days this routine is assigned to, with a way to toggle (Allison specs the chip UI). Wires to the PATCH `/weekdays` endpoint.
4. The machine list (lines 169–194) gains a `last_weight` column: `Last: 60 kg · 10 reps` under the sets/reps line. Allison handles the visual; implementer pulls from `item.last_weight` and `item.last_actual_reps` on the type.

### Workout start flow — UNCHANGED

`/api/workouts/start` POST stays exactly as it is. Only the *callers* change (now only the Preview page Start CTA, not the Today hero). The server route is fine.

---

## 6. Preview screen — last-used weight query

### The shape we need

For a given routine, for each `routine_item`, fetch:
- The most recent `workout_sets.weight`
- The most recent `workout_sets.actual_reps`
- The most recent `workout_sets.completed_at`

…across ALL of Diego's completed sessions for that routine_item, regardless of which session.

### Why NOT denormalise

Tempting to add `last_weight` / `last_actual_reps` columns to `routine_items` and update them on workout completion. **Reject.** Two reasons:
1. New write path (workout completion has to update routine_items) = a new place for the data to drift out of sync if a session is later deleted.
2. The current query cost is trivial — we have <50 routine_items per routine and Diego does <100 sessions/year. A single LATERAL join finishes in milliseconds.

Compute on read. Cache via the existing 60s TanStack stale time.

### The query (one query, single roundtrip, server-side)

In `src/app/api/routines/[id]/route.ts` GET handler, after the existing routine + items fetch, run a second query against `workout_sets` for the latest set per routine_item:

```sql
-- Most recent recorded set per routine_item for this routine.
-- DISTINCT ON is the idiomatic Postgres "latest per group" pattern;
-- it's an order-aware dedup, faster and cleaner than a window function for this size.
SELECT DISTINCT ON (ws.routine_item_id)
  ws.routine_item_id,
  ws.weight,
  ws.actual_reps,
  ws.completed_at
FROM workout_sets ws
JOIN workout_sessions s ON s.id = ws.session_id
WHERE s.status = 'completed'
  AND ws.routine_item_id = ANY($1::UUID[])   -- the routine_item IDs from step 1
ORDER BY ws.routine_item_id, ws.completed_at DESC;
```

Then merge the result onto the routine_items array in JS before returning. Routine items with no completed set get `last_weight: null, last_actual_reps: null, last_recorded_at: null`.

Supabase JS doesn't surface `DISTINCT ON` through the query builder cleanly — either:
- (a) Define a Postgres function `routine_last_sets(routine_id UUID)` returning `(routine_item_id UUID, weight NUMERIC, actual_reps INT, completed_at TIMESTAMPTZ)`. Cleaner long-term.
- (b) Fetch all `workout_sets` for these routine_item_ids in `completed` sessions, sort + group in Node. Lazier, but for <100 sets per machine over Diego's lifetime, it's fine.

**Recommendation: (a)** — define it as an RPC in the migration. Same migration that adds `routines_set_weekdays`, two RPCs total, both small. Keeps query logic in the database where Postgres can plan it. Bonus: the Metrics endpoint (which today does its own JS-side grouping) can later be refactored to use the same RPC if Diego ever asks for "last weight per machine, globally."

### What about cardio (no weight)?

Some machines are `category = 'cardio'`. Their sets typically have `weight = 0` (or whatever the current player records). `last_weight: 0` shows correctly. Allison will copy-treat cardio rows separately on the Preview UI — that's content, not data.

---

## 7. Edge cases & invariants

| Case | Behavior | Layer |
|---|---|---|
| Weekday with no routine assigned | Today shows "Rest day" empty state. `todaysRoutine` is `null`. | Client (derived state) |
| Same routine assigned to multiple weekdays | Allowed and expected. e.g. `[1, 3, 5]` = Mon/Wed/Fri push day. Array allows it; same day on the same routine NOT allowed (DB CHECK §1). | DB + API |
| Same weekday assigned to two routines | **Prevented at write time.** PATCH `/weekdays` strips that day from every other routine in the same transaction. Last-write-wins, deterministic, no race for a single user. | API (RPC) |
| Routine deleted while assigned to a weekday | Existing FK on `workout_sessions(routine_id)` is `ON DELETE` no action — deleting a routine with sessions fails. **Pre-existing behavior, not changing it.** When delete succeeds, the row is gone, `assigned_weekdays` goes with it, Today recomputes empty. No dangling references. | DB (FK) |
| Empty `assigned_weekdays = '{}'` | Valid state — routine exists but isn't in the weekly rotation. Today ignores it. Preview still works. | DB + Client |
| Cold start (fresh install) | Every routine starts with `'{}'`. Every day is a rest day until Diego assigns. Allison's empty state ships with a CTA to assign. | UX + Client |
| Week rollover (Sunday → Monday) | The Metrics tab "workouts this week" calculation is unchanged. Pre-existing bug with server-side `getDay()` flagged for backlog (§4). | Out of scope |
| DST transition | No-op. `getDay()` is calendar-day-aware. | Client |
| Two browser tabs open, weekly plan changed in tab A | Tab B sees stale data until TanStack stale time (60s) lapses OR tab refocus. Acceptable — Diego is one user, one device most days. | Client |
| Routine deleted, was today's routine | `todaysRoutine` recomputes to `null` on the next `["allRoutines"]` refetch. Hero shows rest day. | Client |
| Server clock drift | Irrelevant — all "today" derivation happens client-side. | N/A |
| User crosses timezone (travel) | `getDay()` reads device TZ. Hero updates to the local day. | Client |
| `assigned_weekdays` array gets corrupted to invalid values (8, -1) | DB CHECK rejects on write. If it somehow exists (manual DB edit), client `.includes()` simply doesn't match → rest day. Fails safe. | DB + Client |
| Diego marks today's routine as complete, then opens Today tab | Hero still shows today's routine card (it's still assigned). Allison decides whether to show "Completed today ✓" state. Data layer is unchanged. | UX |
| Workout in progress, Diego opens Today tab on another tab | Existing behavior — out of scope. | N/A |

**The invariant set:**
1. At most one routine per weekday (enforced by API transaction).
2. Every value in `assigned_weekdays` is in [0..6] (enforced by DB CHECK).
3. No duplicates within a single routine's array (enforced by DB CHECK).
4. Empty array is legal (means "not in weekly rotation").
5. Today's weekday derives from `new Date().getDay()` on the client — always the user's local day.

---

## 8. FinOps / scale lens

Diego is the only user. Lifetime expected scale:
- ≤50 routines, ≤30 routine_items per routine, ≤500 sessions/year, ≤15k sets/year
- All within Supabase Free tier limits for the next several years

**No tier cliffs at current or projected scale.**

### Multi-tenant landmines (FOR THE RECORD — we are NOT shipping these fixes)

If this app ever ships to other users:

1. **No `user_id` anywhere.** Every table is global. Adding tenancy = adding `user_id` to every table + RLS policies + migrating Diego's data into his own row. Big retrofit.
2. **No index on `assigned_weekdays`.** GIN index becomes mandatory at ~10k routines. Trivial to add later.
3. **"Today's weekday" computed on client.** Multi-tenant + scheduled notifications ("It's Wednesday, time for chest day!") would need a server-side tz-aware cron. The Toroko pg_net lesson applies — design the invocation count before shipping.
4. **One-routine-per-day write transaction touches all routines for that user.** With 100 routines per user it's still <1ms; the contention is the issue, not the cost. Multi-user means the transaction needs `WHERE user_id = $current_user` and the touched set is small.
5. **`/api/routines` returns ALL routines + ALL routine_items + ALL machine joins.** Diego has <50 rows total; multi-tenant + 50 users with 50 routines = 2,500 rows, still trivial. At 10k users with 50 routines = 500k rows over time → must paginate + filter by `user_id`. Index needed at that point.

Documenting so Diego knows we're shipping a solo-user app deliberately, not by accident. Marcus (CFO, when activated) would call this "appropriate technical debt." Emmett concurs.

### Cost trajectory (current shape only)

| System | Current tier | What scales it | 10x scenario (Diego's prolific year) | 100x scenario (impossible solo) | Tier cliff |
|---|---|---|---|---|---|
| Supabase | Free | DB writes (sets per workout) | ~150k sets/yr, still < 1MB | n/a | None reachable |
| Vercel | Hobby | Function invocations | ~10k/year (1 visit per workout × 10 endpoints) | n/a | None reachable |

Skipping the rest of the table because the project is solo + no LLM + no image gen + no Sentry yet + no Resend.

---

## 9. Implementation appetite (Shape-Up)

### SMALL (recommend — 5–8 hours focused)

- Schema migration + RPCs (1h)
- Type changes + delete dead routes/UI (1h)
- New `PATCH /weekdays` route + RPC wiring (1h)
- Modify GET `/api/routines/[id]` to include `last_weight` join (1h)
- Today tab rewire: derive `todaysRoutine`, kill `RoutineStartCard`, add `TodayHeroCard` + `RoutineGridCard` (1.5h)
- Preview rewire: weekly assignment chip UI + Start CTA promotion + last_weight column (1.5h)
- E2E hand-test through Sonny's matrix (0.5h)

Ships in one PR. One Vercel preview. Reviewable in <30 min.

### MEDIUM (~12–16 hours — IF Diego wants more polish)

Adds:
- Optimistic update wiring on weekday toggles
- Empty state polish per Allison spec
- Animated transitions for chip-toggle
- "Logged 3 days ago" relative timestamps on `last_weight`
- Backfill the Metrics endpoint TZ bug (out-of-scope for SMALL)

### LARGE (~25+ hours)

Adds (NOT recommended — scope creep):
- Multi-routine-per-day support (drop the invariant, junction table after all)
- Per-weekday rest/active visual on a 7-day strip in the header
- Drag-to-reschedule between days
- Routine "swap today" flow (override for one-off "I'm going to do legs today instead")

**Emmett's recommendation: SMALL.** The architecture decisions above are correct *at SMALL scope.* The MEDIUM additions are pure polish on the same architecture (Allison-driven). LARGE changes the data model and is a separate decision Katie should re-scope.

---

## 10. Acceptance criteria (architectural)

The implementation is done when:

- [ ] `routines.assigned_weekdays SMALLINT[] NOT NULL DEFAULT '{}'` exists in both `schema.sql` and `migration_add_weekly_plan.sql`.
- [ ] `routines.is_default` is dropped from `schema.sql` and the migration.
- [ ] DB CHECK constraints reject values outside 0–6 and reject duplicate weekdays within one routine's array.
- [ ] Postgres RPC `routines_set_weekdays(routine_id UUID, days SMALLINT[])` exists, runs as a single transaction, strips the given days off all other routines before assigning.
- [ ] Postgres RPC `routine_last_sets(routine_id UUID)` exists, returns latest weight + actual_reps + completed_at per routine_item via DISTINCT ON.
- [ ] `Routine` TS type loses `is_default`, gains `assigned_weekdays: Weekday[]`. `Weekday` exported as literal union `0|1|2|3|4|5|6` with JSDoc naming the convention.
- [ ] `RoutineItemWithMachine` gains `last_weight`, `last_actual_reps`, `last_recorded_at` (all nullable).
- [ ] `npx tsc --noEmit` passes with `strict: true`. No `any`. No `as` to silence errors. Exhaustive switches on `Weekday` (if any).
- [ ] `PATCH /api/routines/[id]/weekdays` endpoint exists, validates input shape + value range + duplicate rejection at the API layer (defense in depth on top of DB CHECK).
- [ ] `GET /api/routines/[id]` response includes `last_weight`/`last_actual_reps`/`last_recorded_at` on every routine_item; null when no completed sets exist.
- [ ] `GET /api/routines` does NOT include last-weight data (list endpoint stays lean).
- [ ] `GET /api/routines?default=true` branch removed.
- [ ] `src/app/api/routines/[id]/default/route.ts` file deleted.
- [ ] `RoutineStartCard` component in Today page deleted; replaced with a `<Link>`-based card that routes to `/routines/[id]`.
- [ ] Today page derives `todaysRoutine` from `new Date().getDay()` + the `["allRoutines"]` query, no extra fetch.
- [ ] Routine detail page (`/routines/[id]/page.tsx`) — `Star`, `is_default` references, `setDefaultMutation`, "Set Default" button removed. Weekly assignment UI added (wired to PATCH `/weekdays`). Start CTA promoted to primary.
- [ ] Mutation on `/weekdays` invalidates `["allRoutines"]` and `["routine", routineId]` TanStack keys.
- [ ] Today hero "rest day" state renders correctly when `assigned_weekdays` is empty across all routines OR no routine matches today.
- [ ] One routine assigned to multiple days renders on each of those days correctly.
- [ ] Assigning a day already held by another routine deterministically transfers ownership (Sonny: hand-test this — POST sequence A→Mon, then B→Mon, verify A no longer has Mon).
- [ ] No console errors. No unhandled promise rejections.
- [ ] Rollback SQL is in the migration header comment.
- [ ] One PR. Vercel preview shared. Allison's UX review passed. Sonny's QA matrix passed.

---

## 11. Recommended pattern notes for the implementer

Mobile-first (this app is mobile-web only):
- Weekday chip touch targets ≥44px square. `touch-action: manipulation` on chips to kill double-tap zoom.
- Inputs (if Allison adds any new ones in the weekly plan editor) MUST be `font-size: 16px` on mobile to prevent iOS auto-zoom.
- No `100vh` — use `100dvh` for any new full-height containers. Existing code already follows this convention; don't regress.
- Bottom nav safe-area inset already wired — don't touch.

TypeScript:
- Validate `PATCH /weekdays` body with a small inline schema OR a Zod schema (Zod isn't in the deps today — check before adding). For 6 lines of validation, hand-rolled is fine: `Array.isArray(x) && x.every(v => Number.isInteger(v) && v >= 0 && v <= 6)`, then dedupe with `[...new Set(x)]`. Don't add Zod just for this.
- The `Weekday` literal union catches the bug class "passed `7` for Saturday because ISO 8601 brain." Use it on every signature that takes a day.

React:
- `todaysRoutine` is *derived state* — compute during render: `const todaysRoutine = useMemo(() => routines.find(...), [routines, todayWeekday])`. Do NOT mirror it into a `useState`.
- `todayWeekday` is read once on mount. If concerned about midnight crossover, schedule a recompute via `setTimeout` to the next local 00:00 — but per §4, recommend NOT bothering for v1.
- Weekly plan chip toggle: optimistic update via TanStack `onMutate` + rollback on error. Cache shape stays the same; just replace the routine in the `["allRoutines"]` list.
- Keep the `<Link>` wrapper outside the card visual — accessibility comes for free (Allison will spec ARIA), and Next prefetches on hover.

Error handling:
- PATCH `/weekdays` errors: validation = 400 with `{ error: "Reason" }`. DB constraint violation = 500 with generic error. Don't leak DB error text to the client (Diego is solo user so security is low-stakes, but good hygiene).
- Optimistic update rollback should toast "Couldn't save — try again" (Allison's copy).

Naming:
- `assigned_weekdays` (snake_case at DB/API), `assignedWeekdays` (camelCase at TS — wait, no, we're keeping the snake_case on types because the rest of the codebase does that). Verify: `Routine.created_at`, `Routine.is_default`, `RoutineItem.routine_id`. Yes — snake_case in TS interfaces matches the API JSON exactly. **Keep `assigned_weekdays` snake_case on the TS interface.** Don't transform.

---

## Open questions for the implementer

1. **Optimistic update on weekday toggle — ship in SMALL or defer to MEDIUM?** Recommend defer. Get the data path right first, polish second. Allison may push back if her UX needs the optimistic feel — fine, it's a 30-min addition.
2. **Should the Preview page show "(Today)" badge on the assigned-day chip?** UX decision — Allison.
3. **Where does the "Pick a routine for today" CTA route from the rest-day empty state?** UX decision — Allison. Default: `/routines` list.
4. **Cardio rows on Preview — show `last_weight: 0` as "0 kg" or as "—"?** UX decision — Allison.

---

## Sign-off

Architecture is sound for SMALL appetite. Migration is safe and reversible. No FinOps cliffs. No multi-tenant landmines accidentally locked in (the ones present are documented and deliberate). The query for last-used weight is bounded + indexable later if needed. Sonny has clear test surfaces in §7. Allison owns everything in §5 / §11 marked "UX decision."

**Emmett: GO.** Pending Allison + Sonny convergence on a single joint design doc.
