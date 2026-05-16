"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ReceptionItem {
  barcode: string;
  qty: number;
  name?: string;
}

export interface CreateReceptionInput {
  items: ReceptionItem[];
  branchId?: string | null;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Registra una recepción de inventario: incrementa branch_stock y deja un
 * inventory_movements (type='IN') por cada ítem. Reemplaza el path antiguo
 * de Compra Rápida que solo actualizaba products.stock.
 */
export async function createReception({
  items,
  branchId,
  reference,
  notes,
}: CreateReceptionInput): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!items?.length) return { ok: false, error: "No hay ítems para recibir" };

  const payload = items
    .filter((i) => i.barcode && i.qty > 0)
    .map((i) => ({ barcode: i.barcode, qty: i.qty, name: i.name ?? null }));

  if (payload.length === 0) return { ok: false, error: "Ningún ítem válido" };

  const { data, error } = await supabaseAdmin.rpc("apply_reception", {
    p_items: payload,
    p_branch_id: branchId ?? null,
    p_reference: reference ?? null,
    p_notes: notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, count: (data as number) ?? 0 };
}
