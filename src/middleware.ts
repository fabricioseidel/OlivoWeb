import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { bloqueadaPorMantenimiento, paginaMantenimiento } from "@/lib/maintenance";

/**
 * Estado del modo mantenimiento, leído de `settings` con la clave pública
 * (la tabla es de lectura pública). Se recuerda unos segundos para no hacer
 * una consulta por cada visita.
 *
 * Ante cualquier fallo se asume "sin mantenimiento": un problema leyendo la
 * configuración no puede ser lo que baje la tienda.
 */
const MANTENIMIENTO_TTL_MS = 20_000;
let mantenimientoCache: { activo: boolean; mensaje: string | null; leido: number } | null = null;

async function leerMantenimiento(): Promise<{ activo: boolean; mensaje: string | null }> {
  const ahora = Date.now();
  if (mantenimientoCache && ahora - mantenimientoCache.leido < MANTENIMIENTO_TTL_MS) {
    return mantenimientoCache;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { activo: false, mensaje: null };

  try {
    const res = await fetch(
      `${url}/rest/v1/settings?select=maintenance_mode,maintenance_message&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`settings ${res.status}`);
    const filas = (await res.json()) as Array<{
      maintenance_mode?: boolean | null;
      maintenance_message?: string | null;
    }>;
    mantenimientoCache = {
      activo: filas[0]?.maintenance_mode === true,
      mensaje: filas[0]?.maintenance_message ?? null,
      leido: ahora,
    };
  } catch {
    // Se conserva lo último que se supo; si nunca se supo nada, sitio arriba.
    mantenimientoCache = {
      activo: mantenimientoCache?.activo ?? false,
      mensaje: mantenimientoCache?.mensaje ?? null,
      leido: ahora,
    };
  }
  return mantenimientoCache;
}

/** Rutas que exigen sesión de ADMIN o SELLER. */
const PREFIJOS_PROTEGIDOS = ["/admin", "/operaciones", "/uber-eats-editor", "/api/admin"];

function esProtegida(pathname: string): boolean {
  return PREFIJOS_PROTEGIDOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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
 *
 * Además aplica el modo mantenimiento (Admin → Configuración): con él activo
 * la tienda pública responde 503 con un aviso; el panel, el login y la app de
 * operaciones siguen funcionando (ver `lib/maintenance.ts`).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (bloqueadaPorMantenimiento(pathname)) {
    const mantenimiento = await leerMantenimiento();
    // El panel también llama APIs que no cuelgan de /api/admin (productos,
    // categorías, pedidos): con sesión del equipo esas llamadas pasan, o el
    // mantenimiento dejaría el panel a medias.
    const esEquipo = async () => {
      const t = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const r = ((t as any)?.role || (t as any)?.user?.role || "").toString().toUpperCase();
      return r === "ADMIN" || r === "SELLER";
    };
    if (mantenimiento.activo && !(pathname.startsWith("/api/") && (await esEquipo()))) {
      // 503 + Retry-After: los buscadores lo leen como una caída temporal y
      // no sacan las páginas del índice.
      const headers = { "Retry-After": "3600", "Cache-Control": "no-store" };
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Tienda en mantenimiento", maintenance: true },
          { status: 503, headers }
        );
      }
      return new NextResponse(paginaMantenimiento(mantenimiento.mensaje), {
        status: 503,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  if (!esProtegida(pathname)) {
    return NextResponse.next();
  }

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
  // Todo menos los estáticos: el mantenimiento tiene que cubrir la tienda
  // entera. Qué rutas exigen sesión lo decide `esProtegida`, no este matcher.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
