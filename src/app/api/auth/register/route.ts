import { createUser, getUserByEmail } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { createCoupon } from "@/server/coupon.service";
import { addBonusPoints } from "@/server/loyalty.service";
import { sendWelcomeEmail } from "@/server/email.service";
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
    
    // Lógica de Fidelización Automática
    if (source === "tienda_fisica") {
       // 1. Generar Cupón de 15% (Específico para Tienda Física)
       try {
         const coupon = await createCoupon({
           code: `OLIVO15-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
           name: "Descuento Bienvenida Física",
           discount_type: "percentage",
           discount_value: 15,
           min_purchase: 20000,
           valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
           max_uses_per_customer: 1,
           is_active: true
         });
         couponCode = coupon?.code || "";
       } catch (couponErr) {
         console.warn("[Register] Error creando cupón de bienvenida física:", couponErr);
       }
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

    // 4. Enviar el Email de Bienvenida Premium
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
