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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[SUPPLIERS][GET] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('[SUPPLIERS][GET] Unexpected:', error);
    return NextResponse.json(
      { error: 'Error al obtener proveedor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  const { id: supplierId } = await params;
  if (!supplierId) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 },
    );
  }

  try {
    const body = await req.json();
    const payload: Record<string, any> = {};

    if (body?.name !== undefined) payload.name = String(body.name).trim();
    if (body?.contactName !== undefined)
      payload.contact_name = body.contactName
        ? String(body.contactName).trim()
        : null;
    if (body?.phone !== undefined)
      payload.phone = body.phone ? String(body.phone).trim() : null;
    if (body?.whatsapp !== undefined)
      payload.whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null;
    if (body?.email !== undefined)
      payload.email = body.email ? String(body.email).trim() : null;
    if (body?.notes !== undefined)
      payload.notes = body.notes ? String(body.notes).trim() : null;
    if (body?.leadTimeDays !== undefined)
      payload.lead_time_days =
        typeof body.leadTimeDays === "number" ? body.leadTimeDays : null;
    if (body?.minOrderAmount !== undefined)
      payload.min_order_amount =
        body.minOrderAmount != null ? Number(body.minOrderAmount) : null;
    if (body?.dispatchDays !== undefined)
      payload.dispatch_days = body.dispatchDays ? String(body.dispatchDays).trim() : null;
    if (body?.paymentType !== undefined)
      payload.payment_type = body.paymentType ? String(body.paymentType).trim() : null;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No hay cambios que aplicar" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("suppliers")
      .update(payload)
      .eq("id", supplierId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[SUPPLIERS][PATCH] Error:", error);
      return NextResponse.json(
        { error: "No se pudo actualizar el proveedor" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[SUPPLIERS][PATCH] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el proveedor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await ensureAdmin();
  if (session instanceof NextResponse) return session;

  const { id: supplierId } = await params;
  if (!supplierId) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 },
    );
  }

  try {
    const { error } = await supabaseAdmin
      .from("suppliers")
      .delete()
      .eq("id", supplierId);

    if (error) {
      console.error("[SUPPLIERS][DELETE] Error:", error);
      return NextResponse.json(
        { error: "No se pudo eliminar el proveedor" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SUPPLIERS][DELETE] Unexpected:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el proveedor" },
      { status: 500 },
    );
  }
}
