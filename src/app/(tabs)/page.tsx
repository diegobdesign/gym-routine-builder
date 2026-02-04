"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StartWorkoutButton } from "@/components/routines/start-workout-button";
import { formatRelativeDate } from "@/lib/utils";
import type { RoutineWithItems, WorkoutSession } from "@/types";

async function fetchDefaultRoutine(): Promise<RoutineWithItems | null> {
  const res = await fetch("/api/routines?default=true");
  if (!res.ok) return null;
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

async function fetchLastWorkout(): Promise<WorkoutSession | null> {
  const res = await fetch("/api/workouts/latest");
  if (!res.ok) return null;
  return res.json();
}

export default function TodayPage() {
  const { data: defaultRoutine, isLoading: loadingRoutine } = useQuery({
    queryKey: ["defaultRoutine"],
    queryFn: fetchDefaultRoutine,
  });

  const { data: lastWorkout, isLoading: loadingWorkout } = useQuery({
    queryKey: ["lastWorkout"],
    queryFn: fetchLastWorkout,
  });

  const isLoading = loadingRoutine || loadingWorkout;

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
      ) : defaultRoutine ? (
        <>
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

          {lastWorkout && (
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bg-input flex items-center justify-center">
                  <Clock className="w-6 h-6 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Last workout</p>
                  <p className="text-text-primary font-medium">
                    {formatRelativeDate(lastWorkout.started_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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
    </div>
  );
}
