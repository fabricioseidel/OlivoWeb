/**
 * Los cuatro canales por los que sale un pedido a proveedor.
 *
 * Viven separados del servicio porque los necesita también el navegador, y el
 * servicio arrastra el cliente de Supabase.
 */
export const CANALES = ["whatsapp", "online", "presencial", "telefono"] as const;

export type Canal = (typeof CANALES)[number];

export const ETIQUETA_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  online: "Compra online",
  presencial: "En persona",
  telefono: "Teléfono",
};

export const esCanal = (valor: unknown): valor is Canal =>
  typeof valor === "string" && (CANALES as readonly string[]).includes(valor);
