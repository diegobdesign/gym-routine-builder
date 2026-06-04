# Allison — Design contribution: Weekly Plan + Today rewire + Routine Preview

**Status:** Design phase. No code yet.
**Pairing:** Emmett (architecture), Sonny (QA). Joint design doc.
**Scope:** One PR. Three woven changes. Solo user (Diego). Mobile-first. Dark theme.

---

## 0. The call (Katie's open question)

> *"Preview screen — is the existing routine detail page the right surface, or do we need a dedicated 'pre-workout' screen?"*

**Decision: Upgrade the existing `/routines/[id]` page. Don't fork a new screen.**

Reasons:
1. A dedicated "pre-workout" screen is a screen Diego sees for 4 seconds before tapping Start. That's a transitional surface, not a destination. The cost of a second routing concept (`/routines/[id]/preview` vs `/routines/[id]`) outweighs the benefit.
2. The routine detail page is *already* the surface where Diego inspects "what am I about to do" — sets, reps, rest, machines. Adding "last weight per machine" and promoting "Start Workout" to the primary CTA finishes that job. It doesn't need a new container.
3. Two routes for the same data (one for "manage," one for "preview") leads to feature drift. One surface, one source of truth — the page is *both* the management view and the launch pad. Difference is which CTA gets primary weight, which is a layout decision, not a route decision.
4. Linear precedent: their issue detail page is both the read view AND the action surface. There's no `/issues/[id]/preview`. Stripe payment links work the same way.

What changes: the routine detail page gets restructured so the **primary action is Start Workout**, secondary actions (Edit, Duplicate, Delete) demote into a kebab/overflow, and a new **"Last session"** strip appears under each machine row showing previous weight/reps. The `is_default` star is removed entirely.

---

## 1. Information Architecture

### Where does Weekly Plan live?

Three options I considered:

| Option | Pro | Con |
|---|---|---|
| **A.** New 5th tab "Plan" in bottom nav | Discoverable, dedicated | 5 tabs is the iOS HIG ceiling; nav gets crowded; Plan isn't a daily destination |
| **B.** Settings sheet from Today (gear icon, slides up) | Light footprint, keeps tabs clean | Hidden — Diego may not find it again for weeks |
| **C.** Inside Routines tab as a sticky header / sub-view | Co-located with the thing being scheduled | Mixes browsing + scheduling; muddles the Routines list |

**Pick: Option B with a discoverability assist.**

Implementation:
- A **gear icon** ("Edit weekly plan") sits in the Today tab header, top-right, beside the H1. 44×44px target. Tapping opens the Weekly Plan editor as a **full-screen bottom sheet** (iOS pattern — slides up over Today, dismissed by swipe-down or X button top-left).
- The cold-start state on Today (no plan configured) has a **prominent inline CTA** ("Set up your weekly plan") that opens the same sheet — so first-time discovery doesn't depend on the gear.
- The editor is **also reachable** from the Routines tab via a small "Weekly plan" link in the header (below "Routines" title), so when Diego is browsing routines and thinks "Tuesday should be Shoulder Builder," he doesn't have to backtrack to Today.

**Why not a 5th tab:** Diego sets the plan, then leaves it for weeks. It's a config surface, not a daily one. Tabs are for daily destinations.

**Why not inline in Routines tab:** Routines tab is the *library* (browse, edit, build new routines). Plan is the *schedule* (which routine on which day). Different mental models. Don't mix.

### User flow — the main task

```
Open app
  → Today tab (default)
  → Hero card shows: "Tuesday → Shoulder Builder" with Preview CTA
  → Tap Preview
  → /routines/[shoulder-id] (upgraded preview)
  → Tap "Start workout"
  → /workout/[sessionId] (existing player)
```

Side path — configure the plan:

```
Today tab → tap gear icon (or cold-start CTA)
  → Weekly Plan sheet slides up
  → Tap a weekday row → routine picker modal
  → Select routine OR "Rest day"
  → Sheet auto-saves per change (no Save button)
  → Swipe down to dismiss
  → Today hero updates immediately
```

---

## 2. Today tab — the new hero

### Layout system

- Container: existing `p-4 space-y-6`.
- Header height: same as today (~64px).
- Hero card height: ~180px (planned-routine variant). It's the focal point — give it real estate.
- Below the hero: a collapsed/demoted "Other routines" strip (override path) — title + horizontal scroll of small routine chips, OR a single "Choose a different routine" expandable row. See variant (a) below.
- Below that: Recent Workouts (existing — keep as-is).

### Variant (a) — Planned day (routine assigned to this weekday)

```
┌─────────────────────────────────────────────┐
│  Today                              [⚙]    │  ← H1 + gear icon
│  Tuesday · June 4                            │  ← weekday + date, ditches "Ready to train?"
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  TUESDAY                              │  │  ← eyebrow, uppercase, accent-green-muted
│  │                                       │  │
│  │  Shoulder Builder                     │  │  ← routine name, large display
│  │                                       │  │
│  │  6 machines · ~45 min                 │  │  ← meta line, text-secondary
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │   ▶  Preview workout            │  │  │  ← primary CTA, full-width, accent-green
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ─────────── Not feeling it? ─────────────  │  ← divider with text, subtle
│                                             │
│  Choose a different routine            [v]  │  ← collapsible header, text-secondary
│                                             │
│  ── Recent Workouts ──                      │
│  [history cards as today]                   │
└─────────────────────────────────────────────┘
```

Key moves:
- **Eyebrow "TUESDAY"** above the routine name. Pairs the day to the routine in a glance — Diego sees "the system knows what today is" without reading a sentence.
- **CTA copy is "Preview workout," not "Start workout."** Because tapping routes to the preview screen, not straight into the player. Copy honesty matters — calling it "Start" then routing to preview breaks the implied promise.
- **Override path is demoted** — "Choose a different routine" collapses by default. Diego on a normal Tuesday doesn't see the routine list at all. He sees one card. Tap it. Go.
- **`~45 min` estimate** if we can derive it cheaply (sum of sets × rest + 60s working per set). Round to nearest 5 min. If we can't, drop the line — don't fake it.

### Variant (b) — Rest day (no routine assigned to this weekday)

```
┌─────────────────────────────────────────────┐
│  Today                              [⚙]    │
│  Wednesday · June 4                          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  WEDNESDAY                            │  │  ← eyebrow, but text-tertiary (dimmer)
│  │                                       │  │
│  │  Rest day                             │  │  ← display, but not accent-green
│  │                                       │  │
│  │  Recovery is where the gains stick.   │  │  ← microcopy, italic, text-secondary
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │   Train anyway                  │  │  │  ← secondary button (outline, not filled)
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Tap above to pick a routine                │  ← helper text, text-secondary, small
│                                             │
│  ── Recent Workouts ──                      │
└─────────────────────────────────────────────┘
```

Key moves:
- **No accent-green on the rest day card.** Color independence point — rest day is visually different (no green, italic body) AND linguistically different ("Rest day" not "Shoulder Builder"). Don't rely on color alone.
- **"Train anyway" button** opens the routine picker as a modal. Honors the Friday-night "I changed my mind" reality.
- **No CTA-as-primary on rest days.** The page says "rest." The visual hierarchy supports rest. Don't push him into the gym on Wednesday by accident.

### Variant (c) — Cold start (no plan configured yet)

```
┌─────────────────────────────────────────────┐
│  Today                                       │  ← gear icon hidden until plan exists
│  Thursday · June 4                           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │     Set up your weekly plan           │  │  ← display, centered
│  │                                       │  │
│  │   Assign routines to weekdays so      │  │  ← body, text-secondary, centered
│  │   the app knows what you train and    │  │
│  │   when.                               │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │   Set up weekly plan            │  │  │  ← primary CTA, accent-green
│  │  └─────────────────────────────────┘  │  │
│  │                                       │  │
│  │   Or pick a routine for today →       │  │  ← tertiary link, text-secondary
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ── Recent Workouts ──                      │
│  [history cards if any exist]               │
└─────────────────────────────────────────────┘
```

Key moves:
- **Two paths from cold start.** Primary: "set up the plan" (the right behaviour). Tertiary: "pick a routine for today" (escape hatch — if Diego just installed the app and wants to lift in 5 min, don't gate him behind setup).
- **No "Tuesday — pick a routine" eyebrow pattern.** That's the rest day pattern, applied here it would feel like the app is broken ("did I forget to set it?"). The cold start is its own visual register: centered, instructional, inviting.
- **Gear icon hidden** until a plan exists. The "set up" CTA does the same job — don't double-signal.

---

## 3. Preview screen — upgrades to `/routines/[id]`

### What changes

**Header area** (currently: back arrow + name + star + notes):
- Back arrow stays.
- Name stays.
- **Star icon: GONE.** `is_default` is retired.
- Notes stay.
- Add a **subtle "Assigned: Mon · Wed · Fri"** chip row under notes (only if the routine is in the weekly plan) — Diego sees at-a-glance how this routine fits the week.

**Action bar** (currently: Start Workout + Edit + Duplicate + Set Default + Delete — all equally sized, wraps to 2 rows on narrow screens, visually noisy):
- **Promote Start Workout to a full-width primary button** directly under the header. This is the action the surface exists for.
- **Demote Edit / Duplicate / Delete into a kebab menu (⋯) in the header top-right.** They're rare actions for a solo user with 6 stable routines.
- **Remove "Set Default"** entirely.

**Machine list** (currently: numbered card + name + "3 sets x 10 reps @ 40kg" + rest):
- Keep the structure.
- **Add a "Last session" strip** below the sets/reps line, showing the most recent weight Diego actually used (not the default planned weight). Format:
  - If history exists: `Last: 42.5 kg × 10 · 3 days ago` (text-secondary, smaller)
  - If no history: `No previous session` (text-tertiary, smaller, italic)
- The default planned weight (`@ 40 kg`) stays in the planned line. The "Last:" line shows reality. Both visible — Diego compares and adjusts.

### Layout

```
┌─────────────────────────────────────────────┐
│  ←  Shoulder Builder                   [⋯] │  ← back + name + overflow menu
│     Push-day focus                          │  ← notes
│     Assigned: Mon · Wed · Fri               │  ← weekly-plan chip (if assigned)
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │   ▶  Start workout                    │  │  ← primary, full-width, accent-green
│  └───────────────────────────────────────┘  │
│                                             │
│  Machines (6)                               │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ [1]  Shoulder Press                   │  │
│  │      3 sets × 10 reps @ 40 kg         │  │
│  │      Last: 42.5 kg × 10 · 3 days ago  │  │  ← NEW
│  │                              90s rest │  │
│  └───────────────────────────────────────┘  │
│  ... (5 more)                               │
└─────────────────────────────────────────────┘
```

**Kebab menu contents** (slides up as bottom action sheet on tap):
- Edit routine
- Duplicate routine
- Delete routine (destructive, red)

**Why a kebab over inline buttons:** Solo user with stable routines. Edit happens once a month, Delete almost never, Duplicate occasionally. The button row was eating the screen for actions that don't earn their pixels.

---

## 4. Weekly Plan editor

### The surface

**Format: full-screen bottom sheet, weekday-per-row list.**

Considered alternatives:
- *Calendar grid (7 boxes)*: feels like a date picker; weekdays are recurring, not dates. Wrong mental model.
- *Per-routine "Active on: M T W ___" chips*: forces Diego to open every routine to see the full week. The week is the unit being planned, not the routine.
- *Weekday-per-row list*: Diego sees the whole week at once, taps a row, picks a routine. One screen, one task. **Winner.**

### Layout

```
┌─────────────────────────────────────────────┐
│  ✕                  Weekly Plan             │  ← close + sheet title
├─────────────────────────────────────────────┤
│                                             │
│  Monday          Shoulder Builder       ›  │  ← weekday + routine + chevron
│  Tuesday         Back Builder           ›  │
│  Wednesday       Rest day               ›  │  ← rest = text-secondary
│  Thursday        Glute Builder          ›  │
│  Friday          Arms Day               ›  │
│  Saturday        Legs & Push            ›  │
│  Sunday          Rest day               ›  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Train 4–5 days a week. The plan adjusts.  │  ← footer microcopy, text-tertiary
│                                             │
└─────────────────────────────────────────────┘
```

### Interaction

- **Tap a row → modal opens** with a picker:
  ```
  ┌───────────────────────────────────────┐
  │  Monday                            ✕  │
  ├───────────────────────────────────────┤
  │  ○  Rest day                          │
  │  ─────────────────────────────────    │
  │  ●  Shoulder Builder                  │
  │  ○  Back Builder                      │
  │  ○  Arms Day                          │
  │  ○  Glute Builder                     │
  │  ○  Legs & Push                       │
  │  ○  Golf Hips & Core                  │
  └───────────────────────────────────────┘
  ```
- Radio-select pattern. Tap a routine → row closes, weekly plan row updates, saves immediately. No "Save" button on the sheet.
- **Rest day is a first-class option** at the top of the picker, visually separated by a divider. Same level of legitimacy as a routine. Not an "uncheck" or a "none" — it's a *choice*.
- **Highlight today's row** in the weekly list — left-edge accent bar in `--accent-green` (4px wide), so Diego sees where he is in the week.

### Why this and not a multi-select-per-routine

The user mental model is "what am I doing on Tuesday," not "which days does Shoulder Builder run." Weekday is the anchor. Routine is the value. The editor mirrors the question.

Junction-table-style multi-select would also let Diego accidentally assign two routines to the same day. Single-routine-per-day picker enforces the schema constraint at the UI level. No validation needed.

---

## 5. Microcopy specification

### Today hero — planned variant

- **Eyebrow:** `TUESDAY` (or current weekday, uppercase)
- **Routine name:** `Shoulder Builder` (no transformation)
- **Meta line:** `6 machines · ~45 min` (estimate only if computable; else `6 machines`)
- **Primary CTA:** `Preview workout` *(NOT "Start workout" — tapping routes to preview, not player)*
- **Override link:** `Choose a different routine` (expandable, text-secondary)
- **Override divider:** `Not feeling it?` (text-tertiary, italic)

### Today hero — rest day variant

- **Eyebrow:** `WEDNESDAY` (text-tertiary, dimmer than planned variant)
- **Display:** `Rest day` (no accent color)
- **Body:** `Recovery is where the gains stick.` (italic, text-secondary)
- **Secondary CTA:** `Train anyway` (outline button, not filled)
- **Helper text below card:** `Tap above to pick a routine` (text-tertiary, small)

### Today hero — cold start variant

- **Display:** `Set up your weekly plan`
- **Body:** `Assign routines to weekdays so the app knows what you train and when.`
- **Primary CTA:** `Set up weekly plan`
- **Tertiary link:** `Or pick a routine for today →`

### Preview screen

- **Primary CTA:** `Start workout` *(this IS the launch — copy matches action)*
- **CTA loading state:** `Starting…`
- **Weekly-plan chip:** `Assigned: Mon · Wed · Fri` (or single day, or `Not in weekly plan` — see below)
- **"Last session" line — with history:** `Last: 42.5 kg × 10 · 3 days ago`
- **"Last session" line — no history:** `No previous session` (italic, text-tertiary)
- **Kebab menu items:** `Edit routine` · `Duplicate routine` · `Delete routine` (last one destructive, red)
- **Delete confirm dialog:**
  - Title: `Delete this routine?`
  - Body: `This will remove the routine from your weekly plan and delete its history. This cannot be undone.`
  - Buttons: `Delete routine` (destructive) + `Keep routine`

### Weekly Plan editor

- **Sheet title:** `Weekly Plan`
- **Empty plan footer microcopy:** `Train 4–5 days a week. The plan adjusts.`
- **Picker title:** `Monday` (or selected weekday name)
- **Rest day picker option:** `Rest day`
- **Picker section divider:** none (visual hairline between Rest day and routines)
- **No "Save" / "Done" button** — auto-save on selection. Close via X (top-left) or swipe down.
- **Discoverability link in Routines tab:** `Weekly plan ›` (under the Routines H1)

### Edge / empty states

- **Routine has no machines yet, viewed from Today preview:** `This routine has no machines. Add some to start training.` + CTA `Add machines` → routes to `/build/[id]`.
- **Weekly plan has zero assigned days (entered the editor but assigned nothing):** No special state — every row defaults to "Rest day." The footer microcopy carries the meaning.
- **Routine assigned to a weekday but the routine gets deleted:** Affected weekdays revert to "Rest day" silently. If Diego opens Today on that day and sees rest day where Shoulder Builder used to be, that's expected behaviour — he can re-assign.

### Tone

- Direct. No exclamation marks (except never).
- No hype. "Crush it" / "Let's go!" / "Time to train!" — none of that. Diego is not 19.
- No app-personality cuteness. This is a tool, not a buddy.
- One small permission for warmth: the rest-day body line (`Recovery is where the gains stick.`). One line. Earns its place because rest days need a tiny reframe — Diego's instinct is "I should be in the gym." The app gives him cover to not be.

---

## 6. Accessibility specification

**Compliance target:** WCAG 2.2 AA (Diego is solo + healthy, but craft floor applies). EAA: **out of scope** (Diego is a single user; not a service offered to EU consumers).

### Heading structure

- Today: H1 `Today` → H2 hero card title (routine name OR `Rest day` OR `Set up your weekly plan`) → H2 `Recent Workouts`
- Preview: H1 routine name → H2 `Machines (6)`
- Weekly Plan sheet: H1 `Weekly Plan` (within the sheet container, `role="dialog"`)

### Focus order — Today (planned variant)

1. Skip-to-main (off-screen until focus, jumps past nav)
2. H1 `Today` (not focusable — heading nav only)
3. Gear icon `Edit weekly plan` (button)
4. Hero card primary CTA `Preview workout` (button)
5. `Choose a different routine` expand (button, `aria-expanded`)
6. Recent workouts cards in order
7. Bottom nav (existing)

### Focus order — Weekly Plan sheet

1. Close button (X) — focus starts here on open
2. Monday row → Tuesday row → ... → Sunday row (7 buttons)
3. Loop back to Close (focus trap inside sheet)
4. Escape key closes sheet, returns focus to gear icon trigger

### Weekday picker — keyboard nav

- **Sheet rows are buttons.** Each weekday row is `<button>` (not `<div onclick>`).
- **Tab moves between rows** in visual order.
- **Enter / Space opens the picker modal** for that day.
- **In the picker modal:** radio group pattern. Arrow keys move between options. Enter selects + closes. Escape closes without changing.
- **`role="radiogroup"` + `aria-label="Choose routine for Monday"`** on the picker container.

### Screen reader treatment of day-of-week + routine pairing

This is the load-bearing accessibility decision of the feature. The Today hero must read as a single coherent unit, not three disconnected fragments.

- **Hero card structure:**
  ```
  <article aria-labelledby="hero-title" aria-describedby="hero-meta">
    <p class="eyebrow" aria-hidden="true">TUESDAY</p>
    <h2 id="hero-title">
      <span class="sr-only">Tuesday's workout: </span>
      Shoulder Builder
    </h2>
    <p id="hero-meta">6 machines, about 45 minutes</p>
    <button>Preview workout</button>
  </article>
  ```
- Screen reader reads: *"Article, Tuesday's workout: Shoulder Builder, heading level 2. 6 machines, about 45 minutes. Button, Preview workout."* — one coherent unit, weekday is part of the heading semantically, eyebrow is decorative.
- **Rest day variant:** `<h2><span class="sr-only">Wednesday is a </span>Rest day</h2>` → reads "Wednesday is a Rest day."
- **Cold start variant:** standard heading, no day pairing needed (the day-of-week label below H1 carries enough).

### Date label

- The "Tuesday · June 4" subtitle under H1 uses `<time datetime="2026-06-04">Tuesday · June 4</time>` so SRs announce a structured date.

### Color contrast — accent-green CTAs

- Verify `--accent-green` on `--bg-app` and on `--bg-card` hits **3:1 minimum** for the button surface, **4.5:1** for the button label text against the green fill.
- If the accent-green label text is white-on-green and contrast fails, switch the label to near-black (`--text-on-accent` or equivalent) on green fills. Don't lower-saturate the green to fix contrast — kill the readability problem at the text layer.
- **Rest-day "Train anyway" button** is an outline button — verify the green outline + green text on `--bg-card` hits 3:1 for the border (UI component contrast) and 4.5:1 for the text.

### Color independence

- **Today's row in the Weekly Plan list** uses both the green left-edge bar AND a visible "Today" pill/label inline with the weekday name. Not green-only.
- **Rest day vs planned day in the weekly list:** rest day shows in `text-secondary`, planned day shows in `text-primary`. Distinguishable in grayscale.
- **Hero card variants** (planned vs rest) differ in *layout + copy + color*, not color alone. Rest day has italic body text and no accent CTA — clearly distinct without seeing green.

### Touch targets

- Gear icon button: 44×44px (currently spec'd).
- Weekday rows in the sheet: 56px tall minimum (8px above iOS minimum — feels less cramped).
- Hero primary CTA: 48px tall, full-width.
- Kebab menu trigger: 44×44px.

### Motion

- Sheet slide-up uses `cubic-bezier(0.16, 1, 0.3, 1)` ease, 280ms.
- Hero card variant changes (when plan updates and Today re-renders) cross-fade, 200ms.
- **`prefers-reduced-motion`:** sheet appears with opacity-only fade (no slide); hero cross-fade becomes instant swap. Disable all non-essential motion.

### Modal / sheet patterns

- Weekly Plan sheet: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="weekly-plan-title"`, focus trap, Escape closes, `inert` on background main content.
- Routine picker modal (inside the sheet): nested modal — close it returns focus to the weekday row that opened it, not to the sheet's close button.
- Delete confirmation: same dialog pattern. Destructive button styled red AND named "Delete routine" — color is not the only signal.

### Live regions

- After a weekly plan row saves (auto-save on pick), an `aria-live="polite"` region announces `Monday set to Shoulder Builder` or `Monday set to Rest day`. 1-second toast equivalent for SR users.
- After Start Workout press, the loading state `Starting…` is announced via the button's accessible name update (`aria-live` on the button label).

---

## 7. Acceptance criteria

UX done-when checklist. Sonny converts these to test cases.

### Today tab — planned day

- [ ] When today's weekday has an assigned routine in `routines.assigned_weekdays`, the hero card renders the **planned variant**.
- [ ] The eyebrow shows today's weekday name (uppercased, abbreviated `MON` / `TUE` etc. — pick one, don't mix).
- [ ] The routine name appears as a heading inside the card.
- [ ] The meta line shows machine count; the time estimate appears only if computable from `sets × (rest + ~60s)`.
- [ ] Primary CTA reads `Preview workout` and routes to `/routines/[id]` (not into the player).
- [ ] `Choose a different routine` expand opens an inline scrollable list of all other routines; tapping any of them routes to `/routines/[id]` for that routine.
- [ ] Recent Workouts section renders unchanged below the hero.

### Today tab — rest day

- [ ] When today's weekday has no assigned routine (value is `null` or absent from the array), the hero card renders the **rest day variant**.
- [ ] No accent-green color appears in the hero card.
- [ ] `Train anyway` button opens a routine picker modal listing all routines.
- [ ] Picking a routine from `Train anyway` routes to `/routines/[id]` preview.

### Today tab — cold start

- [ ] When `routines.assigned_weekdays` is empty across all routines (no plan has been configured), the hero card renders the **cold start variant**.
- [ ] Gear icon is hidden in this state.
- [ ] Primary CTA `Set up weekly plan` opens the Weekly Plan sheet.
- [ ] Tertiary link `Or pick a routine for today →` opens the same routine picker modal as rest-day's `Train anyway`.

### Preview screen (`/routines/[id]`)

- [ ] Star icon and any `is_default` UI is removed from the page.
- [ ] Set Default button is removed.
- [ ] `Start workout` is a single full-width primary button directly under the header.
- [ ] Edit, Duplicate, Delete actions live in a kebab (⋯) menu in the top-right header, opened as a bottom action sheet on mobile.
- [ ] If the routine is assigned to one or more weekdays, a chip row reads `Assigned: Mon · Wed · Fri` under the routine notes.
- [ ] Each machine row shows a `Last: [weight] × [reps] · [relative date]` line if a prior workout exists for that machine in this routine.
- [ ] If no prior workout exists for that machine, the line reads `No previous session` in italic, text-tertiary.
- [ ] Delete action shows a confirmation dialog matching the microcopy spec; confirming routes back to `/routines`.

### Weekly Plan editor

- [ ] Editor opens as a full-screen bottom sheet from the Today gear icon, the Today cold-start CTA, and a `Weekly plan ›` link in the Routines tab header.
- [ ] All 7 weekdays render as rows in order Monday → Sunday.
- [ ] Each row shows the weekday name + assigned routine name (or `Rest day`) + chevron.
- [ ] Today's row has a visible "today" indicator (left-edge accent bar + inline label).
- [ ] Tapping a row opens a routine picker modal scoped to that weekday.
- [ ] Picker lists `Rest day` at the top, then all routines.
- [ ] Selecting a routine immediately closes the picker, updates the row, and persists to Supabase — no Save button.
- [ ] Closing the sheet returns to Today; the hero card reflects any change for today's weekday immediately.

### Cross-cutting

- [ ] No reference to `is_default` survives in the UI or any visible copy.
- [ ] All interactive elements meet 44×44px touch target.
- [ ] Keyboard nav reaches every interactive element in logical order.
- [ ] Screen reader narrates the hero card as a coherent unit (weekday + routine paired in a single H2 via `sr-only`).
- [ ] `prefers-reduced-motion` disables sheet slide, hero cross-fade, and any non-essential animation.
- [ ] Light/dark contrast: accent-green on `--bg-app` and `--bg-card` passes WCAG AA at the spec'd weights.

---

## 8. The "feel" check

Three moves that make this not just competent:

1. **The eyebrow weekday label.** It's the smallest detail and the biggest "oh." Tuesday → Shoulder Builder paired through an uppercase eyebrow + display heading reads like a coach told Diego what's on the menu, not like an app showed him a card. It's the Linear-tag-above-an-issue energy applied to a weekday.

2. **Rest day gets its own visual register.** Most fitness apps treat rest as a "no workout" empty state — gray, sad, "you have nothing planned." This design treats rest as a *first-class state* with its own card, its own one-line philosophy ("Recovery is where the gains stick."), its own escape hatch ("Train anyway"). Rest is a choice, not an absence.

3. **Auto-save in the Weekly Plan editor.** No Save button. No "Are you sure?" Tap a routine, the row updates, the sheet stays open. Sheet close = done. This makes the plan feel *malleable* — Diego can fiddle with it in 20 seconds without committing. The friction of a Save button is what stops people from iterating on their plan.

One restraint move: **the star is gone, and nothing replaces it.** No "favorite" workaround. The plan is the plan. If Diego wants a routine to be the easy-default, he assigns it to multiple weekdays. That's the system. We don't add an extra concept for "most-used."

---

## Open items I'm flagging to Emmett + Sonny

- **Time estimate computation:** I want `~45 min` in the meta line. Emmett to confirm: do we compute it from `sets × (rest + ~60s)` per machine, or is that too lossy without per-machine duration? If too lossy, drop the line — don't fake it.
- **"Last session" lookup:** needs a query path from `routine_items.machine_id` → most recent `workout_sets` row where the session was for *this routine*. Emmett to architect. If query is expensive per-machine on render, we may need to denormalize a `last_weight` field on `routine_items`. Defer to Emmett's call.
- **Routine deleted while assigned:** Spec says "affected weekdays silently revert to Rest day." Emmett to confirm DB-level — does `assigned_weekdays` array get auto-cleaned, or does the Today page filter null lookups? Either works UX-side; pick the cheaper one.
- **Sonny: focus return after picker close inside sheet.** Nested modal pattern — when the routine picker inside the sheet closes, focus should return to the weekday row, not the sheet's close button. Verify in Playwright.

---

*Allison out. Over to Emmett for architecture + Sonny for QA matrix.*
