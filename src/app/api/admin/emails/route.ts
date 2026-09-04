import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdmin } from "@/lib/api-auth";

/** GET all templates */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await supabaseServer
      .from("email_templates")
      .select("*")
      .order("slug", { ascending: true });

    if (error) throw error;
    const normalized = (data || []).map((t: any) => ({
      ...t,
      body_html: t.body_html || t.html_body || "",
    }));
    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("[API Email] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST/PATCH: Update or Create template */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { slug, subject, body_html, description } = body;

    if (!slug || !subject || !body_html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let { data, error } = await supabaseServer
      .from("email_templates")
      .upsert({
        slug,
        subject,
        body_html,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    // Si falló por columna body_html inexistente, reintentar con html_body
    if (error && String(error.message).includes("body_html")) {
      const retry = await supabaseServer
        .from("email_templates")
        .upsert({
          slug,
          subject,
          html_body: body_html,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API Email] POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
