import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
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
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Routine not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching routine:", error);
      return NextResponse.json(
        { error: "Failed to fetch routine" },
        { status: 500 }
      );
    }

    // Sort routine_items by position
    const sortedData = {
      ...data,
      routine_items: data.routine_items?.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      ),
    };

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error("Error in routine API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("routines")
      .update({
        name: name.trim(),
        notes: notes?.trim() || null,
      })
      .eq("id", id)
      .select(
        `
        *,
        routine_items (
          *,
          machine:machines (*)
        )
      `
      )
      .single();

    if (error) {
      console.error("Error updating routine:", error);
      return NextResponse.json(
        { error: "Failed to update routine" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in routine API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase.from("routines").delete().eq("id", id);

    if (error) {
      console.error("Error deleting routine:", error);
      return NextResponse.json(
        { error: "Failed to delete routine" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in routine API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
