import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        `
        *,
        routine:routines (*),
        workout_sets (*)
      `
      )
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching in-progress workout:", error);
      return NextResponse.json(
        { error: "Failed to fetch in-progress workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in in-progress workout API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
