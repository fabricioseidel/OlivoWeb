/**
 * Libro mensual: de los documentos del mes a lo que se paga en el F29.
 *
 *   IVA débito  = IVA de lo vendido (facturas, boletas, vouchers, notas de débito)
 *                 menos el de las notas de crédito emitidas
 *   IVA crédito = IVA de las facturas de compra aceptadas, más notas de débito,
 *                 menos notas de crédito recibidas
 *   IVA a pagar = débito − crédito − remanente del mes anterior (nunca negativo;
 *                 si da negativo, lo que sobra pasa como remanente al mes siguiente)
 *   PPM         = tasa × ventas netas del mes (neto + exento)
 *   Retenciones = honorarios retenidos + IVA retenido en facturas de compra
 *                 + impuesto único de los trabajadores
 *   Total F29   = IVA a pagar + PPM + retenciones
 *
 * Todo en pesos enteros. Se suma primero y se redondea al final, como hace el
 * SII con los totales del registro.
 *
 * Simplificaciones conscientes, que el contador ve en el F29 real:
 * - El remanente se reajusta por UTM de un mes a otro; aquí se arrastra
 *   nominal. La diferencia es de pocos pesos al mes.
 * - No se modela el IVA de uso común ni el proporcional por ventas exentas.
 */

import {
  ESTADOS_EXCLUIDOS,
  TIPOS_CON_IVA_INCLUIDO,
  signoTributario,
  type Direccion,
  type TipoDocumento,
} from "./tipos";
import { TASA_IVA } from "@/lib/pricing";

export type DocumentoLibro = {
  direccion: Direccion;
  tipo: TipoDocumento;
  estado: string;
  neto: number;
  exento: number;
  iva: number;
  otrosImpuestos?: number;
  total: number;
  /** Retención de honorarios o IVA retenido (factura de compra). */
  retencion?: number;
};

export type Lado = {
  documentos: number;
  neto: number;
  exento: number;
  iva: number;
  total: number;
};

export type ResumenMensual = {
  ventas: Lado;
  compras: Lado;
  ivaDebito: number;
  ivaCredito: number;
  remanenteAnterior: number;
  /** Débito − crédito − remanente. Negativo = queda remanente. */
  ivaDeterminado: number;
  ivaAPagar: number;
  remanenteSiguiente: number;
  baseAfectaPpm: number;
  tasaPpm: number;
  ppm: number;
  retenciones: number;
  totalF29: number;
};

const vacio = (): Lado => ({ documentos: 0, neto: 0, exento: 0, iva: 0, total: 0 });

/** Separa el IVA de un monto que lo trae incluido. `11900` → neto 10000, IVA 1900. */
export function desglosarBruto(total: number, tasa: number = TASA_IVA): { neto: number; iva: number } {
  const neto = Math.round(total / (1 + tasa / 100));
  return { neto, iva: total - neto };
}

/** Neto + IVA a partir del neto. `10000` → IVA 1900, total 11900. */
export function calcularDesdeNeto(neto: number, exento = 0, tasa: number = TASA_IVA) {
  const iva = Math.round((neto * tasa) / 100);
  return { neto, exento, iva, total: neto + exento + iva };
}

/**
 * Montos de un documento listos para sumar. Una boleta o un voucher sólo
 * traen el total: si no viene el neto, se desglosa.
 */
export function montosDocumento(d: DocumentoLibro): { neto: number; exento: number; iva: number; total: number } {
  if (TIPOS_CON_IVA_INCLUIDO.includes(d.tipo) && !d.neto && !d.iva && d.total) {
    const afecto = d.total - (d.exento || 0);
    const { neto, iva } = desglosarBruto(afecto);
    return { neto, exento: d.exento || 0, iva, total: d.total };
  }
  return { neto: d.neto || 0, exento: d.exento || 0, iva: d.iva || 0, total: d.total || 0 };
}

export function cuentaEnElMes(d: DocumentoLibro): boolean {
  return !(ESTADOS_EXCLUIDOS as readonly string[]).includes(d.estado) && signoTributario(d.tipo) !== 0;
}

/** Total con IVA de lo vendido con documento (sin notas de crédito ni débito). */
export function totalVentasDocumentadas(documentos: DocumentoLibro[]): number {
  return documentos
    .filter((d) => d.direccion === "emitido" && cuentaEnElMes(d) && ["33", "34", "39", "41", "48"].includes(d.tipo))
    .reduce((s, d) => s + montosDocumento(d).total, 0);
}

export type OpcionesResumen = {
  remanenteAnterior?: number;
  /** % sobre las ventas netas del mes. */
  tasaPpm?: number;
  /** Impuesto único retenido a trabajadores, que también va en el F29. */
  retencionImpuestoUnico?: number;
  /**
   * Ventas con IVA que el sistema registró y que no tienen documento cargado
   * (típicamente, las pagadas con tarjeta: el voucher es la boleta y no pasa
   * por el panel). Se suman como si fueran boletas, para que el F29 estimado
   * no quede corto.
   */
  ventasSinDocumento?: number;
};

export function resumirMes(documentos: DocumentoLibro[], opciones: OpcionesResumen = {}): ResumenMensual {
  const sinDocumento = Math.max(0, Math.round(opciones.ventasSinDocumento ?? 0));
  if (sinDocumento > 0) {
    documentos = [
      ...documentos,
      { direccion: "emitido", tipo: "48", estado: "emitido", neto: 0, exento: 0, iva: 0, total: sinDocumento },
    ];
  }
  const ventas = vacio();
  const compras = vacio();
  let retenciones = 0;
  let ivaRetenidoCompras = 0;

  for (const d of documentos) {
    if (!cuentaEnElMes(d)) continue;
    const signo = signoTributario(d.tipo);
    const m = montosDocumento(d);

    if (d.tipo === "BHE") {
      // La boleta de honorarios no tiene IVA: lo que importa es la retención.
      retenciones += d.retencion ?? 0;
      continue;
    }

    if (d.tipo === "46") {
      // La factura de compra la emite quien compra y retiene el IVA completo:
      // ese IVA se declara como retención y a la vez es crédito.
      compras.documentos += 1;
      compras.neto += m.neto;
      compras.exento += m.exento;
      compras.iva += m.iva;
      compras.total += m.total;
      ivaRetenidoCompras += d.retencion ?? m.iva;
      continue;
    }

    const lado = d.direccion === "emitido" ? ventas : compras;
    lado.documentos += 1;
    lado.neto += signo * m.neto;
    lado.exento += signo * m.exento;
    lado.iva += signo * m.iva;
    lado.total += signo * m.total;
  }

  const remanenteAnterior = Math.max(0, Math.round(opciones.remanenteAnterior ?? 0));
  const tasaPpm = opciones.tasaPpm ?? 0;
  const ivaDebito = Math.round(ventas.iva);
  const ivaCredito = Math.round(compras.iva);
  const ivaDeterminado = ivaDebito - ivaCredito - remanenteAnterior;
  const ivaAPagar = Math.max(0, ivaDeterminado);
  const remanenteSiguiente = Math.max(0, -ivaDeterminado);
  const baseAfectaPpm = Math.max(0, Math.round(ventas.neto + ventas.exento));
  const ppm = Math.round((baseAfectaPpm * tasaPpm) / 100);
  retenciones = Math.round(retenciones + ivaRetenidoCompras + Math.max(0, opciones.retencionImpuestoUnico ?? 0));

  return {
    ventas,
    compras,
    ivaDebito,
    ivaCredito,
    remanenteAnterior,
    ivaDeterminado,
    ivaAPagar,
    remanenteSiguiente,
    baseAfectaPpm,
    tasaPpm,
    ppm,
    retenciones,
    totalF29: ivaAPagar + ppm + retenciones,
  };
}

/**
 * IVA débito que corresponde a lo que el sistema registró como vendido (POS y
 * web), para cuando las boletas del mes no están cargadas una por una: los
 * vouchers de tarjeta valen como boleta y no pasan por el panel.
 */
export function ivaDeVentasBrutas(ventasBrutas: number, tasa: number = TASA_IVA): number {
  return desglosarBruto(Math.round(ventasBrutas), tasa).iva;
}
