"use client";

import { Dumbbell, Play } from "lucide-react";
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

        <p className="text-text-secondary text-center mb-4">
          Set {currentSet} of {totalSets} · {item.reps} reps
        </p>

        {item.machine.video_url && (
          <a
            href={item.machine.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent-green hover:underline mb-8"
          >
            <Play className="w-4 h-4" />
            How to use this machine
          </a>
        )}

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
