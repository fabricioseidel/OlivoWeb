import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isAdmin(session: any) {
  const role = session?.role || session?.user?.role;
  return typeof role === "string" && role.toUpperCase().includes("ADMIN");
}

async function ensureAdmin() {
  const session: any = await getServerSession(authOptions as any);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return session;
}

export async function GET(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";

  try {
    const query = supabaseAdmin
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (search) {
      query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[SUPPLIERS][GET] Error:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los proveedores" },
        { status: 500 },
      );
    }

    const supplierIds = (data ?? []).map((s: any) => s.id);
    let counts: Record<string, number> = {};
    if (supplierIds.length) {
      const { data: links, error: linkError } = await supabaseAdmin
        .from("product_suppliers")
        .select("supplier_id");
      if (!linkError && Array.isArray(links)) {
        counts = links.reduce<Record<string, number>>((acc, row: any) => {
          const key = row?.supplier_id;
          if (key) acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
      }
    }

    const result = (data ?? []).map((supplier: any) => ({
      ...supplier,
      productCount: counts[supplier.id] ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[SUPPLIERS][GET] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los proveedores" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const payload = {
      name: String(body?.name ?? "").trim(),
      contact_name: body?.contactName ? String(body.contactName).trim() : null,
      phone: body?.phone ? String(body.phone).trim() : null,
      whatsapp: body?.whatsapp ? String(body.whatsapp).trim() : null,
      email: body?.email ? String(body.email).trim() : null,
      notes: body?.notes ? String(body.notes).trim() : null,
      lead_time_days:
        typeof body?.leadTimeDays === "number" ? body.leadTimeDays : null,
      min_order_amount:
        body?.minOrderAmount != null ? Number(body.minOrderAmount) : null,
      dispatch_days: body?.dispatchDays ? String(body.dispatchDays).trim() : null,
      payment_type: body?.paymentType ? String(body.paymentType).trim() : null,
    };

    if (!payload.name) {
      return NextResponse.json(
        { error: "El nombre del proveedor es obligatorio" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[SUPPLIERS][POST] Error:", error);
      return NextResponse.json(
        { error: "No se pudo crear el proveedor" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[SUPPLIERS][POST] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo crear el proveedor" },
      { status: 500 },
    );
  }
}
