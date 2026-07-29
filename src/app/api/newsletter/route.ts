import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdmin } from "@/lib/api-auth";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/newsletter — Subscribe
export async function POST(request: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = rateLimit(`newsletter:${getClientIp(request)}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email, name, source } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { error } = await supabaseServer.from("newsletter_subscribers").upsert(
      {
        email: email.toLowerCase().trim(),
        name: name || null,
        source: source || "website",
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error("[Newsletter] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Suscrito con éxito" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/newsletter — List subscribers (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    let query = supabaseServer
      .from("newsletter_subscribers")
      .select("id, email, name, is_active, subscribed_at, unsubscribed_at")
      .order("subscribed_at", { ascending: false });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/newsletter — Unsubscribe (requiere token firmado o sesión ADMIN)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const isAdmin = (await requireApiAdmin()).ok;
    if (!isAdmin && (!token || !verifyUnsubscribeToken(email, token))) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 });
    }

    await supabaseServer
      .from("newsletter_subscribers")
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq("email", email.toLowerCase().trim());

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
