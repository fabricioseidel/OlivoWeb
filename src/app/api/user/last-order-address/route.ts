import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireApiAuth } from "@/lib/api-auth";

/**
 * GET /api/user/last-order-address
 * Devuelve la última dirección de envío del USUARIO AUTENTICADO.
 *
 * Antes recibía un `email` por querystring sin validar sesión, lo que
 * permitía a cualquiera consultar la dirección de cualquier persona.
 * Ahora se ignora cualquier email externo y se usa el de la sesión.
 */
export async function GET(_req: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const sessionEmail = (auth.session?.user?.email || "").toLowerCase().trim();
  if (!sessionEmail) {
    return NextResponse.json({ address: null });
  }

  try {
    const { data: lastOrder, error } = await supabaseAdmin
      .from("orders")
      .select("shipping_address")
      .eq("shipping_address->>email", sessionEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[API/LAST-ADDRESS] Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!lastOrder || !lastOrder.shipping_address) {
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("name, phone, email")
        .eq("email", sessionEmail)
        .maybeSingle();

      if (customer) {
        return NextResponse.json({
          address: {
            fullName: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
        });
      }

      return NextResponse.json({ address: null });
    }

    return NextResponse.json({ address: lastOrder.shipping_address });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
