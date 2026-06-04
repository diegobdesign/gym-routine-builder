# Weekly Plan — Joint Design Doc

**Status:** Greenlit. Build phase.
**PM:** Katie · **Design:** Allison · **Architecture:** Emmett · **QA:** Sonny · **Integrator:** Smith
**Slices:** [`allison-design.md`](./allison-design.md) · [`emmett-architecture.md`](./emmett-architecture.md) · [`sonny-test-matrix.md`](./sonny-test-matrix.md)
**Source spec:** Katie's Mode 1 review (in session)
**Appetite:** SMALL (5–8h, one PR)

This doc is the synthesis. It does not repeat the slices — it locks the decisions where they diverged, captures Diego's calls, and sets the build order.

---

## 1. Locked decisions

### From Diego (this session)

| # | Decision | Resolves | Impact |
|---|----------|----------|--------|
| D1 | Bundle Weekly Plan + Today rewire + Preview as one ship | Katie §5 | One PR, not three |
| D2 | Smith seeds 4–6 new routines in parallel | Katie §3 (#1 deferred → reactivated by Diego) | Side task, not blocking the PR |
| D3 | Schema: simple `assigned_weekdays SMALLINT[]` array (no junction table) | Katie 1-pager Q1 | Emmett §1 stays |
| D4 | Retire `is_default` | Katie 1-pager Q2 | Emmett §1 + Allison §3 (star UI gone) |
| D5 | `ON DELETE SET NULL` on `workout_sessions.routine_id` | Sonny Q-E1 / DI-07 | Pre-existing bug fixed in same migration |
| D6 | Confirmation modal on day conflict (not silent transfer) | Sonny Q-E2 / UI-08 | Modifies Emmett §3 RPC flow — client confirms BEFORE the PATCH fires |
| D7 | Resume-in-progress takes precedence over planned hero | Sonny Q-A3 / EC-08 | New hero variant: "Resume" — adds to Allison's three variants |
| D8 | Synthesize, then build (no further design review) | Smith routing | Build starts after this doc lands |

### Reconciled between slices

| # | Conflict | Resolution | Owner |
|---|----------|------------|-------|
| R1 | Migration: Emmett one-step, Sonny two-step | **Two-step** (DI-05). Migration A adds `assigned_weekdays` + adjusts FK on `workout_sessions.routine_id`. Migration B drops `is_default`. Both in this PR's migration folder, applied sequentially. | Emmett |
| R2 | Last-used weight on cardio rows | Show `Last: 20 min · 3 days ago` (use `actual_reps` as minutes) if cardio; else `Last: 42.5 kg × 10 · 3 days ago`. No-history fallback unchanged. | Implementer |
| R3 | Today hero CTA copy: Emmett "Start" / Allison "Preview workout" | **"Preview workout"** wins — tap routes to Preview, not player. Copy matches action. | Allison |
| R4 | Time estimate `~45 min` on hero | **Show it.** Compute `Math.round(sum(sets × (rest_seconds + 60)) / 60 / 5) × 5`. Clamp minimum `~10 min`. Don't fake — if every routine_item has 0 sets/rest (broken seed), drop the line. | Implementer |
| R5 | Optimistic update on weekday toggle | **Defer to follow-up.** Get the data path right; polish second. (Emmett §9 recommendation.) | Implementer |
| R6 | New routines seed | Run AFTER schema migration lands so seeded routines can ship with `assigned_weekdays` already set. Smith handles in a follow-up commit on the same branch. | Smith |

---

## 2. The new "Resume in-progress" hero variant (D7)

Allison spec'd three variants (planned / rest / cold start). Diego picked Resume-takes-precedence. Adds a **fourth variant** that wins over all three when there's an `in_progress` session.

### Layout

```
┌─────────────────────────────────────────────┐
│  Today                              [⚙]    │
│  Tuesday · June 4                            │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │  IN PROGRESS                          │  │  ← eyebrow, accent-amber
│  │                                       │  │
│  │  Shoulder Builder                     │  │
│  │                                       │  │
│  │  2 of 5 exercises done · 18 min in   │  │  ← progress meta
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │   ▶  Resume workout             │  │  │  ← primary CTA, accent-green
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Tuesday's plan: Back Builder          [v]  │  ← collapsed — visible but secondary
│                                             │
│  ── Recent Workouts ──                      │
└─────────────────────────────────────────────┘
```

### Behavior

- Check on Today render: any `workout_sessions` where `status = 'in_progress'`, sorted by `started_at DESC`, take the most recent.
- If exists → render Resume variant. Today's plan still mentioned below the hero (collapsed), so Diego sees the schedule without it competing for the CTA.
- Resume button routes to `/workout/[sessionId]` (existing player — resumes where left off via `initWorkout` existing logic).
- Once the session is completed or abandoned, hero falls back to planned / rest / cold-start variant on next render.

### Microcopy

- Eyebrow: `IN PROGRESS` (uppercase, accent-amber to distinguish from green CTA)
- Progress line: `{X} of {Y} exercises done · {Z} min in` — compute elapsed from `started_at` to now, round to nearest minute. If no sets completed yet, show `Started {N} min ago`.
- Demoted plan line: `Tuesday's plan: {routineName}` (or `Tuesday's plan: Rest day`)
- Primary CTA: `Resume workout` (NOT "Continue" — matches existing app vocabulary)

---

## 3. Day-conflict confirmation modal (D6)

Emmett's RPC pattern was "silent steal" — assigning Tuesday to Routine B strips Tuesday off Routine A in the same transaction. Diego picked **confirmation first**.

### Flow

1. User taps Tuesday in the Weekly Plan picker for Routine B.
2. Client checks the cached `["allRoutines"]` data: does any *other* routine have `2` in `assigned_weekdays`?
3. If **no** → fire PATCH `/weekdays` immediately with the new array. RPC runs the atomic update (no transfer needed).
4. If **yes** → show confirmation modal:
   ```
   ┌───────────────────────────────────────┐
   │  Tuesday is currently Back Builder    │
   ├───────────────────────────────────────┤
   │  Switching means Back Builder won't   │
   │  be on Tuesday anymore.               │
   │                                       │
   │  [ Cancel ]    [ Switch ]             │
   └───────────────────────────────────────┘
   ```
   - **Switch** → fire PATCH `/weekdays` → RPC does the atomic transfer.
   - **Cancel** → no-op. Picker stays open, current selection unchanged.
5. The RPC itself is unchanged from Emmett §3 — it always strips conflicting days off others. The modal is purely a client-side UX gate before the call.

This is defense-in-depth: UI prevents accidental clobber, server enforces invariant regardless.

---

## 4. FK reconciliation (D5)

Pre-existing schema: `workout_sessions.routine_id UUID REFERENCES routines(id)` — no `ON DELETE`. Deleting a routine with completed sessions currently fails (Sonny found this).

**Fix in this PR's first migration:**

```sql
ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_routine_id_fkey;

ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_routine_id_fkey
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL;
```

`workout_sessions.routine_id` becomes nullable (it already is in TS — no type change). Workout history cards on Today must handle `routine: null` gracefully — show `Workout · 45 min` instead of `Shoulder Builder · 45 min` when the routine was deleted.

Sonny adds new test cases for the "deleted routine, history still renders" path. Existing `WorkoutHistoryCard` likely already null-checks; verify.

---

## 5. Implementation order

Linear sequence — each step depends on the prior. SMALL appetite (5–8h).

| # | Step | Touches | Verifier |
|---|------|---------|----------|
| 1 | Create feature branch `feature/gym-weekly-plan` | git | — |
| 2 | Migration A: `assigned_weekdays` column + CHECK constraints + RPCs + FK fix | `supabase/migration_add_weekly_plan.sql`, `supabase/schema.sql` | Run via Supabase MCP `apply_migration` |
| 3 | Migration B: drop `is_default` | `supabase/migration_drop_is_default.sql`, `supabase/schema.sql` | Same |
| 4 | TS type updates | `src/types/index.ts` | `npx tsc --noEmit` |
| 5 | Delete dead routes + API surface | `src/app/api/routines/[id]/default/route.ts` (delete), `src/app/api/routines/route.ts` (remove `?default=true` branch) | tsc |
| 6 | New PATCH `/api/routines/[id]/weekdays` route | `src/app/api/routines/[id]/weekdays/route.ts` (new) | tsc + manual fetch |
| 7 | Modify GET `/api/routines/[id]` to attach last-used weight via RPC | `src/app/api/routines/[id]/route.ts` | tsc + manual fetch |
| 8 | Preview screen rewire — kill star/default UI, promote Start CTA, kebab menu, last-used weight column, assigned-days chip, weekly assignment editor sheet trigger | `src/app/(tabs)/routines/[id]/page.tsx`, `src/components/ui/...` as needed | Visual / dev server |
| 9 | Weekly Plan editor sheet | `src/components/routines/weekly-plan-sheet.tsx` (new) | Visual |
| 10 | Today tab rewire — derive `todaysRoutine`, derive `resumeSession`, kill `RoutineStartCard`, add `TodayHeroCard` (4 variants) + `RoutineGridCard`, add gear icon | `src/app/(tabs)/page.tsx`, `src/components/today/...` (new folder) | Visual |
| 11 | History card null-routine handling | `src/components/workout/workout-history-card.tsx` (verify) | Visual |
| 12 | Smith seeds 4-6 new routines with `assigned_weekdays` set | `scripts/seed-routines.ts` (extend) | Run script |
| 13 | `npx tsc --noEmit` + `npm run lint` + `npm run build` | — | All pass |
| 14 | Commit, push, PR | — | Vercel preview |
| 15 | Sonny executes test matrix Phase 3 (post-merge or pre-merge as Diego prefers) | Playwright | Matrix file updated |

---

## 6. Final acceptance criteria (merged)

Drawn from Allison §7, Emmett §10, Sonny test matrix §6. De-duped, ordered.

### Schema & API

- [ ] Two migrations applied: (A) `assigned_weekdays SMALLINT[]` + CHECK + RPCs + FK SET NULL; (B) drop `is_default`.
- [ ] `routines.assigned_weekdays` is `NOT NULL DEFAULT '{}'::SMALLINT[]`, every value 0-6, no duplicates within array.
- [ ] RPC `routines_set_weekdays(routine_id UUID, days SMALLINT[])` strips conflicting days atomically.
- [ ] RPC `routine_last_sets(routine_id UUID)` returns latest weight/actual_reps/completed_at per routine_item.
- [ ] `workout_sessions.routine_id` has `ON DELETE SET NULL`.
- [ ] `is_default` column dropped; `/api/routines/[id]/default/route.ts` file deleted; `?default=true` query branch removed.
- [ ] New PATCH `/api/routines/[id]/weekdays` validates payload (array of ints 0-6, dedupe), calls RPC, returns updated routine.
- [ ] GET `/api/routines/[id]` includes `last_weight`/`last_actual_reps`/`last_recorded_at` per routine_item.
- [ ] GET `/api/routines` returns lean response (no last-weight enrichment).

### TypeScript

- [ ] `Weekday = 0|1|2|3|4|5|6` literal union exported.
- [ ] `Routine` gains `assigned_weekdays: Weekday[]`, loses `is_default`.
- [ ] `RoutineItemWithMachine` gains `last_weight`, `last_actual_reps`, `last_recorded_at`.
- [ ] `npx tsc --noEmit` passes with strict mode. No `any`. No `as` to silence.

### Today tab

- [ ] Planned variant: hero shows weekday eyebrow + routine name + meta line + `Preview workout` CTA routing to `/routines/[id]`.
- [ ] Rest variant: no green, italic body, `Train anyway` outline button opens routine picker modal.
- [ ] Cold-start variant: centered, `Set up weekly plan` primary, `Or pick a routine for today →` tertiary.
- [ ] Resume variant: amber eyebrow `IN PROGRESS`, routine name, progress meta, `Resume workout` CTA → `/workout/[sessionId]`. Today's plan rendered collapsed below.
- [ ] Resume variant supersedes other three when any `in_progress` session exists.
- [ ] Gear icon top-right (hidden in cold-start) opens Weekly Plan sheet.
- [ ] `Choose a different routine` expandable list shows all other routines on planned day.
- [ ] Recent Workouts section renders unchanged below the hero.

### Preview screen (`/routines/[id]`)

- [ ] Star icon, `is_default` UI, "Set Default" button, `setDefaultMutation` all gone.
- [ ] Full-width primary `Start workout` button directly under header.
- [ ] Edit/Duplicate/Delete demoted to kebab (⋯) bottom action sheet.
- [ ] `Assigned: Mon · Wed · Fri` chip row shows if `assigned_weekdays.length > 0`.
- [ ] Per machine row: `Last: 42.5 kg × 10 · 3 days ago` (strength) or `Last: 20 min · 3 days ago` (cardio) or `No previous session` (no history).
- [ ] Delete confirmation dialog matches microcopy spec.

### Weekly Plan editor

- [ ] Full-screen bottom sheet, weekday-per-row (Mon→Sun), each row shows routine OR `Rest day`.
- [ ] Today's row has accent-bar + inline indicator.
- [ ] Tapping a row opens picker modal with `Rest day` at top, then all routines.
- [ ] Day-conflict triggers confirmation modal "Tuesday is currently Back Builder. Switch?" — Cancel = no-op, Switch = fires PATCH.
- [ ] No Save button — auto-save per selection. Sheet close returns focus to gear trigger.
- [ ] Discoverable from: Today gear icon, cold-start CTA, Routines tab `Weekly plan ›` link.

### Accessibility

- [ ] WCAG 2.2 AA compliance per Allison §6. Hero card reads as single coherent unit via `sr-only` weekday pairing.
- [ ] All interactive elements ≥ 44×44 px touch target.
- [ ] Focus order matches Allison §6 spec; keyboard nav reaches everything.
- [ ] `prefers-reduced-motion` disables sheet slide + hero cross-fade.
- [ ] Color contrast: accent-green CTAs pass AA on `--bg-app` and `--bg-card`.
- [ ] axe-core scan on Today (all 4 variants) + Preview + Weekly Plan sheet: zero critical, zero serious.

### Regression

- [ ] Workout player flow unchanged (`src/stores/workout-player.ts` untouched).
- [ ] Routines list, Machines tab, Metrics tab unchanged.
- [ ] Workout history loads on Today; handles `routine: null` for deleted-routine sessions.
- [ ] `seed-routines.ts` runs without error against new schema; new routines have `assigned_weekdays` set sensibly.
- [ ] `grep -rn "is_default" src/` returns zero hits after PR.

---

## 7. Hand-off

This doc + the three slices are the build brief. Smith implements per §5 sequence. Sonny executes the test matrix in Phase 3.

**Out of scope (parking lot):**
- Optimistic update on weekday toggle (R5 — follow-up)
- Pre-existing Metrics tz bug (Emmett §4 — backlog)
- Last-time weight on Work Set screen + PR celebration (next ship — Katie §5)
- Mid-workout swap (next ship — Katie §5)
- Multi-routine-per-day (explicitly out — Diego confirmed)

**Build starts now.**
