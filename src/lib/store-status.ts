/**
 * Estado comercial de la tienda: si acepta pedidos o solo se puede mirar.
 *
 * Se separa a propósito del "modo mantenimiento". Son cosas distintas:
 *
 * - **Vitrina** (`previewMode`): el sitio está arriba y se navega completo
 *   —catálogo, fichas, búsqueda, landings—, pero no se puede pagar. Es para
 *   mostrar la tienda antes de abrirla de verdad.
 * - **Mantenimiento**: el sitio entero no está disponible.
 *
 * La regla se aplica EN EL SERVIDOR, no escondiendo botones. Un botón oculto
 * no impide que alguien llame la ruta de crear pedido a mano, y si eso pasa
 * en modo vitrina se genera un cobro real por un pedido que nadie va a
 * preparar. La interfaz avisa; el servidor es el que decide.
 */

/** Mensaje por defecto cuando no se configuró uno propio. */
export const PREVIEW_DEFAULT_MESSAGE =
  "Estamos terminando los últimos detalles. Puedes mirar todo el catálogo, " +
  "pero todavía no aceptamos pedidos por la web.";

/** Título corto para el aviso, para no repetir el mensaje largo. */
export const PREVIEW_DEFAULT_TITLE = "Muy pronto abrimos";

/**
 * Respuesta de las rutas que crean pedidos o cobran mientras la tienda está
 * en vitrina. Es 503 y no 403: no es un problema de permisos del cliente,
 * es que el servicio todavía no está disponible.
 */
export const PREVIEW_HTTP_STATUS = 503;

export type StoreStatus = {
  /** true = se puede mirar pero no comprar. */
  previewMode: boolean;
  /** Texto que se le muestra al cliente. */
  previewMessage: string;
};

/** El estado con el que se sirve la tienda si no se pudo leer la configuración. */
export const STORE_STATUS_FALLBACK: StoreStatus = {
  // Cerrado ante la duda: dejar pasar un pedido que nadie va a preparar es
  // peor que rechazar uno. Cuando la tienda ya está abierta esto tampoco
  // cambia nada, porque sin base de datos el pedido no se podría guardar.
  previewMode: true,
  previewMessage: PREVIEW_DEFAULT_MESSAGE,
};

/** Normaliza lo que venga de la configuración a un estado utilizable. */
export function toStoreStatus(input: {
  previewMode?: boolean | null;
  previewMessage?: string | null;
}): StoreStatus {
  return {
    previewMode: input.previewMode !== false,
    previewMessage: input.previewMessage?.trim() || PREVIEW_DEFAULT_MESSAGE,
  };
}
