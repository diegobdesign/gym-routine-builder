import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, unset all other defaults
    const { error: unsetError } = await supabase
      .from("routines")
      .update({ is_default: false })
      .eq("is_default", true);

    if (unsetError) {
      console.error("Error unsetting defaults:", unsetError);
      return NextResponse.json(
        { error: "Failed to update default routine" },
        { status: 500 }
      );
    }

    // Set this routine as default
    const { data, error } = await supabase
      .from("routines")
      .update({ is_default: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error setting default routine:", error);
      return NextResponse.json(
        { error: "Failed to set default routine" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in default API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
