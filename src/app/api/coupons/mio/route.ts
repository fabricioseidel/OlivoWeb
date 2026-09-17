import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/config/auth.config";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * El cupón que esta persona tiene sin usar y se aplica solo.
 *
 * La tabla `coupons` tenía la columna `auto_apply` desde siempre, se guardaba
 * al crear el cupón… y nadie la leía nunca. El cliente recibía su cupón de
 * bienvenida al registrarse y después tenía que acordarse del código y
 * tipearlo en el checkout. Ahí es donde se pierden las ventas.
 *
 * Devuelve el código, no el descuento: cuánto descuenta depende del carrito
 * —los cupones no se acumulan con las ofertas— y eso lo calcula
 * `/api/coupons/validate`, que es el único que sabe la regla. Que este
 * endpoint devolviera un monto sería una segunda verdad esperando divergir.
 *
 * Sale de la sesión y no de un email en la URL: con el email como parámetro,
 * cualquiera podría preguntar por el cupón de otro.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) return NextResponse.json({ cupon: null });

  const ahora = new Date().toISOString();

  const { data: cupones, error } = await supabaseServer
    .from("coupons")
    .select("id, code, name, description, discount_type, discount_value, min_purchase, max_discount, valid_until, max_uses, uses_count, max_uses_per_customer")
    .eq("auto_apply", true)
    .eq("is_active", true)
    .lte("valid_from", ahora)
    .or(`valid_until.is.null,valid_until.gte.${ahora}`)
    .order("discount_value", { ascending: false });

  if (error || !cupones?.length) return NextResponse.json({ cupon: null });

  // Los ya consumidos por esta persona quedan fuera. Se pregunta una sola vez
  // por todos los candidatos en vez de uno por uno.
  const { data: usados } = await supabaseServer
    .from("coupon_usage")
    .select("coupon_id")
    .eq("customer_email", email)
    .in("coupon_id", cupones.map((c) => c.id));

  const vecesUsado = new Map<number, number>();
  for (const u of usados ?? []) {
    vecesUsado.set(Number(u.coupon_id), (vecesUsado.get(Number(u.coupon_id)) ?? 0) + 1);
  }

  const disponible = cupones.find((c) => {
    if (c.max_uses !== null && Number(c.uses_count) >= Number(c.max_uses)) return false;
    const porCliente = Number(c.max_uses_per_customer) || 1;
    return (vecesUsado.get(Number(c.id)) ?? 0) < porCliente;
  });

  if (!disponible) return NextResponse.json({ cupon: null });

  return NextResponse.json({
    cupon: {
      code: disponible.code,
      name: disponible.name,
      description: disponible.description,
      minPurchase: Number(disponible.min_purchase) || 0,
      validUntil: disponible.valid_until,
    },
  });
}
