import { create } from "zustand";
import type { RoutineItemWithMachine, WorkoutSet, WorkoutPhase } from "@/types";

interface WorkoutPlayerState {
  sessionId: string | null;
  phase: WorkoutPhase;
  currentItemIndex: number;
  currentSetNumber: number;
  items: RoutineItemWithMachine[];
  completedSets: WorkoutSet[];
  restTimeRemaining: number;
  restTimerTotal: number;
  isPaused: boolean;
  currentWeight: number;

  // Actions
  initWorkout: (
    sessionId: string,
    items: RoutineItemWithMachine[],
    existingSets?: WorkoutSet[]
  ) => void;
  setPhase: (phase: WorkoutPhase) => void;
  completeSet: (set: WorkoutSet) => void;
  startRest: (seconds: number) => void;
  tickRest: () => void;
  adjustRestTime: (seconds: number) => void;
  togglePause: () => void;
  skipRest: () => void;
  nextExercise: () => void;
  setCurrentWeight: (weight: number) => void;
  resetWorkout: () => void;
}

export const useWorkoutPlayer = create<WorkoutPlayerState>((set, get) => ({
  sessionId: null,
  phase: "idle",
  currentItemIndex: 0,
  currentSetNumber: 1,
  items: [],
  completedSets: [],
  restTimeRemaining: 0,
  restTimerTotal: 0,
  isPaused: false,
  currentWeight: 0,

  initWorkout: (sessionId, items, existingSets = []) => {
    // Calculate starting position based on existing sets
    let startItemIndex = 0;
    let startSetNumber = 1;

    if (existingSets.length > 0) {
      // Find the last completed set
      const sortedSets = [...existingSets].sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime()
      );
      const lastSet = sortedSets[0];

      // Find which item this set belongs to
      const itemIndex = items.findIndex(
        (item) => item.id === lastSet.routine_item_id
      );

      if (itemIndex !== -1) {
        const item = items[itemIndex];
        const setsForItem = existingSets.filter(
          (s) => s.routine_item_id === item.id
        );

        if (setsForItem.length >= item.sets) {
          // Move to next item
          startItemIndex = itemIndex + 1;
          startSetNumber = 1;
        } else {
          // Continue with current item
          startItemIndex = itemIndex;
          startSetNumber = setsForItem.length + 1;
        }
      }
    }

    const initialWeight =
      startItemIndex < items.length
        ? items[startItemIndex].default_weight || 0
        : 0;

    set({
      sessionId,
      items,
      completedSets: existingSets,
      currentItemIndex: startItemIndex,
      currentSetNumber: startSetNumber,
      phase: startItemIndex >= items.length ? "summary" : "working",
      currentWeight: initialWeight,
      isPaused: false,
      restTimeRemaining: 0,
    });
  },

  setPhase: (phase) => set({ phase }),

  completeSet: (completedSet) => {
    const state = get();
    const currentItem = state.items[state.currentItemIndex];

    const newCompletedSets = [...state.completedSets, completedSet];

    // Check if this was the last set for current exercise
    const setsForCurrentItem = newCompletedSets.filter(
      (s) => s.routine_item_id === currentItem.id
    );

    if (setsForCurrentItem.length >= currentItem.sets) {
      // Check if there are more exercises
      if (state.currentItemIndex + 1 >= state.items.length) {
        // Workout complete
        set({
          completedSets: newCompletedSets,
          phase: "summary",
        });
      } else {
        // Start rest before next exercise
        set({
          completedSets: newCompletedSets,
          restTimeRemaining: currentItem.rest_seconds,
          restTimerTotal: currentItem.rest_seconds,
          phase: "resting",
        });
      }
    } else {
      // More sets for current exercise, start rest
      set({
        completedSets: newCompletedSets,
        currentSetNumber: state.currentSetNumber + 1,
        restTimeRemaining: currentItem.rest_seconds,
        restTimerTotal: currentItem.rest_seconds,
        phase: "resting",
      });
    }
  },

  startRest: (seconds) =>
    set({
      restTimeRemaining: seconds,
      restTimerTotal: seconds,
      phase: "resting",
      isPaused: false,
    }),

  tickRest: () => {
    const state = get();
    if (state.isPaused) return;

    const newTime = Math.max(0, state.restTimeRemaining - 1);
    set({ restTimeRemaining: newTime });
  },

  adjustRestTime: (seconds) => {
    const state = get();
    const newTime = Math.max(0, state.restTimeRemaining + seconds);
    const newTotal = Math.max(state.restTimerTotal, newTime);
    set({ restTimeRemaining: newTime, restTimerTotal: newTotal });
  },

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  skipRest: () => {
    const state = get();
    const currentItem = state.items[state.currentItemIndex];
    const setsForCurrentItem = state.completedSets.filter(
      (s) => s.routine_item_id === currentItem.id
    );

    if (setsForCurrentItem.length >= currentItem.sets) {
      // Move to next exercise
      get().nextExercise();
    } else {
      // Continue with more sets
      set({
        phase: "working",
        restTimeRemaining: 0,
        isPaused: false,
      });
    }
  },

  nextExercise: () => {
    const state = get();
    const nextIndex = state.currentItemIndex + 1;

    if (nextIndex >= state.items.length) {
      set({ phase: "summary" });
    } else {
      const nextItem = state.items[nextIndex];
      set({
        currentItemIndex: nextIndex,
        currentSetNumber: 1,
        currentWeight: nextItem.default_weight || state.currentWeight,
        phase: "working",
        restTimeRemaining: 0,
        isPaused: false,
      });
    }
  },

  setCurrentWeight: (weight) => set({ currentWeight: weight }),

  resetWorkout: () =>
    set({
      sessionId: null,
      phase: "idle",
      currentItemIndex: 0,
      currentSetNumber: 1,
      items: [],
      completedSets: [],
      restTimeRemaining: 0,
      restTimerTotal: 0,
      isPaused: false,
      currentWeight: 0,
    }),
}));
