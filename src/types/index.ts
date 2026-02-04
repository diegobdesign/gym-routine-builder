export interface Machine {
  id: string;
  name: string;
  category: 'upper' | 'lower' | 'core' | 'cardio';
}

export interface Routine {
  id: string;
  name: string;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineWithItems extends Routine {
  routine_items: RoutineItemWithMachine[];
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  machine_id: string;
  position: number;
  sets: number;
  reps: number;
  rest_seconds: number;
  default_weight: number | null;
}

export interface RoutineItemWithMachine extends RoutineItem {
  machine: Machine;
}

export interface WorkoutSession {
  id: string;
  routine_id: string;
  started_at: string;
  ended_at: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface WorkoutSessionWithRoutine extends WorkoutSession {
  routine: Routine;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  routine_item_id: string;
  set_number: number;
  target_reps: number;
  actual_reps: number | null;
  weight: number;
  completed_at: string;
}

export interface WorkoutSetWithItem extends WorkoutSet {
  routine_item: RoutineItemWithMachine;
}

// Form types
export interface RoutineFormData {
  name: string;
  notes?: string;
}

export interface RoutineItemFormData {
  machine_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  default_weight?: number;
}

// Workout player state
export type WorkoutPhase = 'idle' | 'working' | 'resting' | 'summary';

export interface WorkoutPlayerState {
  sessionId: string | null;
  phase: WorkoutPhase;
  currentItemIndex: number;
  currentSetNumber: number;
  items: RoutineItemWithMachine[];
  completedSets: WorkoutSet[];
  restTimeRemaining: number;
  isPaused: boolean;
}
