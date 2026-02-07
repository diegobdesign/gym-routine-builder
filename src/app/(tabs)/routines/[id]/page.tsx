"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Star,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StartWorkoutButton } from "@/components/routines/start-workout-button";
import type { RoutineWithItems } from "@/types";

async function fetchRoutine(id: string): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}`);
  if (!res.ok) throw new Error("Failed to fetch routine");
  return res.json();
}

async function deleteRoutine(id: string): Promise<void> {
  const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete routine");
}

async function duplicateRoutine(id: string): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to duplicate routine");
  return res.json();
}

async function setDefaultRoutine(id: string): Promise<void> {
  const res = await fetch(`/api/routines/${id}/default`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to set default routine");
}

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const routineId = params.id as string;

  const { data: routine, isLoading } = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => fetchRoutine(routineId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoutine(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      router.push("/routines");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateRoutine(routineId),
    onSuccess: (newRoutine) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      router.push(`/build/${newRoutine.id}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => setDefaultRoutine(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
      queryClient.invalidateQueries({ queryKey: ["defaultRoutine"] });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this routine?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-12 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-40 bg-bg-card rounded-2xl animate-pulse" />
        <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-text-secondary">Routine not found</p>
        <Link href="/routines" className="text-accent-green mt-2 inline-block">
          Go back to routines
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4 pt-2">
        <Link
          href="/routines"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">
              {routine.name}
            </h1>
            {routine.is_default && (
              <Star className="w-4 h-4 text-status-warning fill-status-warning" />
            )}
          </div>
          {routine.notes && (
            <p className="text-sm text-text-secondary">{routine.notes}</p>
          )}
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        <StartWorkoutButton routineId={routine.id} />
        <Link href={`/build/${routine.id}`}>
          <Button variant="secondary">
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </Link>
        <Button
          variant="secondary"
          onClick={() => duplicateMutation.mutate()}
          disabled={duplicateMutation.isPending}
        >
          <Copy className="w-4 h-4 mr-1" />
          Duplicate
        </Button>
        {!routine.is_default && (
          <Button
            variant="secondary"
            onClick={() => setDefaultMutation.mutate()}
            disabled={setDefaultMutation.isPending}
          >
            <Star className="w-4 h-4 mr-1" />
            Set Default
          </Button>
        )}
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Machines ({routine.routine_items?.length || 0})
        </h2>

        {routine.routine_items && routine.routine_items.length > 0 ? (
          <div className="space-y-3">
            {routine.routine_items.map((item, index) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center text-text-secondary font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">
                      {item.machine.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {item.sets} sets x {item.reps} reps
                      {item.default_weight && ` @ ${item.default_weight} kg`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">
                      {item.rest_seconds}s rest
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-text-secondary">No machines added yet</p>
              <Link
                href={`/build/${routine.id}`}
                className="text-accent-green text-sm mt-1 inline-block"
              >
                Add machines
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
