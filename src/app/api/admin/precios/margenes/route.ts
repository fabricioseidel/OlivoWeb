import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import {
  guardarMargenCategoria,
  borrarMargenCategoria,
} from "@/server/pricing.service";
import type { ModoRedondeo } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const MODOS: ModoRedondeo[] = ["ninguno", "decena", "terminacion90", "centena"];

/**
 * Márgenes objetivo por categoría.
 *
 * No hay GET: las reglas viajan dentro de la foto de precios (`/api/admin/precios`),
 * que es la única pantalla que las usa. Un segundo endpoint que devuelva lo
 * mismo sólo sirve para que las dos respuestas se contradigan algún día.
 */
export async function PUT(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  let body: { categoria?: unknown; margen?: unknown; redondeo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const categoria = typeof body.categoria === "string" ? body.categoria : "";
  const redondeo = MODOS.includes(body.redondeo as ModoRedondeo)
    ? (body.redondeo as ModoRedondeo)
    : "decena";

  const resultado = await guardarMargenCategoria(
    categoria,
    Number(body.margen),
    redondeo,
    auth.userId
  );

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const categoria = new URL(req.url).searchParams.get("categoria") ?? "";
  if (!categoria) {
    return NextResponse.json({ error: "Falta la categoría" }, { status: 400 });
  }

  const resultado = await borrarMargenCategoria(categoria);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
