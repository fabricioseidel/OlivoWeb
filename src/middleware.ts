import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Protege /admin/** y /api/admin/** a nivel de edge. Antes esto estaba
 * desactivado y solo había guardas client-side en AdminLayout, lo que
 * permitía pegarle directo a las APIs sin sesión.
 *
 * - /admin/**         → si no hay sesión, redirige a /login?callbackUrl=...
 * - /api/admin/**     → si no hay sesión, devuelve 401 JSON (no redirect)
 * - role insuficiente → 403 (o redirige al home si es navegación)
 *
 * Las APIs ya validan rol con requireApiAdmin*, este middleware suma una
 * capa adicional de "no autenticado = no pasa".
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bootstrap usa su propio token (ADMIN_SETUP_TOKEN) y debe poder usarse
  // antes de que exista cualquier sesión. Dejarlo pasar.
  if (pathname === "/api/admin/bootstrap") {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isApiAdmin = pathname.startsWith("/api/admin");
  const role = ((token as any)?.role || (token as any)?.user?.role || "").toString().toUpperCase();

  if (!token) {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sesión existe pero rol insuficiente
  if (role !== "ADMIN" && role !== "SELLER") {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/admin",
    "/dashboard/:path*",
    "/dashboard",
    "/api/admin/:path*",
  ],
};
