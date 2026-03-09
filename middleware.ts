// Este middleware permite que el componente cliente (admin/layout.tsx) maneje la autenticación
// En lugar de bloquear en el middleware, confiamos en useSession() del lado del cliente
// Esto evita problemas de sincronización de sesión entre servidor y cliente

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Permitir todas las solicitudes - la validación de autenticación ocurre en el lado del cliente
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
