import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Buscar en la tabla de pedidos el más reciente para este email
    // Usamos supabaseAdmin porque esto lo consulta el cliente pero sobre una base de datos segura
    const { data: lastOrder, error } = await supabaseAdmin
      .from("orders")
      .select("shipping_address")
      .eq("shipping_address->>email", email.toLowerCase().trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[API/LAST-ADDRESS] Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!lastOrder || !lastOrder.shipping_address) {
      // Si no hay pedidos, intentar buscar en la tabla de clientes
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("name, phone, email")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
        
      if (customer) {
          return NextResponse.json({ 
              address: { 
                  fullName: customer.name, 
                  email: customer.email, 
                  phone: customer.phone 
              } 
          });
      }

      return NextResponse.json({ address: null });
    }

    return NextResponse.json({ address: lastOrder.shipping_address });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
