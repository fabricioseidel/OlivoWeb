/**
 * Totales de un documento que se va a emitir, a partir de sus líneas.
 *
 * La diferencia que importa: en una BOLETA el precio de cada línea ya trae el
 * IVA (es lo que el cliente paga y lo que dice el precio en la góndola); en
 * una FACTURA el precio es neto y el IVA se agrega abajo. Las notas de
 * crédito y débito siguen al documento que corrigen.
 */

import { TASA_IVA } from "@/lib/pricing";
import type { TipoDocumento } from "./tipos";
import { desglosarBruto } from "./libro";

export type LineaEmision = {
  descripcion: string;
  cantidad: number;
  precio: number;
  exento?: boolean;
};

export type Totales = { neto: number; exento: number; iva: number; total: number };

/** ¿Los precios de las líneas de este documento traen el IVA incluido? */
export function preciosConIva(tipo: TipoDocumento, tipoReferencia?: TipoDocumento | null): boolean {
  if (tipo === "39" || tipo === "41") return true;
  if ((tipo === "61" || tipo === "56") && tipoReferencia) return tipoReferencia === "39" || tipoReferencia === "41";
  return false;
}

/** Documentos que no llevan IVA en ninguna línea. */
export function esDocumentoExento(tipo: TipoDocumento): boolean {
  return tipo === "34" || tipo === "41";
}

export function calcularTotales(
  tipo: TipoDocumento,
  lineas: LineaEmision[],
  opciones: { tipoReferencia?: TipoDocumento | null; tasa?: number } = {},
): Totales {
  const tasa = opciones.tasa ?? TASA_IVA;
  const todoExento = esDocumentoExento(tipo);
  let afecto = 0;
  let exento = 0;
  for (const l of lineas) {
    const monto = Math.round(l.cantidad * l.precio);
    if (todoExento || l.exento) exento += monto;
    else afecto += monto;
  }

  if (preciosConIva(tipo, opciones.tipoReferencia)) {
    const { neto, iva } = desglosarBruto(afecto, tasa);
    return { neto, exento, iva, total: afecto + exento };
  }
  const iva = Math.round((afecto * tasa) / 100);
  return { neto: afecto, exento, iva, total: afecto + exento + iva };
}

/** Qué le falta al documento para poder emitirse. Lista vacía = listo. */
export function faltantesParaEmitir(d: {
  tipo: TipoDocumento;
  lineas: LineaEmision[];
  receptorRut?: string | null;
  receptorNombre?: string | null;
  receptorGiro?: string | null;
  receptorDireccion?: string | null;
  referenciaId?: string | null;
}): string[] {
  const faltan: string[] = [];
  if (!d.lineas.length) faltan.push("al menos una línea");
  if (d.lineas.some((l) => !l.descripcion.trim())) faltan.push("la descripción de cada línea");
  if (d.lineas.some((l) => !(l.cantidad > 0))) faltan.push("una cantidad mayor que cero en cada línea");
  if (d.lineas.some((l) => !(l.precio >= 0))) faltan.push("un precio válido en cada línea");
  const esFactura = d.tipo === "33" || d.tipo === "34";
  if (esFactura) {
    if (!d.receptorRut) faltan.push("el RUT del cliente");
    if (!d.receptorNombre) faltan.push("la razón social del cliente");
    if (!d.receptorGiro) faltan.push("el giro del cliente");
    if (!d.receptorDireccion) faltan.push("la dirección del cliente");
  }
  if ((d.tipo === "61" || d.tipo === "56") && !d.referenciaId) faltan.push("el documento que se corrige");
  return faltan;
}
