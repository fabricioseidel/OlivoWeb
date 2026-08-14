"use client";

import { useEffect, useState } from "react";
import { getProviders } from "next-auth/react";

/**
 * Indica si el acceso con Google está realmente disponible.
 *
 * Antes las pantallas decidían con `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, pero el
 * servidor solo habilita el proveedor cuando existen GOOGLE_CLIENT_ID *y*
 * GOOGLE_CLIENT_SECRET. Con la variable pública puesta y el secreto ausente, el
 * botón aparecía y el inicio de sesión fallaba.
 *
 * `getProviders()` devuelve los proveedores que NextAuth tiene configurados de
 * verdad, así que la pantalla y el servidor no pueden discrepar.
 */
export function useGoogleAuthAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProviders()
      .then((providers) => {
        if (!cancelled) setAvailable(Boolean(providers?.google));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
