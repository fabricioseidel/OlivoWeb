import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

// GET /api/email/log — List email logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (!["ADMIN", "SELLER"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 50;
    const status = searchParams.get("status");
    const template = searchParams.get("template");

    let query = supabaseServer
      .from("email_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (template) query = query.eq("template_slug", template);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
