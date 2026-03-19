"use server";

import { revalidatePath } from "next/cache";
import { openShift as dbOpenShift, closeShift as dbCloseShift, getCurrentShift as dbGetCurrentShift, addCashMovement as dbAddCashMovement } from "@/server/shifts.service";
import type { ToastType } from "@/components/ui/Toast";

const PATHS_TO_REVALIDATE = ["/admin/caja", "/admin/pos", "/admin/ventas"];

type ShiftActionState = {
  message?: string | null;
  ok?: boolean;
  toastMessage?: string;
  toastType?: ToastType;
};

function revalidateAll() {
  PATHS_TO_REVALIDATE.forEach(p => revalidatePath(p));
}

export async function openShiftAction(startingCash: number, userId?: string, notes?: string): Promise<ShiftActionState> {
  try {
    console.log("📦 openShiftAction:", { startingCash, userId });
    await dbOpenShift({ starting_cash: startingCash, user_id: userId, notes });
    revalidateAll();
    return { ok: true, toastMessage: "Turno abierto correctamente", toastType: "success" };
  } catch (error: any) {
    console.error("🔥 openShiftAction CRASH:", error);
    return { ok: false, toastMessage: error?.message || "Error al abrir turno", toastType: "error" };
  }
}

export async function closeShiftAction(shiftId: string, actualCash: number, notes?: string): Promise<ShiftActionState> {
  try {
    console.log("📦 closeShiftAction:", { shiftId, actualCash });
    await dbCloseShift(shiftId, actualCash, notes);
    revalidateAll();
    return { ok: true, toastMessage: "Caja cerrada correctamente", toastType: "success" };
  } catch (error: any) {
    console.error("🔥 closeShiftAction CRASH:", error);
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
