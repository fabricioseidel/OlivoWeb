import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Desactivamos temporalmente withAuth para diagnosticar el bucle de redirección en producción.
// La protección ahora recaerá principalmente en el AdminLayout.tsx (lado del cliente).
export function middleware(request: NextRequest) {
    // Permitir pasar todas las rutas. La validación se hace en el cliente.
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/admin", "/dashboard"],
};
