Below is a **build-ready MVP specification** (mobile-first web app, bottom nav, routines + guided workout, machine-only, weight tracking). I’m writing this so you can hand it straight to Cloud Code and start shipping.

---

# Gym Routine Builder — MVP Specs (Mobile Web App)

## 1) Product goal

A **simple, premium-looking mobile web app** to build and run **machine-based gym routines**.

User creates routines (split training), each routine contains 6–7 machines, and the user tracks **sets, reps, rest, and weight per set** while completing the workout using a guided “player” with a **Next** button flow.

No login/authentication for now, but we still use **Supabase** as backend storage.

---

## 2) MVP scope

### In scope (MVP v1)

* Create / edit / delete **Routines**
* Add / edit / remove / reorder **Routine items (machines)**
* Machine list is simple: “Row machine”, “Chest press machine”, etc.
* Start workout (guided flow)
* Track per set:

  * **weight**
  * (optional) actual reps if user deviates from target
* Rest timer between sets
* “Next” button progression (no forced auto-advance)

### Out of scope (not MVP)

* Authentication / multi-user
* Social features
* Advanced analytics, PRs, templates marketplace
* Complex exercise database (we keep machines minimal)
* Wearable integrations

---

## 3) UX principles

* **Mobile-first layout** (centered phone container on desktop)
* **Bottom navigation** with 3 primary tabs (optionally 4)
* Very short, clear labels, no jargon
* Big tap targets, “player” screen feels like a fitness timer app
* Minimal data entry friction (defaults + “reuse last weight”)

---

## 4) App structure and screens

### Bottom Nav Tabs (MVP)

1. **Today**
2. **Routines**
3. **Build**
4. (Optional) **History** — can be hidden until v1.1

#### 4.1 Today (Home)

**Purpose:** fastest path to start training.

Components:

* “Next Routine” card (user selects a default routine)
* Button: **Start Workout**
* Quick stats:

  * last workout date (if history enabled)
  * current week streak (optional later)

Empty state:

* “No routine selected yet → Go to Build”

#### 4.2 Routines (List + Details)

* List of routines (e.g. Push / Pull / Legs / Upper / Lower)
* Each routine card:

  * name
  * number of machines
  * “Start” button
* Routine detail page:

  * list of machine cards (read-only preview)
  * buttons: Edit / Duplicate / Delete / Start

#### 4.3 Build (Routine Builder)

Create/edit a routine.

Fields:

* Routine name (required)
* Optional: notes

Routine Items list:

* Each item shows:

  * machine name
  * sets × reps
  * rest seconds
  * default target weight (optional)
* Actions:

  * Add machine
  * Drag reorder
  * Delete item

**Add machine flow**

* Search input + simple machine list (10–12 machines)
* User selects machine → configure sets/reps/rest + optional default weight

#### 4.4 Workout Player (Full-screen modal/page)

This is the core experience.

**Modes**

1. Work Set Screen

* Machine name
* Set progress: “Set 2 of 4”
* Target: reps (and optional target weight)
* Weight input for this set (default = last used weight for this machine OR routine default)
* Buttons:

  * **Complete Set**
  * Secondary: Skip / Edit
* After completing set → Rest Screen

2. Rest Screen

* Big countdown timer
* Buttons:

  * **Next** (ends rest immediately and goes to next set)
  * +15s / -15s
  * Pause
* When timer ends: show “Rest complete” and highlight **Next** (do not auto-jump)

3. Workout Summary

* Completed machines, sets, weights
* Button: Finish
* Option: Save notes (optional)

**Why Next button is better for MVP**

* Users often extend rest, wipe sweat, change machine availability, etc.
* Next button avoids the “timer forced me forward” frustration.
* Still keep it fast by highlighting Next when rest hits 0.

---

## 5) Data model (Supabase)

### Important note (no auth)

Without authentication, the database must be treated as **public**. For MVP this is okay if:

* You accept that anyone with the anon key could read/write, OR
* You gate writes with a simple shared “app key” (not strong security), OR
* You run all writes through an API layer (best practice).

For MVP speed, simplest is:

* **Public tables + RLS off**, or
* **RLS on** but using a service role key via server routes (recommended even without auth).

I’ll spec the recommended approach:

* Frontend calls your server endpoints.
* Server uses Supabase service role key.

### Tables

#### `machines`

Stores the “simple machine list”.

* `id` (uuid, pk)
* `name` (text, unique, not null)
* `category` (text, optional) — “upper”, “lower”, “core”, “cardio”
* `created_at` (timestamp)

Seed ~10–12 rows.

#### `routines`

* `id` (uuid, pk)
* `name` (text, not null)
* `notes` (text, nullable)
* `is_default` (boolean, default false)
* `created_at` (timestamp)
* `updated_at` (timestamp)

#### `routine_items`

* `id` (uuid, pk)
* `routine_id` (uuid, fk → routines.id, cascade delete)
* `machine_id` (uuid, fk → machines.id)
* `position` (int, not null) — ordering
* `sets` (int, not null, default 3)
* `reps` (int, not null, default 10)
* `rest_seconds` (int, not null, default 60)
* `default_weight` (numeric, nullable) — optional baseline
* `created_at` (timestamp)
* `updated_at` (timestamp)

#### `workout_sessions` (MVP optional, but recommended)

If you want weight tracking to actually be useful, you’ll want a session record.

* `id` (uuid, pk)
* `routine_id` (uuid, fk)
* `started_at` (timestamp, not null)
* `ended_at` (timestamp, nullable)
* `status` (text, not null) — “in_progress” | “completed” | “abandoned”
* `created_at` (timestamp)

#### `workout_sets`

Stores actual performed weights (and optionally reps).

* `id` (uuid, pk)
* `session_id` (uuid, fk → workout_sessions.id, cascade delete)
* `routine_item_id` (uuid, fk → routine_items.id)
* `set_number` (int, not null)
* `target_reps` (int, not null)
* `actual_reps` (int, nullable)
* `weight` (numeric, not null)
* `rest_seconds` (int, not null)
* `completed_at` (timestamp, not null)

**Why this table matters:** it enables “reuse last weight” properly.

---

## 6) Backend endpoints (server routes)

Even without login, you want clean endpoints so the frontend doesn’t hold service role keys.

### Routines

* `GET /api/routines`
* `POST /api/routines` { name, notes?, is_default? }
* `PUT /api/routines/:id`
* `DELETE /api/routines/:id`

### Routine items

* `GET /api/routines/:id/items`
* `POST /api/routines/:id/items` { machine_id, sets, reps, rest_seconds, default_weight?, position }
* `PUT /api/routine-items/:id`
* `DELETE /api/routine-items/:id`
* `POST /api/routines/:id/reorder` { ordered_item_ids: [] }

### Machines

* `GET /api/machines`
* (optional admin) `POST /api/machines`

### Workout

* `POST /api/workouts/start` { routine_id }

  * returns { session_id, expanded_routine_items, last_weights_map? }
* `POST /api/workouts/:session_id/set`

  * body: { routine_item_id, set_number, target_reps, actual_reps?, weight, rest_seconds }
* `POST /api/workouts/:session_id/finish`
* `GET /api/machines/:machine_id/last-weight`

  * returns last used weight (from workout_sets)

---

## 7) Client state + logic

### Routine builder logic

* Maintain array of routine_items sorted by position
* Drag reorder updates local state immediately
* Save reorder with `/reorder`

### Workout player state machine

Track:

* `currentRoutineItemIndex`
* `currentSetNumber`
* `mode`: `work` | `rest` | `summary`
* `currentWeightInput`
* `restRemainingSeconds`

Flow:

1. Start → mode=work on first item set 1
2. Complete Set → write to backend → mode=rest
3. Rest ends → show “Rest complete” → wait for Next
4. Next → if more sets for same machine → mode=work (set+1)
5. Else next machine → mode=work (new machine, set 1)
6. End → summary → finish

### Weight defaults (important)

On Work screen:

* default weight priority:

  1. last weight used for this machine (latest workout_sets)
  2. routine_item.default_weight
  3. blank (user enters)

Also: show a “Use last weight” chip if available.

---

## 8) UI components (MVP)

* BottomNav (3–4 tabs)
* RoutineCard
* MachinePicker (search + list)
* RoutineItemCard (builder)
* NumberStepper (sets/reps)
* RestTimePicker (quick chips: 30/45/60/90 + custom)
* WorkoutPlayer
* RestTimer
* WeightInput (big, numeric, with “+2.5 / +5” chips)
* EmptyState component

---

## 9) Seed machine list (initial)

Keep it super simple, no brand-specific machines:

* Row machine
* Chest press machine
* Shoulder press machine
* Lat pulldown machine
* Seated cable row machine
* Leg press machine
* Leg extension machine
* Leg curl machine
* Calf raise machine
* Ab crunch machine
* Back extension machine
* Assisted pull-up machine

(You can trim to 10 if you want.)

---

## 10) Non-functional requirements

* Responsive mobile layout
* Fast load (<2s perceived)
* Offline behavior not required (nice later)
* Accessibility:

  * large hit areas
  * readable contrast
  * focus states for keyboard

---

## 11) Acceptance criteria (MVP)

### Routines

* User can create a routine with name
* User can add 6–7 machines, each with sets/reps/rest and optional default weight
* User can reorder items and changes persist
* User can duplicate and delete routines

### Workout

* Starting a workout creates a session
* User completes sets and records weight per set
* Rest timer works and does not auto-advance
* “Next” moves forward reliably
* Finishing workout stores data and shows summary

---

## 12) Suggested build order (fastest to MVP)

1. UI shell + bottom nav + routing
2. Machines table + seed + GET machines
3. Routines CRUD
4. Routine items CRUD + reorder
5. Workout session start + player UI
6. Save sets + summary
7. Polish: animations, nicer inputs, haptics/audio toggle (optional)

---

