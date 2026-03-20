import { createUser, getUserByEmail } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCoupon } from "@/server/coupon.service";
import { addBonusPoints } from "@/server/loyalty.service";
import { sendWelcomeEmail } from "@/server/email.service";

// Esquema de validación
const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  source: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
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
    
    // Lógica de Fidelización Automática
    if (source === "tienda_fisica") {
       // 1. Generar Cupón de 15% (Específico para Tienda Física)
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

       // 2. Regalar 200 Puntos de Bienvenida
       await addBonusPoints({
         customerEmail: email,
         points: 200,
         description: "Bonus de bienvenida (Tienda Física)"
       });
    }

    // 3. Enviar el Email de Bienvenida Premium
    await sendWelcomeEmail({
      to: email,
      customerName: name,
      couponCode: couponCode,
      bonusPoints: source === "tienda_fisica" ? 200 : 50
    });

    return NextResponse.json(
      { 
        message: "Usuario registrado exitosamente",
        couponCode: couponCode
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
