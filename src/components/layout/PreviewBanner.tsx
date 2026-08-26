"use client";

import { useStoreSettings } from "@/hooks/useStoreSettings";
import {
  PREVIEW_DEFAULT_MESSAGE,
  PREVIEW_DEFAULT_TITLE,
} from "@/lib/store-status";

/**
 * Aviso de que la tienda todavía no vende.
 *
 * No aparece hasta que la configuración llegó: mostrarlo mientras carga haría
 * que una tienda ya abierta parpadeara "no aceptamos pedidos" en cada visita.
 * Quien decide de verdad es el servidor —las rutas de pedido responden 503 en
 * vitrina—; esto solo evita que alguien llene el carrito sin saberlo.
 */
export default function PreviewBanner() {
  const { settings, loading } = useStoreSettings();

  if (loading || !settings?.previewMode) return null;

  const mensaje = settings.previewMessage?.trim() || PREVIEW_DEFAULT_MESSAGE;

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center"
    >
      <p className="mx-auto max-w-3xl text-sm leading-relaxed text-amber-900">
        <span className="font-semibold">{PREVIEW_DEFAULT_TITLE}.</span>{" "}
        {mensaje}
      </p>
    </div>
  );
}
