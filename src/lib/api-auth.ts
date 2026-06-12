import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/config/auth.config";

export type ApiAuthResult =
  | { ok: true; session: Session; userId: string; role: "ADMIN" | "SELLER" | "USER" }
  | { ok: false; response: NextResponse };

const unauth = (status: 401 | 403, msg: string) =>
  NextResponse.json({ error: msg }, { status });

function normalizeRole(session: Session): "ADMIN" | "SELLER" | "USER" {
  const raw = (session.user?.role || "USER").toString().toUpperCase();
  return raw === "ADMIN" || raw === "SELLER" ? raw : "USER";
}

/**
 * Auth helper para /api/admin/**.
 *
 * Uso típico:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const auth = await requireApiAdmin();
 *   if (!auth.ok) return auth.response;
 *   // ... auth.session disponible
 * }
 * ```
 *
 * Equivalente a `requireAdmin()` de `src/lib/auth.ts` pero devuelve una
 * NextResponse en vez de lanzar excepción, lo que evita 500 ruidosos en
 * endpoints que tienen su propio try/catch.
 */
export async function requireApiAdmin(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, response: unauth(401, "Unauthorized") };
  const role = normalizeRole(session);
  if (role !== "ADMIN") return { ok: false, response: unauth(403, "Forbidden — admin only") };
  return { ok: true, session, userId: session.user.id ?? "", role };
}

/** Permite ADMIN o SELLER (vendedor de mostrador). */
export async function requireApiAdminOrSeller(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, response: unauth(401, "Unauthorized") };
  const role = normalizeRole(session);
  if (role !== "ADMIN" && role !== "SELLER") {
    return { ok: false, response: unauth(403, "Forbidden — staff only") };
  }
  return { ok: true, session, userId: session.user.id ?? "", role };
}

/** Cualquier sesión autenticada. */
export async function requireApiAuth(): Promise<ApiAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, response: unauth(401, "Unauthorized") };
  return { ok: true, session, userId: session.user.id ?? "", role: normalizeRole(session) };
}

/**
 * Bloquea endpoints sensibles en producción. Devuelve null si la request
 * puede continuar, o una NextResponse 404 si está deshabilitado.
 */
export function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
