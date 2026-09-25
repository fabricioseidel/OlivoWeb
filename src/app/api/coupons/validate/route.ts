import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/server/coupon.service";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase-server";
import { baseDescontable, precioEfectivo } from "@/lib/pricing";

/**
 * Vista previa del cupón para el checkout.
 *
 * El número que devuelve esta ruta es el que el cliente ve antes de pagar, así
 * que tiene que ser **el mismo** que después cobra `create-order`. Por eso los
 * precios los pone el catálogo y no el navegador: si la base saliera de lo que
 * manda el cliente, bastaría con declarar un producto en oferta como si
 * estuviera a precio de lista para que la vista previa mostrara un descuento
 * que el servidor no va a aplicar — y el cliente vería un total y pagaría otro,
 * que es exactamente el problema que ya nos costó un pedido cobrado de más.
 */
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
    const { code, cartTotal, customerEmail, items } = body;

    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    // Del carrito sólo se toman los códigos y las cantidades; los precios los
    // pone la base.
    let subtotal = Number(cartTotal) || 0;
    let base: number | undefined;

    if (Array.isArray(items) && items.length > 0 && items.length <= 200) {
      const ids = items.map((i: any) => String(i.id));
      const { data: productos } = await supabaseServer
        .from("products")
        .select("barcode, sale_price, offer_price")
        .in("barcode", ids);

      const lineas = items.map((i: any) => {
        const p = productos?.find((d: any) => String(d.barcode) === String(i.id));
        return {
          precioVenta: p?.sale_price,
          precioOferta: p?.offer_price,
          cantidad: Number(i.quantity),
        };
      });

      base = baseDescontable(lineas);
      // El subtotal también se recalcula: la compra mínima del cupón se mide
      // contra el catálogo, no contra lo que diga el navegador.
      subtotal = lineas.reduce(
        (s, l) =>
          s +
          precioEfectivo(l.precioVenta, l.precioOferta) *
            Math.max(0, Math.floor(Number(l.cantidad) || 0)),
        0
      );
    }

    const result = await validateCoupon(code, subtotal, customerEmail, base);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, discount: 0, message: error.message || "Error al validar cupón" },
      { status: 500 }
    );
  }
}
