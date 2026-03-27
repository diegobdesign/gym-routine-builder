"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutHistoryCard } from "@/components/workout/workout-history-card";
import { WorkoutHistoryModal } from "@/components/workout/workout-history-modal";
import type { RoutineWithItems, WorkoutSessionWithDetails } from "@/types";

async function fetchAllRoutines(): Promise<RoutineWithItems[]> {
  const res = await fetch("/api/routines");
  if (!res.ok) return [];
  return res.json();
}

async function fetchWorkoutHistory(): Promise<WorkoutSessionWithDetails[]> {
  const res = await fetch("/api/workouts/history");
  if (!res.ok) return [];
  return res.json();
}

function RoutineStartCard({ routine }: { routine: RoutineWithItems }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const exerciseCount = routine.routine_items?.length || 0;

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workouts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId: routine.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to start workout");
      }

      const session = await res.json();
      router.push(`/workout/${session.id}`);
    } catch (error) {
      console.error("Error starting workout:", error);
      alert("Failed to start workout. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleStart} disabled={isLoading} className="text-left w-full">
      <Card variant="interactive">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary text-sm truncate">
                {routine.name}
              </h3>
              <div className="flex items-center gap-1 text-text-secondary mt-1">
                <Dumbbell className="w-3 h-3 shrink-0" />
                <span className="text-xs">
                  {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                </span>
              </div>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent-green/15 flex items-center justify-center">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4 text-accent-green fill-accent-green" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export default function TodayPage() {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionWithDetails | null>(null);

  const { data: routines = [], isLoading: loadingRoutines } = useQuery({
    queryKey: ["allRoutines"],
    queryFn: fetchAllRoutines,
  });

  const { data: workoutHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["workoutHistory"],
    queryFn: fetchWorkoutHistory,
  });

  const isLoading = loadingRoutines || loadingHistory;

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-text-primary">Today</h1>
        <p className="text-text-secondary">Ready to train?</p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-40 bg-bg-card rounded-2xl animate-pulse" />
          <div className="h-24 bg-bg-card rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
          {routines.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Your Routines
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {routines.map((routine) => (
                  <RoutineStartCard key={routine.id} routine={routine} />
                ))}
              </div>
            </section>
          )}

          {workoutHistory.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Recent Workouts
              </h2>
              <div className="space-y-3">
                {workoutHistory.map((workout) => (
                  <WorkoutHistoryCard
                    key={workout.id}
                    workout={workout}
                    onClick={() => setSelectedWorkout(workout)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <WorkoutHistoryModal
        workout={selectedWorkout}
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
    </div>
  );
}
