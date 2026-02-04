"use client";

import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeightInput } from "./weight-input";
import type { RoutineItemWithMachine } from "@/types";

interface WorkSetScreenProps {
  item: RoutineItemWithMachine;
  currentSet: number;
  totalSets: number;
  weight: number;
  onWeightChange: (weight: number) => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export function WorkSetScreen({
  item,
  currentSet,
  totalSets,
  weight,
  onWeightChange,
  onComplete,
  isLoading = false,
}: WorkSetScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border-default flex items-center justify-center mb-6">
          <Dumbbell className="w-8 h-8 text-accent-green" />
        </div>

        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          {item.machine.name}
        </h1>

        <p className="text-text-secondary text-center mb-8">
          Set {currentSet} of {totalSets} · {item.reps} reps
        </p>

        <WeightInput
          value={weight}
          onChange={onWeightChange}
          className="mb-auto"
        />
      </div>

      <div className="p-6 pb-safe">
        <Button
          onClick={onComplete}
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Complete Set
        </Button>
      </div>
    </div>
  );
}
