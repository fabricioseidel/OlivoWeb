/**
 * Tipos de documento tributario que maneja la gestión documental.
 *
 * Los códigos son los del SII (el mismo número que aparece impreso en el
 * recuadro rojo del documento y en la columna "Tipo Doc" del Registro de
 * Compras y Ventas). `BHE` no es un DTE: es la boleta de honorarios
 * electrónica, que no lleva IVA pero obliga a retener y declarar en el F29.
 */

export type TipoDocumento =
  | "33" // Factura electrónica
  | "34" // Factura no afecta o exenta electrónica
  | "39" // Boleta electrónica
  | "41" // Boleta exenta electrónica
  | "46" // Factura de compra electrónica
  | "48" // Comprobante de pago electrónico (voucher de tarjeta con validez de boleta)
  | "52" // Guía de despacho electrónica
  | "56" // Nota de débito electrónica
  | "61" // Nota de crédito electrónica
  | "BHE"; // Boleta de honorarios electrónica

export type Direccion = "emitido" | "recibido";

export const TIPOS_DOCUMENTO: Record<TipoDocumento, { nombre: string; corto: string }> = {
  "33": { nombre: "Factura electrónica", corto: "Factura" },
  "34": { nombre: "Factura exenta electrónica", corto: "Factura exenta" },
  "39": { nombre: "Boleta electrónica", corto: "Boleta" },
  "41": { nombre: "Boleta exenta electrónica", corto: "Boleta exenta" },
  "46": { nombre: "Factura de compra electrónica", corto: "Factura de compra" },
  "48": { nombre: "Comprobante de pago electrónico (voucher)", corto: "Voucher" },
  "52": { nombre: "Guía de despacho electrónica", corto: "Guía de despacho" },
  "56": { nombre: "Nota de débito electrónica", corto: "Nota de débito" },
  "61": { nombre: "Nota de crédito electrónica", corto: "Nota de crédito" },
  BHE: { nombre: "Boleta de honorarios electrónica", corto: "Honorarios" },
};

export const CODIGOS_DOCUMENTO = Object.keys(TIPOS_DOCUMENTO) as TipoDocumento[];

export function esTipoDocumento(valor: unknown): valor is TipoDocumento {
  return typeof valor === "string" && valor in TIPOS_DOCUMENTO;
}

/** Tipos que se pueden emitir desde el panel. El resto sólo se registra. */
export const TIPOS_EMITIBLES: TipoDocumento[] = ["39", "41", "33", "34", "61", "56"];

/** Documentos cuyo total ya trae el IVA incluido y no desglosan el neto. */
export const TIPOS_CON_IVA_INCLUIDO: TipoDocumento[] = ["39", "48"];

/**
 * Cómo afecta cada tipo a la suma del mes.
 *
 * La nota de crédito resta del lado donde está (ventas o compras); la de
 * débito suma. La guía de despacho no es un documento de venta: traslada
 * mercadería, no genera IVA, y sumarla contaría dos veces la factura que
 * viene después.
 */
export function signoTributario(tipo: TipoDocumento): 1 | -1 | 0 {
  if (tipo === "61") return -1;
  if (tipo === "52") return 0;
  return 1;
}

/** Estados que dejan fuera a un documento de los totales del mes. */
export const ESTADOS_EXCLUIDOS = ["borrador", "anulado", "error", "reclamado"] as const;

export type EstadoDocumento =
  | "borrador" // preparado en el panel, todavía sin folio del SII
  | "emitido" // emitido y con folio
  | "anulado" // anulado con nota de crédito
  | "error" // el proveedor de facturación lo rechazó
  | "pendiente" // recibido, falta revisarlo
  | "aceptado" // recibido y revisado: vale como crédito
  | "reclamado"; // recibido y reclamado ante el SII: no vale como crédito

export const ESTADOS_EMITIDO: EstadoDocumento[] = ["borrador", "emitido", "anulado", "error"];
export const ESTADOS_RECIBIDO: EstadoDocumento[] = ["pendiente", "aceptado", "reclamado"];
