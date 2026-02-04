"use client";

import Link from "next/link";
import { Star, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StartWorkoutButton } from "./start-workout-button";
import type { RoutineWithItems } from "@/types";

interface RoutineCardProps {
  routine: RoutineWithItems;
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const machineCount = routine.routine_items?.length || 0;

  return (
    <Link href={`/routines/${routine.id}`}>
      <Card variant="interactive">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary">
                  {routine.name}
                </h3>
                {routine.is_default && (
                  <Star className="w-4 h-4 text-status-warning fill-status-warning" />
                )}
              </div>
              {routine.notes && (
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {routine.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-text-secondary">
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">
                {machineCount} {machineCount === 1 ? "machine" : "machines"}
              </span>
            </div>

            <div onClick={(e) => e.preventDefault()}>
              <StartWorkoutButton routineId={routine.id} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
