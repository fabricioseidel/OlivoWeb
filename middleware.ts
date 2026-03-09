import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ["/admin"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Obtener la sesión
  const session = await auth();

  // Si no hay sesión, redirigir a login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar el rol
  const userRole = (session.user as any)?.role || (session as any)?.role;

  if (userRole !== "ADMIN" && userRole !== "SELLER") {
    // Redirigir a home si no tiene permisos
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Permitir el acceso
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
