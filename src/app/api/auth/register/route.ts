import { createUser, getUserByEmail } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Esquema de validación
const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar entrada
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.format()._errors[0] || "Datos inválidos" },
        { status: 400 }
      );
    }
    
    const { name, email, password } = validation.data;
    
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
    
    return NextResponse.json(
      { message: "Usuario registrado exitosamente" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en el registro:", error);
    
    // Proporcionar un mensaje de error más específico si está disponible
    return NextResponse.json(
      { 
        message: error.message || "Error en el servidor", 
        details: process.env.NODE_ENV === "development" ? error.toString() : undefined 
      },
      { status: 500 }
    );
  }
}
