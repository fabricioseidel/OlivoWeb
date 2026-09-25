"use client";

import { useCallback, useEffect, useState } from "react";

type ShiftState = {
  open: boolean | null; // null = aún cargando
  shiftId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * Estado del turno de caja. El POS lo usa para bloquear la venta cuando no hay
 * caja abierta; el servidor valida lo mismo al registrar (esto es sólo la UI).
 */
export function useOpenShift(): ShiftState {
  const [open, setOpen] = useState<boolean | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/caja/estado", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setOpen(Boolean(data.open));
      setShiftId(data.shiftId ?? null);
    } catch {
      // Ante un fallo de red no se desbloquea la venta: el servidor rechaza
      // igual si no hay caja, y así el mensaje al usuario es coherente.
      setOpen(false);
      setShiftId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { open, shiftId, loading, refresh };
}
