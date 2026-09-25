/**
 * Emisión de documentos tributarios electrónicos (DTE) a través de un
 * proveedor de facturación.
 *
 * Emitir una boleta o factura con validez exige firmarla con el certificado
 * digital del representante legal, timbrarla con folios autorizados por el
 * SII (CAF) y enviarla al SII. Eso lo hace un proveedor certificado
 * (OpenFactura, LibreDTE, SimpleAPI, Bsale…) o el portal gratuito del SII a
 * mano. Este módulo es el punto donde se enchufa ese proveedor.
 *
 * Mientras no haya uno configurado, `proveedorDte()` devuelve null y el panel
 * sólo prepara BORRADORES: sin folio, sin timbre, rotulados como tales. El
 * folio lo pone el SII (o el proveedor), nunca el sistema: un número
 * inventado en un documento que parece boleta es exactamente lo que no se
 * puede entregar a un cliente.
 *
 * // TODO-HUMANO: elegir proveedor de facturación electrónica, contratarlo y
 * entregar sus credenciales. Con eso se implementa aquí su adaptador y se
 * carga `DTE_PROVIDER` en Vercel. Ver docs/GESTION_DOCUMENTAL.md.
 */

import type { TipoDocumento } from "@/lib/documentos/tipos";

export type ItemDte = {
  descripcion: string;
  cantidad: number;
  /** Precio unitario: neto en facturas, con IVA en boletas. */
  precio: number;
  exento?: boolean;
};

export type SolicitudDte = {
  tipo: TipoDocumento;
  fecha: string;
  receptor: {
    rut: string | null;
    nombre: string | null;
    giro: string | null;
    direccion: string | null;
    email: string | null;
  };
  items: ItemDte[];
  /** Documento que corrige una nota de crédito o débito. */
  referencia?: { tipo: TipoDocumento; folio: number; fecha: string; razon: string };
};

export type ResultadoDte = {
  folio: number;
  trackId: string | null;
  pdfUrl: string | null;
};

export interface ProveedorDte {
  nombre: string;
  emitir(solicitud: SolicitudDte): Promise<ResultadoDte>;
}

/** Proveedores con adaptador implementado. Vacío hasta que se elija uno. */
const PROVEEDORES: Record<string, () => ProveedorDte> = {};

export function proveedorDte(): ProveedorDte | null {
  const nombre = process.env.DTE_PROVIDER?.trim().toLowerCase();
  if (!nombre) return null;
  const crear = PROVEEDORES[nombre];
  return crear ? crear() : null;
}
