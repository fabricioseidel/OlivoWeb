import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** GET all templates */
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .order("slug", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Email] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST/PATCH: Update or Create template */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, subject, body_html, description } = body;

    if (!slug || !subject || !body_html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("email_templates")
      .upsert({
        slug,
        subject,
        body_html,
        description,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Email] POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
