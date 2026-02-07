"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StartWorkoutButton } from "@/components/routines/start-workout-button";
import { WorkoutHistoryCard } from "@/components/workout/workout-history-card";
import { WorkoutHistoryModal } from "@/components/workout/workout-history-modal";
import type { RoutineWithItems, WorkoutSessionWithDetails } from "@/types";

async function fetchDefaultRoutine(): Promise<RoutineWithItems | null> {
  const res = await fetch("/api/routines?default=true");
  if (!res.ok) return null;
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

async function fetchWorkoutHistory(): Promise<WorkoutSessionWithDetails[]> {
  const res = await fetch("/api/workouts/history");
  if (!res.ok) return [];
  return res.json();
}

export default function TodayPage() {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionWithDetails | null>(null);

  const { data: defaultRoutine, isLoading: loadingRoutine } = useQuery({
    queryKey: ["defaultRoutine"],
    queryFn: fetchDefaultRoutine,
  });

  const { data: workoutHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["workoutHistory"],
    queryFn: fetchWorkoutHistory,
  });

  const isLoading = loadingRoutine || loadingHistory;

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
          {defaultRoutine ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">
                        Next Routine
                      </p>
                      <h2 className="text-xl font-semibold text-text-primary">
                        {defaultRoutine.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Dumbbell className="w-4 h-4" />
                      <span className="text-sm">
                        {defaultRoutine.routine_items?.length || 0} machines
                      </span>
                    </div>
                  </div>

                  {defaultRoutine.routine_items &&
                    defaultRoutine.routine_items.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {defaultRoutine.routine_items.slice(0, 4).map((item) => (
                          <span
                            key={item.id}
                            className="px-3 py-1 text-sm bg-bg-input rounded-lg text-text-secondary"
                          >
                            {item.machine.name}
                          </span>
                        ))}
                        {defaultRoutine.routine_items.length > 4 && (
                          <span className="px-3 py-1 text-sm bg-bg-input rounded-lg text-text-secondary">
                            +{defaultRoutine.routine_items.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                  <StartWorkoutButton
                    routineId={defaultRoutine.id}
                    size="lg"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No routine selected"
              description="Create a routine and set it as default to see it here"
              action={
                <Link href="/build">
                  <Button>Create Routine</Button>
                </Link>
              }
            />
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
