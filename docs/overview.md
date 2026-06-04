---
project_name: "Gym Routine Creator"
slug: gym-routine-creator
type: personal
status: active
owner: "Diego Bauer"
user: "Diego Bauer (solo)"
started: 2026-04-23
last_updated: 2026-06-04
tags: [gym, mobile-web, supabase, nextjs, personal-tool, portfolio]
---

# Gym Routine Creator

## Overview

A mobile-first gym routine builder web app. Diego creates machine-based workout routines, then executes them via a guided **workout player** that tracks sets, reps, weight, and rest periods. No authentication — Diego is the only user.

The app started as a workout logger (2026-04 to 2026-05). After the May 2026 dogfood week, Diego flagged it as "boring" — a competent log, not a program. Katie's product review (2026-06-04) diagnosed the underlying job-to-be-done as *"feel like I'm on a journey I'm winning,"* not just *"track my workouts."* The fix is structural: give the week shape (Weekly Plan), surface past-self at the moment of effort (last-used weight), make rest a first-class state.

The app also doubles as a **portfolio showcase** — the design, accessibility, and architecture craft is held to client-project standards.

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **UI:** Tailwind v4 + custom dark-theme tokens + shadcn-style primitives
- **State:** Zustand (workout player) + TanStack Query (server state, 60s stale)
- **Motion:** Framer Motion
- **Icons:** lucide-react
- **Backend:** Supabase (Postgres) — service-role-only access via Next API routes (no auth)
- **Hosting:** Vercel
- **Lock file:** npm

## URLs

- **Production:** *(TODO(Diego): confirm prod URL post-deploy)*
- **Vercel project:** https://vercel.com/diegos-projects-cc9407b6/gym-routine-builder
- **GitHub repo:** https://github.com/diegobdesign/gym-routine-builder
- **Local dev:** http://localhost:3000

## Code location

`~/AIwithDiego/Personal/gym-routine-creator/` — Next.js app + `CLAUDE.md` + `docs/` (this folder).
Design docs for the Weekly Plan ship: `docs/design/weekly-plan/` (Allison UX · Emmett architecture · Sonny test matrix · joint design doc).

## Status

**Active — Weekly Plan + day-aware Today + Routine Preview shipped 2026-06-04 (PR #3).** The "boring" structural diagnosis is now addressed. Two starter weekday assignments left live (Mon → Pull Day · Thu → Shoulder Builder) — Diego dogfoods one training week before the next ship is greenlit.

Current state of work:
- 🟢 **Live (post-PR #3):** Weekly Plan editor (bottom sheet, Mon-first picker, day-conflict modal); 4 Today hero variants (Resume / Planned / Rest / Cold-start); Preview screen with last-used weight per machine (strength + cardio + no-history fallback), Assigned-days chip, kebab menu; FK `workout_sessions.routine_id ON DELETE SET NULL` (was blocking delete); `is_default` retired; stale-session reaper (12h auto-abandon) + nicer elapsed format on Resume hero
- 🟢 **Live (pre-PR #3):** Routine builder + workout player (working → resting → hydrating → summary) + Metrics tab + Workout history + Cardio UI + Exercise reordering mid-workout
- 🔵 **Next ship (greenlit conditionally, awaits dogfood week):** Last-used weight on Work Set screen + PR celebration in the moment (the dopamine engine — same RPC as Preview, two surface treatments)
- 🔵 **Next ship (parallel track):** Mid-workout exercise swap (Diego's original ask #4, category-matched suggestions, in-memory item replacement)
- 🟡 **Later:** Weekly adherence streak (replaces day-streak in Metrics once 2-3 weeks of plan data exist); progressive overload weight suggestion (depends on last-used shipping first)
- 🔴 **Killed / parked:** Block/periodisation programs (too much surface for solo-user app); standalone "new routines" content task (deferred — Diego picks split, then commission what's missing — 4 new routines already seeded 2026-06-04)

## Milestones / roadmap

- [x] **v1** (2026-04-23) — Initial app: routine builder + workout player + machines tab
- [x] **Pounds → kg** (2026-04-23)
- [x] **Hydration reminder screen** (2026-04-23)
- [x] **Workout history feature on Today tab** (2026-04-23)
- [x] **Build tab replaced with Metrics tab** + seed scripts (2026-04-23)
- [x] **Cardio UI** + exercise reordering + Today page routine grid (2026-04-23)
- [x] **Date display bugfixes** (PRs #1, #2 — 2026-04-24) — relative-date timezone offset + `started_at` over `ended_at`
- [x] **Weekly Plan + Today rewire + Routine Preview** (shipped 2026-06-04, PR #3 squash-merged as `72ad427`)
  - Schema: `assigned_weekdays SMALLINT[]` on routines (range CHECK 0-6), `routines_set_weekdays` + `routine_last_sets` RPCs, FK `workout_sessions.routine_id ON DELETE SET NULL`, drop `is_default` (two migration files).
  - API: PATCH `/api/routines/[id]/weekdays`, enriched GET `/api/routines/[id]` with last_weight/actual_reps/recorded_at, new GET `/api/workouts/in-progress` (with 12h stale-session reaper).
  - Today: 4 hero variants (Resume > Planned > Rest > Cold-start) with weekday eyebrow, time estimate, gear icon, override grid.
  - Preview: full-width Start CTA, kebab menu (Weekly plan / Edit / Duplicate / Delete), per-machine Last session line, Assigned chip.
  - Weekly Plan editor: bottom sheet, Mon-first weekday rows, picker modal with Rest day, day-conflict confirmation modal, auto-save.
  - 4 new routines seeded: Chest Day, Pull Day, Full Body Express, Conditioning.
  - Reaped 10 stale `in_progress` sessions found in DB (oldest from March 2026) during verification.
- [ ] **Next ship — Last-used weight on Work Set + PR celebration** (greenlit conditionally — awaits one-week dogfood validation that Weekly Plan adoption holds)
- [ ] **Next ship (parallel) — Mid-workout exercise swap**
- [ ] **Later — Weekly adherence streak**
- [ ] **Later — Progressive overload weight suggestion**

## Decisions log

### 2026-06-04 — Day Diego flagged "boring," Katie review + structural ship

- **"Boring" diagnosis (Katie):** the app is a competent log, not a program. Root cause is the absence of week shape + invisible past-self at moment of effort — not a shortage of routines. **Why it matters:** stops the team from solving a content problem when the real problem is structural.
- **First ship bundled, not split:** Weekly Plan + Today rewire + Preview ship together as one PR because they share a surface and individually feel half-done. **Why:** preview without weekly plan = orphan feature; weekly plan without preview = breaks the implied promise of "see what's coming."
- **Schema chose array, not junction table:** `assigned_weekdays SMALLINT[]` on routines (Diego confirmed one routine per gym day). **Why:** simpler migration, fewer joins; future-proof escape: if multi-routine-per-day ever needed, junction table migration is straightforward.
- **`is_default` retired entirely:** Weekly Plan is the single source of truth. No "favorite" workaround replaces the star. **Why:** if a routine is the easy-default, Diego assigns it to multiple weekdays. The plan IS the system.
- **FK `workout_sessions.routine_id ON DELETE SET NULL`:** pre-existing bug surfaced by Sonny (deleting a used routine was failing with FK error). Fix bundled into the same migration. **Why:** the workout history is the user's accomplishment, not the routine — history should survive routine deletion.
- **Day-conflict UX is a confirmation modal, not silent transfer:** assigning Tuesday to Routine B when Routine A already owns it pops *"Tuesday is currently A. Switch?"* before firing the RPC. **Why:** UI prevents accidental clobber; server enforces invariant regardless.
- **Resume in-progress takes precedence over planned hero:** a fourth Today variant (Resume) wins when any `in_progress` session exists. Today's plan stays visible underneath. **Why:** finish what you started before today's plan can compete for attention.
- **Stale-session guard at 12h, server-side:** GET `/api/workouts/in-progress` auto-abandons sessions older than 12h before returning. **Why:** verification surfaced 10 orphaned sessions (oldest March 2026); without the guard, the Resume hero would have happily rendered "640 min in" forever. 12h covers a realistic morning-then-afternoon gym day; anything longer is orphaned, not real.
- **"New routines" was the lowest-leverage of Diego's four asks — deferred but Diego overrode and added 4 anyway:** Chest Day, Pull Day, Full Body Express, Conditioning. **Why:** Katie argued content speculative without weekly split visibility; Diego argued seed cost is trivial and broadens the menu while the plan stabilizes. Both right, no harm done.
- **Mobile-first display only:** Allison locked en-IE locale, Monday-first weekday order, 44×44 touch targets, WCAG 2.2 AA (EAA out of scope — solo user). Routine card on Routines tab lost its small Play button to enforce the "always preview first" principle.
- **Dogfood is the validation:** no painted door, no smoke test — Diego trains for one week post-deploy. If ≥4/5 planned days complete AND Diego doesn't reopen the editor (plan stable), greenlight the next ship.

## Pending

### Open
- Run Sonny's 88-case test matrix (`docs/design/weekly-plan/sonny-test-matrix.md`) against production once it stabilizes (55 P0, 30 P1, 3 P2) — can run incrementally
- PWA icon `/icon-192.png` returns 404 (cosmetic, pre-existing — surfaced during 2026-06-04 verification)
- Pre-existing Metrics timezone bug — server-side `getDay()` for "this week" calculation (flagged in Emmett architecture doc §4)
- Pre-existing lint errors in `src/components/workout/workout-summary.tsx` (`Date.now()` in render) + `src/components/routines/machine-picker.tsx` (unused import) + `src/app/workout/[sessionId]/page.tsx:164` (`setState` in effect) — not blocking build; clean up when touching those files

### Resolved this session (2026-06-04)
- ~~Diagnose the "boring" feedback~~ — Katie Mode 1 review filed
- ~~Allison + Emmett + Sonny design phase~~ — 3 slice docs + 1 joint design doc filed at `docs/design/weekly-plan/`
- ~~Schema migration applied~~ — `add_weekly_plan` + `drop_is_default` on Supabase
- ~~Ship the Weekly Plan + Today + Preview bundle~~ — PR #3 merged as `72ad427`
- ~~Stale-session bug~~ — 12h reaper + elapsed format polish shipped same PR
- ~~Verify on Vercel preview~~ — full flow walked, all 4 hero variants confirmed, day-conflict modal confirmed, last-used weight per machine confirmed

## Related artifacts

- **Design docs (this ship):** `docs/design/weekly-plan/`
  - `allison-design.md` — UX/IA/microcopy/accessibility
  - `emmett-architecture.md` — schema, RPCs, edge cases, FinOps
  - `sonny-test-matrix.md` — 88-case test matrix
  - `joint-design-doc.md` — synthesis + 8 locked decisions + build order
- **Project guidance:** `CLAUDE.md` (tech stack + architecture + data model)
- **Supabase schema:** `supabase/schema.sql` + migration files (`migration_add_weekly_plan.sql`, `migration_drop_is_default.sql`, plus prior `migration_add_machine_fields.sql`)
- **Seed scripts:** `scripts/seed-routines.ts` (original 6), `scripts/seed-new-routines.ts` (new 4), `scripts/seed-workouts.ts`, `scripts/list-machines.ts`
- **Merged PRs:** [#1](https://github.com/diegobdesign/gym-routine-builder/pull/1) timezone fix · [#2](https://github.com/diegobdesign/gym-routine-builder/pull/2) date display · [#3](https://github.com/diegobdesign/gym-routine-builder/pull/3) Weekly Plan bundle

## Notes

- **No auth.** Service role key on every server route. Single-user assumption is load-bearing — multi-tenant migration would require `user_id` on every table + RLS + endpoint filtering. Documented as deliberate technical debt in `emmett-architecture.md` §8.
- **FlyeFit machine roster** is hardcoded in the seeded `machines` table. Cross-gym portability is explicitly out of scope.
- **Diego is in Ireland (Europe/Dublin).** "Today" derives from `new Date().getDay()` on the client — follows device timezone. Travel-day behavior tested in Sonny's matrix EC-07.
- **Portfolio dual-purpose:** this is also a showcase piece. Design + a11y + architecture craft applied at client-project standards even though there's no commercial pressure.
- **Validation cadence:** dogfood-driven. No telemetry, no analytics. Diego's lived experience for one training week IS the success signal. If Weekly Plan adoption holds, next ship (last-used weight + PR celebration) greenlights.
