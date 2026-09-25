"use server";

import { applyReception, type StockItem } from "@/server/inventory.service";

export type ReceptionItem = StockItem;

export interface CreateReceptionInput {
  items: ReceptionItem[];
  branchId?: string | null;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Registra una recepción de inventario.
 *
 * Delega en `inventory.service`, que es el único lugar que mueve stock. Acá
 * solo queda la forma del input que usa la UI de recepción.
 */
export async function createReception({
  items,
  branchId,
  reference,
  notes,
}: CreateReceptionInput): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!items?.length) return { ok: false, error: "No hay ítems para recibir" };

  return applyReception(items, {
    branchId,
    reference,
    reason: notes ?? undefined,
  });
}
