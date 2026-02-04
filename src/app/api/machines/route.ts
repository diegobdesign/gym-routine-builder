import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("category")
      .order("name");

    if (error) {
      console.error("Error fetching machines:", error);
      return NextResponse.json(
        { error: "Failed to fetch machines" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in machines API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
