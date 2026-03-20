import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/server/coupon.service";

// GET /api/coupons — List all coupons (admin only)
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (!["ADMIN", "SELLER"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const coupons = await getCoupons();
    return NextResponse.json(coupons);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/coupons — Create coupon (admin only)
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const coupon = await createCoupon(body);
    return NextResponse.json(coupon, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/coupons — Update coupon (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const coupon = await updateCoupon(body.id, body);
    return NextResponse.json(coupon);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/coupons — Delete coupon (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = String(session?.role || session?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await deleteCoupon(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
