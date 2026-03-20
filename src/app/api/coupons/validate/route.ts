import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/server/coupon.service";

// POST /api/coupons/validate — Validate coupon code (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cartTotal, customerEmail } = body;

    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const result = await validateCoupon(code, cartTotal || 0, customerEmail);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, discount: 0, message: error.message || "Error al validar cupón" },
      { status: 500 }
    );
  }
}
