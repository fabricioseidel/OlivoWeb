/**
 * Registro de textos editables del sitio.
 *
 * El constructor de bloques ya permite editar la portada, pero el resto de los
 * textos visibles (carrito vacío, resumen de compra, confirmación, ayuda)
 * estaban escritos a mano en cada componente. Corregir una palabra obligaba a
 * tocar código y desplegar.
 *
 * Aquí cada texto tiene una clave estable y un valor por defecto. El admin
 * puede sobrescribir cualquiera desde Configuración → Textos del sitio; si no
 * hay override, se usa el default, así que la página nunca queda en blanco por
 * una clave sin configurar.
 */

export type CopyKey = keyof typeof SITE_COPY_DEFAULTS;

/** Overrides guardados por el admin: { clave: texto }. */
export type SiteCopy = Partial<Record<string, string>>;

export const SITE_COPY_DEFAULTS = {
  // ── Carrito ──
  'cart.empty.title': 'Tu carrito está vacío',
  'cart.empty.body': 'Cuando agregues productos, aparecerán aquí para que completes tu compra.',
  'cart.empty.cta': 'Ver productos',
  'cart.checkoutCta': 'Continuar al pago',
  'cart.shippingNote': 'El envío y los descuentos se calculan en el siguiente paso.',
  'cart.supportCta': '¿Dudas? Escríbenos por WhatsApp',

  // ── Confirmación de pedido ──
  'confirm.paid.title': '¡Listo! Tu pedido está confirmado',
  'confirm.pending.title': 'Tu pago aún no se acredita',
  'confirm.failed.title': 'No pudimos procesar tu pago',
  'confirm.retryCta': 'Reintentar el pago',
  'confirm.supportTitle': '¿Necesitas ayuda con tu pedido?',
  'confirm.supportBody': 'Te respondemos por WhatsApp en horario de tienda.',

  // ── Checkout ──
  'checkout.paymentTitle': 'Método de pago',
  'checkout.securityNote': 'Pago procesado por MercadoPago. No almacenamos los datos de tu tarjeta.',

  // ── Catálogo ──
  'catalog.empty.title': 'No encontramos productos',
  'catalog.empty.body': 'Prueba con otra búsqueda o revisa las categorías.',
  'catalog.outOfStock': 'Sin stock',

  // ── Portada ──
  // El título, el subtítulo y la descripción del encabezado se editan en
  // "Textos de la portada" (el constructor de bloques), porque son parte del
  // bloque `hero`. Este es el único texto de la portada que estaba escrito a
  // mano en el componente y no se podía tocar sin desplegar.
  'home.shipping.title': 'También somos punto de envíos en Ñuñoa',
} as const;

/** Grupos para la UI del admin, para no mostrar una lista plana de 20 campos. */
export const COPY_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  keys: string[];
}> = [
  {
    id: 'cart',
    label: 'Carrito',
    description: 'Textos de la página del carrito de compras.',
    keys: [
      'cart.empty.title',
      'cart.empty.body',
      'cart.empty.cta',
      'cart.checkoutCta',
      'cart.shippingNote',
      'cart.supportCta',
    ],
  },
  {
    id: 'confirm',
    label: 'Confirmación de pedido',
    description: 'Lo que ve el cliente después de pagar.',
    keys: [
      'confirm.paid.title',
      'confirm.pending.title',
      'confirm.failed.title',
      'confirm.retryCta',
      'confirm.supportTitle',
      'confirm.supportBody',
    ],
  },
  {
    id: 'checkout',
    label: 'Pago',
    description: 'Textos del formulario de pago.',
    keys: ['checkout.paymentTitle', 'checkout.securityNote'],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    description: 'Mensajes del listado de productos.',
    keys: ['catalog.empty.title', 'catalog.empty.body', 'catalog.outOfStock'],
  },
  {
    id: 'home',
    label: 'Portada',
    description:
      'El título y la descripción del encabezado se editan en "Textos de la portada". Acá va lo que no es parte de ese bloque. La dirección, el horario, el teléfono y los nombres de los couriers no se editan en ningún lado a propósito: salen de src/lib/seo/business.ts, que es la fuente única del NAP, y cambiarlos sólo en la web los haría diverger de Google Business Profile.',
    keys: ['home.shipping.title'],
  },
];

/**
 * Resuelve un texto: override del admin si existe y no está vacío, si no el
 * default. Un override en blanco se ignora a propósito, para que borrar el
 * campo en el admin restaure el texto original en vez de dejar un hueco.
 */
export function resolveCopy(copy: SiteCopy | undefined | null, key: string): string {
  const override = copy?.[key];
  if (typeof override === 'string' && override.trim() !== '') return override;
  return (SITE_COPY_DEFAULTS as Record<string, string>)[key] ?? '';
}
