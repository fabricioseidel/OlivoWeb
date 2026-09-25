import { NextResponse } from "next/server";
import type { z } from "zod";
import { ErrorDocumentos } from "@/server/documentos.service";
import { mensajeValidacion } from "@/lib/documentos/esquemas";

/** Respuesta para cualquier error de las rutas de gestión documental. */
export function responderError(error: unknown, contexto: string) {
  if (error instanceof ErrorDocumentos) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }
  console.error(`documentos/${contexto}:`, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Error inesperado" },
    { status: 500 },
  );
}

export function responderValidacion(error: z.ZodError) {
  return NextResponse.json({ error: mensajeValidacion(error) }, { status: 400 });
}

/** El nombre de quien hace el cambio, para la auditoría. */
export function actorDe(session: { user?: { email?: string | null; name?: string | null } }): string | null {
  return session.user?.email ?? session.user?.name ?? null;
}
