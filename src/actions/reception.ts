"use server";

import { createReception, type CreateReceptionInput } from "@/server/reception.service";
import { exigirRol, PERSONAL } from "@/lib/action-auth";

export async function createReceptionAction(input: CreateReceptionInput) {
  const acceso = await exigirRol(PERSONAL);
  if (!acceso.ok) return { ok: false as const, error: acceso.mensaje };
  return createReception(input);
}
