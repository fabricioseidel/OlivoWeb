import { NextRequest, NextResponse } from "next/server";
import { getBestAutoCoupon } from "@/server/coupon.service";

// POST /api/coupons/auto — Get the best auto-apply coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartTotal, customerEmail } = body;

    const result = await getBestAutoCoupon(cartTotal || 0, customerEmail);
    
    if (result) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ valid: false, discount: 0, message: "No hay cupones automáticos aplicables" });
    }
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, discount: 0, message: error.message || "Error al buscar cupón" },
      { status: 500 }
    );
  }
}
