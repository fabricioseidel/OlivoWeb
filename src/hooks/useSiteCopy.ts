"use client";

import { useCallback } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { resolveCopy } from "@/lib/site-copy";

/**
 * Devuelve `t(clave)`, que resuelve un texto del sitio con el override que el
 * admin haya guardado o, si no hay, el valor por defecto del código.
 *
 * Se apoya en useStoreSettings, que ya cachea la configuración a nivel de
 * módulo, así que usarlo en varios componentes no dispara fetches extra.
 */
export function useSiteCopy() {
  const { settings, loading } = useStoreSettings();

  const t = useCallback(
    (key: string) => resolveCopy(settings?.siteCopy, key),
    [settings?.siteCopy]
  );

  return { t, loading };
}
