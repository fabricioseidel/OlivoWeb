import { createUser, getUserByEmail } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { createCoupon } from "@/server/coupon.service";
import { BIENVENIDA } from "@/lib/bienvenida";
import { addBonusPoints } from "@/server/loyalty.service";
import { sendWelcomeEmail } from "@/server/email.service";
import { enviarVerificacion } from "@/server/verificacion-correo.service";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Esquema de validación
const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = rateLimit(`register:${ip}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { message: "Demasiados intentos de registro. Intenta más tarde." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await req.json();

    // Validar entrada
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = validation.error.format()._errors?.[0] || "Datos inválidos";
      return NextResponse.json(
        { message: errorMsg },
        { status: 400 }
      );
    }

    const { name, email, password, source } = validation.data;

    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { message: "El correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    // Crear usuario
    const user = await createUser({ name, email, password });

    if (!user) {
      throw new Error("No se pudo crear el usuario");
    }

    let couponCode = "";
    const initialPoints = source === "tienda_fisica" ? 200 : 50;

    /**
     * Cupón de bienvenida, para todos los que se registran.
     *
     * Antes lo recibía sólo quien venía del QR de la tienda física; quien se
     * registraba desde la web se llevaba 50 puntos ($500) y nada más. Con el
     * tráfico llegando de Instagram y de Google Maps, eso dejaba sin premio
     * justo a la gente que hay que convertir.
     *
     * Es un cupón **personal**, con código propio por persona, y no uno global:
     * un código global termina publicado en los sitios de cupones y lo usa
     * cualquiera, cuantas veces quiera. Con uno por cuenta, "primera compra"
     * se puede garantizar de verdad.
     *
     * Se emite con `auto_apply` para que el checkout lo aplique solo. Pedirle
     * al cliente que se acuerde de un código es donde se pierden las ventas.
     *
     * No se acumula con las ofertas: el descuento se calcula sólo sobre la
     * parte del carrito que está a precio de lista (ver `baseDescontable` en
     * `lib/pricing`). Por eso puede ser 20% sin que ningún producto quede bajo
     * el costo.
     */
    try {
      const coupon = await createCoupon({
        code: `OLIVO20-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        name: "Descuento de bienvenida",
        description: "20% en tu primera compra. No se acumula con productos en oferta.",
        discount_type: "percentage",
        discount_value: BIENVENIDA.porcentaje,
        min_purchase: BIENVENIDA.compraMinima,
        // Tope para que un primer pedido grande no se lleve un descuento que
        // el margen no aguanta: se alcanza con un carrito de $50.000.
        max_discount: BIENVENIDA.topeDescuento,
        valid_until: new Date(Date.now() + BIENVENIDA.diasDeVigencia * 24 * 60 * 60 * 1000).toISOString(),
        max_uses: 1,
        max_uses_per_customer: 1,
        auto_apply: true,
        is_active: true,
      });
      couponCode = coupon?.code || "";
    } catch (couponErr) {
      // Que falle el cupón no puede impedir que la cuenta se cree: el usuario
      // ya existe a esta altura y quedaría sin poder entrar.
      console.warn("[Register] Error creando cupón de bienvenida:", couponErr);
    }

    // 2. Acreditar Puntos de Bienvenida en la base de datos (física: 200, web: 50)
    try {
      await addBonusPoints({
        customerEmail: email,
        points: initialPoints,
        description: source === "tienda_fisica" ? "Bonus de bienvenida (Tienda Física)" : "Bonus de bienvenida Club OlivoMarket"
      });
    } catch (ptsErr) {
      console.warn("[Register] Error acreditando puntos de bienvenida:", ptsErr);
    }

    // 3. Registrar o actualizar en la tabla customers para CRM
    try {
      await supabaseServer
        .from("customers")
        .upsert({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          customer_type: "regular",
          source: source || "web_registro",
          marketing_consent: true,
          loyalty_points: initialPoints,
        }, { onConflict: "email" });
    } catch (custErr) {
      console.warn("[Register] Error creando registro en customers:", custErr);
    }

    // 4. Confirmación del correo. Va antes que la bienvenida porque es el
    //    que la persona necesita para poder entrar: la cuenta queda creada
    //    pero sin `email_verified_at`, y el login la rechaza hasta que use el
    //    enlace.
    try {
      await enviarVerificacion({ email, nombre: name });
    } catch (verifErr) {
      console.error("[Register] No se pudo enviar la verificación:", verifErr);
    }

    // 5. Enviar el Email de Bienvenida Premium
    try {
      await sendWelcomeEmail({
        to: email,
        customerName: name,
        couponCode: couponCode || undefined,
        bonusPoints: initialPoints
      });
    } catch (emailErr) {
      console.warn("[Register] Error enviando email de bienvenida:", emailErr);
    }

    return NextResponse.json(
      { 
        message: "Usuario registrado exitosamente",
        couponCode: couponCode,
        bonusPoints: initialPoints
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en el registro:", error);
    return NextResponse.json(
      { message: error.message || "Error en el servidor" },
      { status: 500 }
    );
  }
}
