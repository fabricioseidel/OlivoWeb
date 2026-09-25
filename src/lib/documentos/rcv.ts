/**
 * Lectura del Registro de Compras y Ventas (RCV) que descarga el SII.
 *
 * Desde el Registro de Compras y Ventas de sii.cl ("Descargar detalles") se
 * baja cada mes, de compras o de ventas, un CSV separado por punto y coma.
 * Es la fuente más completa que existe: trae TODAS las facturas que los
 * proveedores emitieron a nombre de la empresa, se hayan entregado en papel o
 * no. Importarlo es la forma de "revisar todas las facturas" sin tipearlas.
 *
 * Las columnas se buscan por nombre y no por posición: el SII ha agregado
 * columnas nuevas otras veces y lo seguirá haciendo. Una fila con problemas se
 * reporta y se salta; nunca aborta el archivo entero.
 */

import { esTipoDocumento, type TipoDocumento } from "./tipos";
import { normalizarRut } from "./rut";

export type FilaRcv = {
  tipo: TipoDocumento;
  folio: string;
  /** RUT de la contraparte: proveedor en compras, cliente en ventas. */
  rut: string | null;
  razonSocial: string;
  fecha: string; // YYYY-MM-DD
  exento: number;
  neto: number;
  iva: number;
  otrosImpuestos: number;
  total: number;
};

export type ResultadoRcv = {
  filas: FilaRcv[];
  errores: { linea: number; motivo: string }[];
};

/** "Monto IVA Recuperable" → "montoivarecuperable". */
function clave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Monto del CSV a pesos enteros. El SII los entrega sin separador de miles,
 * pero un archivo abierto y guardado en Excel vuelve con "119.000" o
 * "119.000,00": se aceptan las tres formas.
 */
export function leerMonto(texto: string | undefined): number | null {
  if (texto == null) return 0;
  let t = texto.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (t === "") return 0;
  const negativo = t.startsWith("-");
  t = t.replace(/^-/, "");
  // Coma = decimales al estilo chileno; los puntos son miles.
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const valor = Math.round(Number(t));
  return negativo ? -valor : valor;
}

/** "25/09/2026" o "2026-09-25" → "2026-09-25". */
export function leerFecha(texto: string | undefined): string | null {
  const t = (texto ?? "").trim();
  let m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** Nombres (ya pasados por `clave`) con que el SII titula cada dato, en orden de preferencia. */
const COLUMNAS = {
  tipo: ["tipodoc", "tipodocumento", "tipodte"],
  folio: ["folio"],
  rut: ["rutproveedor", "rutcliente", "rutreceptor", "rutemisor", "rut"],
  razonSocial: ["razonsocial", "nombre"],
  fecha: ["fechadocto", "fechadocumento", "fechaemision", "fecha"],
  exento: ["montoexento", "exento"],
  neto: ["montoneto", "neto"],
  iva: ["montoivarecuperable", "montoiva", "iva"],
  otroImpuesto: ["valorotroimpuesto", "valorotroimp"],
  total: ["montototal", "total"],
};

function indiceDe(encabezado: string[], nombres: string[]): number {
  for (const n of nombres) {
    const i = encabezado.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

export function parsearRcv(contenido: string): ResultadoRcv {
  const lineas = contenido.replace(/^﻿/, "").split(/\r?\n/);
  const errores: ResultadoRcv["errores"] = [];
  const filas: FilaRcv[] = [];

  const inicio = lineas.findIndex((l) => l.trim() !== "");
  if (inicio < 0) return { filas, errores: [{ linea: 0, motivo: "El archivo está vacío." }] };

  const encabezado = lineas[inicio].split(";").map(clave);
  const idx = Object.fromEntries(
    Object.entries(COLUMNAS).map(([k, nombres]) => [k, indiceDe(encabezado, nombres)]),
  ) as Record<keyof typeof COLUMNAS, number>;

  const faltan = (["tipo", "folio", "fecha", "total"] as const).filter((k) => idx[k] < 0);
  if (faltan.length) {
    return {
      filas,
      errores: [{
        linea: inicio + 1,
        motivo: `No parece un Registro de Compras y Ventas del SII: faltan las columnas ${faltan.join(", ")}.`,
      }],
    };
  }

  for (let n = inicio + 1; n < lineas.length; n++) {
    const linea = lineas[n];
    if (linea.replace(/[;\s]/g, "") === "") continue;
    const c = linea.split(";");
    const numeroLinea = n + 1;

    const tipo = (c[idx.tipo] ?? "").trim();
    if (!esTipoDocumento(tipo)) {
      errores.push({ linea: numeroLinea, motivo: `Tipo de documento "${tipo}" no reconocido.` });
      continue;
    }
    const folio = (c[idx.folio] ?? "").trim().replace(/^0+(?=\d)/, "");
    if (!/^\d+$/.test(folio)) {
      errores.push({ linea: numeroLinea, motivo: `Folio "${folio}" no es un número.` });
      continue;
    }
    const fecha = leerFecha(c[idx.fecha]);
    if (!fecha) {
      errores.push({ linea: numeroLinea, motivo: `Fecha "${c[idx.fecha] ?? ""}" no se entiende.` });
      continue;
    }
    const montos = {
      exento: idx.exento >= 0 ? leerMonto(c[idx.exento]) : 0,
      neto: idx.neto >= 0 ? leerMonto(c[idx.neto]) : 0,
      iva: idx.iva >= 0 ? leerMonto(c[idx.iva]) : 0,
      otrosImpuestos: idx.otroImpuesto >= 0 ? leerMonto(c[idx.otroImpuesto]) : 0,
      total: leerMonto(c[idx.total]),
    };
    const malo = Object.entries(montos).find(([, v]) => v === null);
    if (malo) {
      errores.push({ linea: numeroLinea, motivo: `El monto de "${malo[0]}" no es un número.` });
      continue;
    }

    filas.push({
      tipo,
      folio,
      rut: idx.rut >= 0 ? normalizarRut(c[idx.rut]) : null,
      razonSocial: idx.razonSocial >= 0 ? (c[idx.razonSocial] ?? "").trim() : "",
      fecha,
      exento: montos.exento!,
      neto: montos.neto!,
      iva: montos.iva!,
      otrosImpuestos: montos.otrosImpuestos!,
      total: montos.total!,
    });
  }

  return { filas, errores };
}
