# Test Matrix — Weekly Plan + Today Tab Rewire + Routine Preview

**Project:** gym-routine-creator (Diego personal)
**Author:** Sonny (QA seat, design phase)
**Status:** DRAFT — design phase (Phase 1). Executed in Phase 3 post-code via Playwright against `localhost:3000` + Vercel preview.
**Companion docs:** `allison-design.md` (UX/IA — pending), `emmett-architecture.md` (architecture — pending). Matrix written self-contained; reconcile when companions land.

---

## Scope of this PR (what we ARE testing)

1. Schema migration: add `assigned_weekdays SMALLINT[]` to `routines`, retire `is_default`.
2. Weekly Plan editor (location TBD by Allison — likely on a Routine's edit page) — pick weekdays for a routine.
3. Today tab rewire — three states:
   - **Planned day** — hero card "[Weekday] -> [Routine name]" + Preview CTA + override grid below.
   - **Rest day** — hero "Rest day — nothing planned" + "Train anyway?" secondary CTA.
   - **Cold start** — no routines at all OR no routines with weekdays assigned.
4. Today's hero card routes to `/routines/[id]` (Preview), NOT directly to the workout player.
5. Preview screen (`/routines/[id]`) gains:
   - Last-used weight per machine (from most recent completed `workout_set`).
   - Primary Start CTA triggers `POST /api/workouts/start`.

## Explicit out of scope (deferred — DO NOT test in this PR)

- Last-time-weight inside the Work Set screen during workout play.
- PR celebration animations / personal record detection.
- Swap-exercise mid-workout.
- Multi-routine-per-day support.
- Multi-user / auth (Diego is solo user — same as today).
- Weekly Plan analytics / adherence metrics.
- Notifications / scheduled reminders.

State this out-of-scope list in the PR description so Diego knows what to expect.

---

## Test ID legend & priorities

- **P0** = blocker. Must pass before merge.
- **P1** = must-fix before merge unless explicitly waived with follow-up ticket.
- **P2** = nice to have / file as follow-up.
- Status markers: ⬜ not run · ✅ pass · ❌ fail · ⏭️ skipped · 🔄 retest

ID prefixes: `HP` happy path · `EC` edge case · `DI` data integrity · `UI` UI/interaction · `PF` performance · `RG` regression · `A11Y` accessibility · `SEC` security/data validation.

---

## 1. Happy paths (P0)

| ID | Priority | Setup | Action | Expected | Notes / Status |
|----|----------|-------|--------|----------|----------------|
| HP-01 | P0 | At least one routine exists with no weekdays assigned. | Open routine edit page → tick Mon + Wed + Fri → save. | Routine persists `assigned_weekdays = [1,3,5]`. Confirmation toast or visible state. | ⬜ Verify via API: `GET /api/routines/:id` returns array. |
| HP-02 | P0 | Routine "Shoulder Builder" has `assigned_weekdays=[2]` (Tue). Today is Tuesday. | Open Today tab. | Hero card renders "Tuesday → Shoulder Builder" with Preview CTA. Override grid renders below. | ⬜ Verify hero is visually distinct from grid items. |
| HP-03 | P0 | Hero card visible (state from HP-02). | Tap hero card. | Router pushes to `/routines/<id>`. No workout session created yet. | ⬜ Check network: NO POST to `/api/workouts/start`. |
| HP-04 | P0 | On Preview screen for the planned routine. | Tap primary Start CTA. | `POST /api/workouts/start` fires → redirects to `/workout/<sessionId>`. Player initializes. | ⬜ Verify session row in `workout_sessions` table. |
| HP-05 | P0 | Routine has at least one prior completed session with logged weights for machine X. | Open Preview for that routine. | Each machine row displays "Last: 60 kg" (or equivalent) using the latest `workout_sets.weight`. | ⬜ Test against most-recent-set semantics, not session avg. |
| HP-06 | P0 | Multiple routines, only one assigned to today. | Open Today. | Hero shows the assigned one. Grid below shows ALL routines (incl. unassigned) as override options. | ⬜ Confirm "override" affordance is obvious to Diego. |
| HP-07 | P0 | Today is the assigned weekday in `Europe/Dublin`. | Open Today on device set to `Europe/Dublin`. | Correct routine surfaces. | ⬜ Baseline tz test. |
| HP-08 | P0 | Diego is mid-workout (in-progress session), navigates back to Today. | Open Today. | Today still shows planned-day hero OR (preferred) shows "Resume workout" banner. Decision flagged in EC-08. | ⬜ Behaviour locked by Allison's design. |

---

## 2. Critical edge cases (P0)

| ID | Priority | Setup | Action | Expected | Why it matters |
|----|----------|-------|--------|----------|----------------|
| EC-01 | P0 | Routine exists with `assigned_weekdays = []` (empty array). | Open Today on any weekday. | Today renders **rest-day** state. No crash. No "undefined". | Empty array is the default for newly-created routines pre-edit. |
| EC-02 | P0 | Zero routines exist (fresh install / wiped DB). | Open Today. | Cold-start state: "No plan configured yet. Create your first routine." with CTA to Routines tab or Routine builder. | First-run experience — never crash. |
| EC-03 | P0 | Today's weekday has NO routine assigned, but other routines have other weekdays. | Open Today. | Rest-day state with "Train anyway?" CTA. NOT cold-start state. | These states are visually distinct — must not collapse. |
| EC-04 | P0 | User opens Today at 23:59:55 on Monday. Leaves screen on. Clock crosses to Tuesday 00:00:00. | Wait through midnight. | App refreshes hero to Tuesday's plan within 60s, OR on next interaction/focus. Document the chosen behaviour. | "Today" is derived from device clock. Stale UI on midnight is confusing. **Acceptable v1:** stale until next focus/visibility event. Spec it. |
| EC-05 | P0 | Date is last Sunday of March (DST spring forward in Ireland — clock jumps 01:00 → 02:00). | Set device to 2027-03-28 around the transition. Open Today. | Day-of-week derivation still returns Sunday. No off-by-one. | Date math via `Date.getDay()` is tz-aware in JS — verify regardless. |
| EC-06 | P0 | Date is last Sunday of October (DST fall back in Ireland). | Set device to 2027-10-31. Open Today. | Same as EC-05 — Sunday throughout. No duplicate day-of-week. | The "repeated hour" doesn't change day-of-week, but assert it explicitly. |
| EC-07 | P0 | Device tz = `America/New_York`. Local time = Mon 23:00 (= Tue 04:00 Dublin). | Open Today. | App uses **device tz** for "today" (Monday). Document this as v1 behaviour for the PR description. | Katie's Q4 — accept device tz for v1, surface in release notes. Flag for v2 if Diego cares. |
| EC-08 | P0 | Diego has IN_PROGRESS `workout_sessions` row AND today has a planned routine. | Open Today. | Decision: **Resume banner takes precedence** over the planned hero (proposed). Hero still rendered below or replaced — Allison decides. | Two CTAs for "start a workout" on the same screen confuses. Lock priority. |
| EC-09 | P0 | Diego abandons workout (status='abandoned'). Refreshes Today same day. | Pull-to-refresh or reload. | Planned-day hero reappears. Abandoned session doesn't block the day. | Abandon must not "consume" the day. |
| EC-10 | P0 | A routine assigned to Tuesday is **deleted** while sitting in DB. | Open Today on Tuesday. | Today renders rest-day state (no crash from dangling FK / stale cache). | Stale query cache risk via TanStack Query. |
| EC-11 | P0 | Routine has `assigned_weekdays = [0,1,2,3,4,5,6]` (every day). | Open Today on each weekday. | Same routine surfaces every day. No duplicates in hero. | Sanity check on full coverage. |
| EC-12 | P0 | Zero routines have any weekday assigned (all are `[]`), but routines exist. | Open Today. | Rest-day state with "Train anyway?" CTA → routes to picker / Routines tab. NOT cold-start. | Distinguish "configured but resting" from "never configured". |
| EC-13 | P0 | Two routines both have Tuesday assigned (multi-routine-per-day was supposed to be prevented). | Open Today on Tuesday. | Server SHOULD prevent this at the API layer. If somehow it slips through, UI picks **deterministically** (e.g. most-recently-updated) and does NOT crash. Surface a warning toast. | Multi-routine-per-day is out of scope but server is the trust boundary, not UI. |
| EC-14 | P1 | Diego is on Today, backgrounds the app for 12 hours, returns next day. | Resume app. | Today re-derives weekday on visibility change / focus. Hero updates. | iOS / Android PWA behaviour — `visibilitychange` listener required. |
| EC-15 | P1 | Network offline. | Open Today (cache-warm). | Renders last-known plan from TanStack cache. Override grid still tappable (will fail on start, surface error). | Offline gym scenario — Diego is in a basement. |

---

## 3. Data integrity (P0)

| ID | Priority | Setup | Action | Expected | Notes |
|----|----------|-------|--------|----------|-------|
| DI-01 | P0 | Schema constraint on `assigned_weekdays` values. | Attempt `INSERT` / `UPDATE` with value `7` or `-1` in the array. | DB rejects (CHECK constraint or trigger). API returns 400. | Emmett must add CHECK: `assigned_weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]`. |
| DI-02 | P0 | API receives `[1, 1, 3]` (duplicate Monday). | POST/PATCH routine. | Server dedupes to `[1,3]` OR rejects with 400. Decide: **dedupe silently** (recommended) to be forgiving. | UI prevents but server is the truth. |
| DI-03 | P0 | API receives malformed payload: `["1","3"]` (strings) or `[null]`. | POST/PATCH routine. | 400 with clear error message. No silent coercion. | Trust boundary. |
| DI-04 | P0 | API receives `assigned_weekdays: null`. | POST/PATCH routine. | Treated as `[]` OR rejected — decide. Recommend: coerce to `[]` for forgiveness. | Distinguish null vs missing field. |
| DI-05 | P0 | Migration runs against DB with existing routines where `is_default = true`. | Run migration. | All routines get `assigned_weekdays = []` (empty). `is_default` column dropped only after Diego confirms no rollback needed. Add it as a SEPARATE migration. | Two-step migration: (a) add column, default `'{}'::smallint[]`, backfill nothing; (b) later, drop `is_default`. NEVER both in one migration. |
| DI-06 | P0 | Concurrent updates: Diego edits weekly plan on two devices (e.g. phone + laptop). | Both submit different `assigned_weekdays` arrays within 5s. | Last-write-wins. Array never ends up corrupted / partial. | No optimistic-concurrency needed (solo user) but verify array isn't merged half-way. |
| DI-07 | P0 | Routine assigned to Tuesday is deleted. | DELETE routine. | Cascade properly: `routine_items` cascade (already in schema). `workout_sessions` retain `routine_id` ref (or NULL it) — verify FK behaviour matches existing. | `workout_sessions.routine_id` currently has no `ON DELETE` clause → defaults to NO ACTION. Deleting a routine with completed workouts will FAIL. **Flag to Emmett** — needs decision: SET NULL or block delete with sessions. |
| DI-08 | P0 | Read endpoint sorts / dedupes. | `GET /api/routines/:id`. | Response `assigned_weekdays` is sorted ascending and deduped. | Predictable client rendering. |
| DI-09 | P1 | Seed script `seed-routines.ts` runs. | Run seeder. | Seeded routines get sensible defaults (e.g. spread across weekdays OR all `[]` — design choice). Document in seed file header. | Decide once, document. |
| DI-10 | P1 | API receives 14 elements (more than 7). | POST/PATCH with `[0,1,2,3,4,5,6,0,1,2,3,4,5,6]`. | Server caps after dedupe to ≤7 unique values 0-6. | Hardening. |

---

## 4. UI / interaction (P1 unless noted)

| ID | Priority | Setup | Action | Expected | Notes |
|----|----------|-------|--------|----------|-------|
| UI-01 | P1 | Weekly Plan editor open. | Tab through weekday picker. | Focus order = Sun → Mon → ... → Sat (or Mon → Sun by user locale; pick one). Enter / Space toggles. | Keyboard accessibility — Allison spec. |
| UI-02 | P1 | Today hero card with a long routine name ("Upper Body Push Day — Strength Block 3"). | Render hero. | Text truncates with ellipsis or wraps cleanly within card. No layout shift. | Test with 50+ char name. |
| UI-03 | P0 | Today rest day. | Tap "Train anyway?". | Flow defined: either modal picker of all routines OR navigation to Routines tab. **Decide once.** Recommend modal — keeps Diego on Today. | Allison locks. |
| UI-04 | P0 | On Preview screen via Today's hero card. | Tap back button (browser / hardware / nav). | Land on Today, NOT 404, NOT Routines tab. | History stack discipline. Use Next.js `router.push` (not `replace`) on hero tap so back works. |
| UI-05 | P1 | Workout history "Recent Workouts" exists on current Today. | Open new Today layout. | History section persists below planned hero / override grid. Or relocated per Allison. **Must not disappear.** | Existing feature — don't regress. |
| UI-06 | P1 | Override grid renders below hero on a planned day. | Tap a non-planned routine tile. | Goes to that routine's Preview (same flow as hero). NOT direct start. Consistent. | Single Preview gate. |
| UI-07 | P1 | Weekly Plan editor — Diego unchecks all weekdays. | Save. | Allowed. Routine becomes "unscheduled" — appears in override grid but never as hero. | Empty array valid. |
| UI-08 | P1 | Weekly Plan editor — Diego tries to assign Tuesday but another routine already owns Tuesday. | Tick Tuesday → save. | Two options: (a) hard error "Tuesday already assigned to Shoulder Builder. Reassign?", (b) silent steal. Recommend **(a) confirmation modal**: "Tuesday is currently Shoulder Builder. Switch?" | Multi-routine-per-day = out of scope, so enforce one-per-day. |
| UI-09 | P1 | Tap hero CTA rapidly (double-click). | Tap Preview / Start twice in 200ms. | Single nav / single POST. Button disables on first tap. | Prevent double-start. |
| UI-10 | P1 | Preview screen renders for routine with 0 machines (edge — user created routine then never added machines). | Open Preview. | "No machines yet" empty state. Start CTA hidden or disabled with helper "Add machines to start". | Don't POST empty workout. |
| UI-11 | P1 | Preview last-used weight on a machine that has NEVER been used. | Render. | Shows "— kg" or "First time" — does NOT show "0 kg" (misleading) or crash. | Default-weight fallback only if explicitly set on the routine_item. |
| UI-12 | P1 | Weekday hero label shows current day name. | Open Today on Tuesday. | Label says "Tuesday" or "Today, Tuesday" — Allison decides. Localized to en-IE (date-fns or Intl). | Avoid hard-coded English if Diego ever travels — but en-IE is fine v1. |
| UI-13 | P2 | Pull-to-refresh on Today (PWA / mobile). | Pull down. | Refetches routines + history. Hero re-evaluates. | Optional v1. |
| UI-14 | P1 | Tap Preview hero on Today → land on Preview → tap Start → land on Player → tap back. | Full flow back navigation. | Back from Player goes to Preview (existing). Back from Preview goes to Today. | Three-level back stack. |

---

## 5. Performance (P1)

| ID | Priority | Setup | Action | Expected | Notes |
|----|----------|-------|--------|----------|-------|
| PF-01 | P1 | Today tab fresh load. | Cold load `/`. | Time to interactive ≤ current baseline (capture pre-PR). LCP ≤ 2.5s on simulated mobile 4G. | Establish baseline before PR work begins. |
| PF-02 | P1 | Preview with ~100 prior completed sessions on this routine. | Open Preview. | Last-used-weight query returns in <300ms. Single round-trip — no N+1 across machines. | Verify SQL: should be a single JOIN keyed on `routine_item_id` with `MAX(completed_at)` window. |
| PF-03 | P1 | Routines list — Today queries `/api/routines`. | Load. | No regression vs current load time. Payload ≤ current + minor overhead from `assigned_weekdays` field. | Field is small (int array ≤7). |
| PF-04 | P2 | TanStack Query staleTime is 60s globally. | Open Today, change weekday plan in another tab, come back. | Stale cache for ≤60s is acceptable. Document. | Solo user — low concurrency, low stakes. |
| PF-05 | P1 | Lighthouse mobile run on Today and Preview. | `npx lighthouse <preview-url> --form-factor=mobile --throttling-method=simulate`. | Performance score not regressed from baseline. CLS ≤ 0.1. | Run baseline pre-PR. |

---

## 6. Regression (P0) — what MUST still work

| ID | Priority | Area | Test | Expected | Notes |
|----|----------|------|------|----------|-------|
| RG-01 | P0 | Workout player | Start a workout → working → resting → hydrating → summary. | Full flow unchanged. State machine in `workout-player.ts` untouched. | Diff guard: zero lines changed in `src/stores/workout-player.ts` unless intentional. |
| RG-02 | P0 | Routines tab | List all routines, edit, delete. | All works. | `/routines` page + edit/delete flows. |
| RG-03 | P0 | Metrics tab | Compute and render correctly. | No null-ref crashes from missing `is_default` if Metrics referenced it. | **Grep for `is_default`** across `src/` before merge. |
| RG-04 | P0 | Machines tab | List + filter machines. | Unchanged. | Read-only. |
| RG-05 | P0 | Workout history on Today | Loads + opens detail modal. | Still functional in new layout. | Don't drop the section. |
| RG-06 | P0 | Seed script `seed-routines.ts` | Runs without error against new schema. | Seeds with or without `assigned_weekdays` (document choice in seeder). | Failing here breaks dev workflow. |
| RG-07 | P0 | `/build/[id]` route (legacy build tab) | Open via direct URL. | Still loads + editing works (per Diego's note that URL exists even though tab nav has changed). | Test direct URL navigation only — no nav entry expected. |
| RG-08 | P0 | Routine detail `/routines/[id]` | Existing actions (Edit / Duplicate / Delete) still work after Preview rewrite. | All buttons intact. | Preview adds last-used weight + Start; doesn't remove existing CRUD. |
| RG-09 | P0 | `is_default` retirement | Search codebase for `is_default` references. | Zero remaining references after PR. UI doesn't try to render a Star icon based on stale prop. | `grep -rn "is_default" src/` returns nothing. |
| RG-10 | P0 | Existing `/api/routines/:id/default` endpoint | Probe endpoint. | Returns 404 / 410 OR removed cleanly. No 500. | Remove the route file. Update any client callers. |
| RG-11 | P0 | Existing `StartWorkoutButton` component on `/routines/[id]` | Render. | Replaced by the new primary Start CTA driven by Preview. Verify no orphan component left. | Component file should be updated or deleted. |
| RG-12 | P0 | Workout session that's IN_PROGRESS at PR merge time. | Resume player. | Works against new schema (no breakage from migration). | Migration is additive — verify. |
| RG-13 | P0 | Type generation | `npx tsc --noEmit`. | Zero errors. `Routine` interface updated to include `assigned_weekdays: number[]`, drop `is_default` (or keep as deprecated). | Run as pre-commit gate. |
| RG-14 | P0 | API contract | `GET /api/routines` returns `assigned_weekdays` on every routine. | Field always present, never undefined. Default to `[]`. | Server-side default. |

---

## 7. Accessibility (P1)

| ID | Priority | Surface | Test | Expected | Notes |
|----|----------|---------|------|----------|-------|
| A11Y-01 | P1 | Today (planned + rest + cold start) | axe-core scan via Playwright. | Zero critical, zero serious violations. | Run three times — once per state. |
| A11Y-02 | P1 | Weekly Plan editor | axe-core scan. | Zero critical / serious. Weekday toggles labelled (`aria-pressed` or proper checkbox semantics). | Toggle group accessibility. |
| A11Y-03 | P1 | Preview screen | axe-core scan. | Zero critical / serious. Last-used weight column has accessible label ("Last used: 60 kilograms"). | Avoid pure visual annotation. |
| A11Y-04 | P1 | Today hero card | Screen reader (VoiceOver / TalkBack) announces. | "Today is Tuesday. Planned routine: Shoulder Builder. Tap to preview." Clear, complete. | Use `aria-label` on the wrapping link/button. |
| A11Y-05 | P1 | Today rest-day state | Screen reader. | "Rest day. No routine planned. Train anyway?" — buttons reachable. | Don't bury CTA. |
| A11Y-06 | P1 | Focus order | Tab from top of Today. | Header → hero card → override grid items → history items. Logical. | No focus traps. |
| A11Y-07 | P1 | Preview Start CTA | Keyboard only. | Tab to Start, Enter activates, navigates to player. | Activated via Enter AND Space. |
| A11Y-08 | P1 | Color contrast on hero card | Manual + axe. | Hero text ≥ 4.5:1 on background. CTA ≥ 4.5:1. | Test against dark theme `--bg-card`. |
| A11Y-09 | P2 | Reduced motion | `prefers-reduced-motion` enabled. | Any new animations on Today hero (entrance, pulse) respect the preference. | Optional v1 — but cheap. |

---

## 8. Security / data validation (P0)

| ID | Priority | Surface | Test | Expected | Notes |
|----|----------|---------|------|----------|-------|
| SEC-01 | P0 | `POST /api/routines` & `PATCH` | Send `assigned_weekdays: "[1,2,3]"` (string instead of array). | 400 with validation error. No DB write. | Zod / runtime validator at the API boundary. |
| SEC-02 | P0 | `PATCH` | Send `assigned_weekdays: [99]`. | 400, rejected at validator. CHECK constraint as safety net if it slips. | Defence in depth. |
| SEC-03 | P0 | `PATCH` | Send `{"assigned_weekdays": [1,2,3], "id": "<different-uuid>"}` — try to flip another routine. | API ignores body `id`, only uses URL param. Solo user but discipline matters. | Don't trust client. |
| SEC-04 | P0 | Service role key | Inspect `src/lib/supabase/server.ts`. | Service role key never logged, never returned in any API response. | Existing posture — verify unchanged. |
| SEC-05 | P0 | `GET /api/routines` | Inspect response. | No service role key, no PII (none exists), no internal IDs leaked beyond what UI needs. | Sanity. |
| SEC-06 | P1 | Migration script | Inspect SQL. | No `DROP TABLE`, no destructive ops beyond intentional `is_default` drop (which is on its own follow-up migration). | Read SQL line by line. |
| SEC-07 | P1 | XSS via routine name (`"Shoulder Builder <img src=x onerror=alert(1)>"`). | Create routine with that name, view on Today hero + Preview. | Name rendered as text, NOT as HTML. React's default escaping handles this — verify nothing uses `dangerouslySetInnerHTML`. | Grep for `dangerouslySetInnerHTML` in changed files. |
| SEC-08 | P1 | SQL injection via routine name. | Create routine with name `'); DROP TABLE routines; --`. | Persists as literal string. No SQL execution. | Supabase client uses parameterized queries — trust but verify in any new raw SQL. |

---

## 9. Migration-specific (P0)

| ID | Priority | Action | Expected | Notes |
|----|----------|--------|----------|-------|
| MIG-01 | P0 | Apply migration on local Supabase against a DB with N existing routines. | All routines get `assigned_weekdays = '{}'::smallint[]`. No data loss. | Run on a backup first. |
| MIG-02 | P0 | Apply migration on a DB with in-progress workout sessions. | Sessions unaffected. Player resumable. | Additive only. |
| MIG-03 | P0 | Roll back migration (DOWN script). | Schema reverts cleanly. `is_default` re-added with default FALSE. | Required: DOWN must exist. |
| MIG-04 | P0 | Verify CHECK constraint blocks `[8]` insert via raw SQL. | Insert fails. | Trust the DB, not just the API. |
| MIG-05 | P1 | Verify index decision. | If Today query filters routines by `assigned_weekdays @> ARRAY[<today>]`, a GIN index helps. Solo user = probably skippable. Flag to Emmett. | Don't over-index. |

---

## 10. Test execution plan (Phase 3)

When the code lands, Sonny runs:

1. **`npx tsc --noEmit`** — must be zero errors before any Playwright run.
2. **`npm run lint`** — zero warnings on changed files.
3. **Local Supabase reset** — apply migration on a fresh local DB. Run MIG-01 → MIG-05.
4. **Dev server up** (`npm run dev`) → Playwright runs HP-01 through RG-14 sequentially.
5. **Time-warp tests** (EC-04, EC-05, EC-06) — use `browser_evaluate` to mock `Date` for midnight and DST scenarios, OR document as manual checks if mocking is fragile.
6. **axe-core** — A11Y-01 → A11Y-09.
7. **Lighthouse mobile** — PF-01 + PF-05 against `localhost` and Vercel preview.
8. **Security probes** — SEC-01 → SEC-08 via direct `fetch` / `curl` calls.
9. **Update matrix file** — status column populated, "Last run" date set.
10. **Report to Smith** — pass/fail summary, blocker list, follow-up tickets.

---

## 11. Open questions for Allison / Emmett / Smith

These are decisions the matrix needs locked before Phase 3:

1. **Q-A1 (Allison):** "Train anyway?" CTA flow — modal picker on Today, or navigation to Routines tab? (Drives UI-03.)
2. **Q-A2 (Allison):** Workout history section placement in new Today layout. Below hero? Below grid? (Drives UI-05.)
3. **Q-A3 (Allison):** Resume-in-progress banner vs planned hero priority on Today. (Drives EC-08.)
4. **Q-A4 (Allison):** Weekday locale start — Sunday-first or Monday-first? Diego is in Ireland — Monday-first is conventional. Lock it. (Drives UI-01.)
5. **Q-E1 (Emmett):** `workout_sessions.routine_id` has no `ON DELETE` clause. Decision: `SET NULL` (preserve history, lose routine name on history cards) or block delete when sessions exist? (Drives DI-07.)
6. **Q-E2 (Emmett):** Conflict on assigning a weekday already owned by another routine — hard error / confirmation modal / silent steal? Recommend confirmation modal. (Drives UI-08.)
7. **Q-E3 (Emmett):** Last-used-weight query shape — JOIN + window function or N+1 fetch? Recommend single-query with `DISTINCT ON (routine_item_id) ... ORDER BY completed_at DESC`. (Drives PF-02.)
8. **Q-E4 (Emmett):** Migration as one PR or split (add column → ship → drop `is_default` later)? Recommend split for safety. (Drives DI-05.)
9. **Q-S1 (Smith):** Should v1 ship with explicit "device tz" disclosure in PR description, or silently accept? (Drives EC-07.)

---

## 12. Coverage summary

| Section | Count | P0 | P1 | P2 |
|---------|-------|----|----|----|
| Happy paths | 8 | 8 | 0 | 0 |
| Edge cases | 15 | 13 | 2 | 0 |
| Data integrity | 10 | 8 | 2 | 0 |
| UI / interaction | 14 | 3 | 10 | 1 |
| Performance | 5 | 0 | 4 | 1 |
| Regression | 14 | 14 | 0 | 0 |
| Accessibility | 9 | 0 | 8 | 1 |
| Security | 8 | 5 | 3 | 0 |
| Migration | 5 | 4 | 1 | 0 |
| **Total** | **88** | **55** | **30** | **3** |

55 P0 cases must pass before merge. The 9 open questions in §11 must be resolved before Phase 3 execution starts — every one of them blocks at least one P0 row above.

---

*Sonny — Senior QA. Phase 1 deliverable.*
