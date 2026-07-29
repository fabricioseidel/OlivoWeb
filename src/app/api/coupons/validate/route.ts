import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/server/coupon.service";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/coupons/validate — Validate coupon code (public)
export async function POST(request: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = rateLimit(`cupon:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { valid: false, discount: 0, message: "Demasiados intentos. Intenta más tarde." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

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
