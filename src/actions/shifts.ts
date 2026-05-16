"use server";

import { revalidatePath } from "next/cache";
import {
  openShift as dbOpenShift,
  closeShift as dbCloseShift,
  getCurrentShift as dbGetCurrentShift,
  addCashMovement as dbAddCashMovement,
  type ShiftPaymentMethod,
} from "@/server/shifts.service";
import type { ToastType } from "@/components/ui/Toast";

const PATHS_TO_REVALIDATE = ["/admin/caja", "/admin/pos", "/admin/ventas", "/admin/operaciones"];

type ShiftActionState = {
  message?: string | null;
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};

function revalidateAll() {
  PATHS_TO_REVALIDATE.forEach(p => revalidatePath(p));
}

export async function openShiftAction(
  startingCash: number,
  userId?: string,
  notes?: string,
  branchId?: string | null,
  autoCloseAt?: string | null
): Promise<ShiftActionState> {
  try {
    await dbOpenShift({
      starting_cash: startingCash,
      user_id: userId,
      branch_id: branchId ?? null,
      notes,
      auto_close_at: autoCloseAt ?? null,
    });
    revalidateAll();
    return { ok: true, toastMessage: "Turno abierto correctamente", toastType: "success" };
  } catch (error: any) {
    console.error("openShiftAction CRASH:", error);
    return { ok: false, toastMessage: error?.message || "Error al abrir turno", toastType: "error" };
  }
}

/**
 * Cierra un turno aceptando conteos por método de pago.
 * - Si recibe número: cuadre solo de CASH (compat con la UI antigua).
 * - Si recibe objeto: cuadre por método (CASH, DEBIT, CREDIT, TRANSFER, …).
 */
export async function closeShiftAction(
  shiftId: string,
  counts: Partial<Record<ShiftPaymentMethod, number>> | number,
  notes?: string
): Promise<ShiftActionState & { breakdown?: Record<string, { expected: number; actual: number; difference: number }> }> {
  try {
    const closed = await dbCloseShift(shiftId, counts, notes);
    revalidateAll();
    return {
      ok: true,
      toastMessage: "Caja cerrada correctamente",
      toastType: "success",
      breakdown: closed.breakdown,
    };
  } catch (error: any) {
    console.error("closeShiftAction CRASH:", error);
    return { ok: false, toastMessage: error?.message || "Error al cerrar caja", toastType: "error" };
  }
}

export async function addCashMovementAction(shiftId: string, amount: number, type: 'IN' | 'OUT', reason: string): Promise<ShiftActionState> {
  try {
    console.log("📦 addCashMovementAction:", { shiftId, amount, type, reason });
    await dbAddCashMovement({ shift_id: shiftId, amount, type, reason });
    revalidateAll();
    return { ok: true, toastMessage: "Movimiento registrado", toastType: "success" };
  } catch (error: any) {
    console.error("🔥 addCashMovementAction CRASH:", error);
    return { ok: false, toastMessage: error?.message || "Error al registrar movimiento", toastType: "error" };
  }
}

export async function getCurrentShift() {
  return await dbGetCurrentShift();
}
