import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const routineId = searchParams.get("routineId");

  if (!routineId) {
    return NextResponse.json(
      { error: "Routine ID is required" },
      { status: 400 }
    );
  }

  try {
    // Check if routine exists and has items
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select(
        `
        *,
        routine_items (
          *,
          machine:machines (*)
        )
      `
      )
      .eq("id", routineId)
      .single();

    if (routineError || !routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    if (!routine.routine_items || routine.routine_items.length === 0) {
      // Redirect to build page if no items
      return NextResponse.redirect(
        new URL(`/build/${routineId}`, request.url)
      );
    }

    // Create a new workout session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        routine_id: routineId,
        status: "in_progress",
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Error creating workout session:", sessionError);
      return NextResponse.json(
        { error: "Failed to start workout" },
        { status: 500 }
      );
    }

    // Redirect to the workout player
    return NextResponse.redirect(
      new URL(`/workout/${session.id}`, request.url)
    );
  } catch (error) {
    console.error("Error starting workout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routineId } = body;

    if (!routineId) {
      return NextResponse.json(
        { error: "Routine ID is required" },
        { status: 400 }
      );
    }

    // Check if routine exists
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("id")
      .eq("id", routineId)
      .single();

    if (routineError || !routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    // Create a new workout session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        routine_id: routineId,
        status: "in_progress",
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Error creating workout session:", sessionError);
      return NextResponse.json(
        { error: "Failed to start workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error starting workout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
