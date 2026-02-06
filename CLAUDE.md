# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mobile-first gym routine builder web app. Users create machine-based workout routines, then execute them via a guided "workout player" that tracks sets, reps, weight, and rest periods. No authentication—uses Supabase with service role key via server routes.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Tech Stack
- Next.js 16 with App Router
- React 19, TypeScript
- Supabase (PostgreSQL backend, no auth)
- Zustand for client state
- TanStack Query for server state
- Tailwind CSS v4

### Key Patterns

**Routing Structure:**
- `src/app/(tabs)/` - Main tabbed views with bottom navigation (Today, Routines, Build)
- `src/app/workout/[sessionId]/` - Full-screen workout player (no bottom nav)
- `src/app/api/` - Server routes that proxy to Supabase with service role key

**State Management:**
- `src/stores/workout-player.ts` - Zustand store managing workout session state (phase, current exercise/set, rest timer, completed sets)
- Workout phases: `idle` → `working` → `resting` → `hydrating` → `summary`

**Data Flow:**
- All Supabase calls go through API routes in `src/app/api/`
- Server uses service role key (`src/lib/supabase/server.ts`)
- Client fetches via TanStack Query with 60s stale time

### Data Model

Four main tables: `machines`, `routines`, `routine_items`, `workout_sessions`, `workout_sets`

Key relationships:
- Routine has many RoutineItems (ordered by `position`)
- RoutineItem references a Machine
- WorkoutSession belongs to a Routine and has many WorkoutSets

### Design System

Dark theme defined in `src/globals.css` with CSS custom properties:
- Colors: `--bg-app`, `--bg-card`, `--accent-green`, etc.
- Use via Tailwind: `bg-bg-app`, `text-accent-green`, etc.

### Component Organization
- `src/components/ui/` - Reusable primitives (Button, Card, Input, Modal, NumberStepper)
- `src/components/workout/` - Workout player screens (WorkSetScreen, RestScreen, HydrationReminder, WorkoutSummary)
- `src/components/routines/` - Routine management (RoutineCard, MachinePickerModal, RoutineItemForm)

## Environment Variables

Copy `.env.local.example` to `.env.local`. Required:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
