/**
 * Gestión documental: documentos tributarios, libro mensual, obligaciones
 * (F29, Previred) y trabajadores.
 *
 * Todo pasa por `supabaseServer` (service_role): las tablas tienen RLS sin
 * políticas para anon/authenticated, y las rutas que llaman a este servicio
 * exigen rol ADMIN.
 */

import { supabaseServer } from "@/lib/supabase-server";
import { auditLog } from "@/server/audit.service";
import { normalizarRut } from "@/lib/documentos/rut";
import { parsearRcv } from "@/lib/documentos/rcv";
import {
  ESTADOS_EMITIDO,
  ESTADOS_RECIBIDO,
  type Direccion,
  type EstadoDocumento,
  type TipoDocumento,
} from "@/lib/documentos/tipos";
import {
  resumirMes,
  totalVentasDocumentadas,
  type DocumentoLibro,
  type ResumenMensual,
} from "@/lib/documentos/libro";
import {
  diasEntre,
  fechaCorta,
  hoyEnChile,
  limitesPeriodo,
  nombrePeriodo,
  obligacionesEntre,
  periodoDeFecha,
  periodoSiguiente,
  sumarDias,
  textoPlazo,
  type Obligacion,
  type Periodo,
  type TipoObligacion,
} from "@/lib/documentos/vencimientos";
import { calcularTotales, faltantesParaEmitir, type LineaEmision } from "@/lib/documentos/emision";
import { proveedorDte } from "@/server/dte";
import {
  estimarImposiciones,
  tasasConDefecto,
  type TasasPrevisionales,
  type TipoContrato,
} from "@/lib/documentos/imposiciones";

export const BUCKET_DOCUMENTOS = "documentos-tributarios";

/** Días que tiene la empresa para reclamar una factura recibida (Ley 19.983). */
export const DIAS_PARA_RECLAMAR = 8;

// ─── Tipos de fila ──────────────────────────────────────────────────────

export type DocumentoRow = {
  id: string;
  direccion: Direccion;
  tipo: TipoDocumento;
  folio: number | null;
  fecha: string;
  periodo: Periodo;
  contraparte_rut: string | null;
  contraparte_nombre: string | null;
  contraparte_giro: string | null;
  contraparte_direccion: string | null;
  contraparte_email: string | null;
  neto: number;
  exento: number;
  iva: number;
  otros_impuestos: number;
  retencion: number;
  total: number;
  estado: EstadoDocumento;
  estado_pago: "pendiente" | "pagado" | "no_aplica";
  vence_pago: string | null;
  pagado_el: string | null;
  supplier_id: string | null;
  supplier_order_id: string | null;
  referencia_id: string | null;
  items: unknown;
  origen: "manual" | "rcv" | "proveedor_dte";
  proveedor_dte: string | null;
  proveedor_track_id: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  notas: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodoRow = {
  periodo: Periodo;
  tasa_ppm: number | null;
  remanente_anterior: number | null;
  retencion_impuesto_unico: number;
  resumen: ResumenMensual | null;
  cerrado_at: string | null;
  cerrado_por: string | null;
  notas: string | null;
};

export type ObligacionRow = {
  id: string;
  tipo: TipoObligacion;
  periodo: Periodo;
  vence_el: string;
  monto_estimado: number | null;
  monto_pagado: number | null;
  pagado_el: string | null;
  comprobante_path: string | null;
  comprobante_nombre: string | null;
  notas: string | null;
};

export type EmpleadoRow = {
  id: string;
  nombre: string;
  rut: string | null;
  cargo: string | null;
  tipo_contrato: TipoContrato;
  sueldo_imponible: number;
  afp: string | null;
  comision_afp: number | null;
  salud: "fonasa" | "isapre";
  adicional_salud: number;
  fecha_ingreso: string | null;
  activo: boolean;
  notas: string | null;
};

export type ConfiguracionTributaria = {
  tasa_ppm: number;
  tasas_previsionales: TasasPrevisionales;
};

/** Error con status HTTP, para que la ruta responda 4xx en vez de 500. */
export class ErrorDocumentos extends Error {
  constructor(message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message);
  }
}

function fallar(error: { message: string; code?: string } | null, contexto: string): void {
  if (!error) return;
  if (error.code === "23505") throw new ErrorDocumentos("Ese documento ya está registrado.", 409);
  if (error.code === "23514" && /período .* está cerrado/.test(error.message)) {
    throw new ErrorDocumentos(error.message, 409);
  }
  throw new Error(`${contexto}: ${error.message}`);
}

const aNumero = (v: unknown) => (v == null ? 0 : Number(v));

function filaDocumento(r: Record<string, unknown>): DocumentoRow {
  const d = r as unknown as DocumentoRow;
  return {
    ...d,
    folio: d.folio == null ? null : Number(d.folio),
    neto: aNumero(d.neto),
    exento: aNumero(d.exento),
    iva: aNumero(d.iva),
    otros_impuestos: aNumero(d.otros_impuestos),
    retencion: aNumero(d.retencion),
    total: aNumero(d.total),
  };
}

function aLibro(d: DocumentoRow): DocumentoLibro {
  return {
    direccion: d.direccion,
    tipo: d.tipo,
    estado: d.estado,
    neto: d.neto,
    exento: d.exento,
    iva: d.iva,
    otrosImpuestos: d.otros_impuestos,
    total: d.total,
    retencion: d.retencion,
  };
}

// ─── Documentos ─────────────────────────────────────────────────────────

export async function listarDocumentos(filtro: {
  periodo?: Periodo;
  direccion?: Direccion;
  estado?: string;
  supplierId?: string;
}): Promise<DocumentoRow[]> {
  let q = supabaseServer
    .from("tax_documents")
    .select("*")
    .order("fecha", { ascending: false })
    .order("folio", { ascending: false })
    .limit(2000);
  if (filtro.periodo) q = q.eq("periodo", filtro.periodo);
  if (filtro.direccion) q = q.eq("direccion", filtro.direccion);
  if (filtro.estado) q = q.eq("estado", filtro.estado);
  if (filtro.supplierId) q = q.eq("supplier_id", filtro.supplierId);
  const { data, error } = await q;
  fallar(error, "listarDocumentos");
  return (data ?? []).map(filaDocumento);
}

export async function obtenerDocumento(id: string): Promise<DocumentoRow | null> {
  const { data, error } = await supabaseServer.from("tax_documents").select("*").eq("id", id).maybeSingle();
  fallar(error, "obtenerDocumento");
  return data ? filaDocumento(data) : null;
}

export type NuevoDocumento = {
  direccion: Direccion;
  tipo: TipoDocumento;
  folio?: number | null;
  fecha: string;
  periodo?: Periodo | null;
  contraparte_rut?: string | null;
  contraparte_nombre?: string | null;
  contraparte_giro?: string | null;
  contraparte_direccion?: string | null;
  contraparte_email?: string | null;
  neto?: number;
  exento?: number;
  iva?: number;
  otros_impuestos?: number;
  retencion?: number;
  total: number;
  estado?: EstadoDocumento;
  estado_pago?: "pendiente" | "pagado" | "no_aplica";
  vence_pago?: string | null;
  pagado_el?: string | null;
  supplier_id?: string | null;
  supplier_order_id?: string | null;
  referencia_id?: string | null;
  items?: unknown;
  origen?: "manual" | "rcv" | "proveedor_dte";
  notas?: string | null;
};

/** Busca un documento igual ya registrado (mismo tipo, folio y emisor). */
export async function buscarDuplicado(d: {
  direccion: Direccion;
  tipo: TipoDocumento;
  folio?: number | null;
  contraparte_rut?: string | null;
}): Promise<DocumentoRow | null> {
  if (!d.folio) return null;
  let q = supabaseServer
    .from("tax_documents")
    .select("*")
    .eq("direccion", d.direccion)
    .eq("tipo", d.tipo)
    .eq("folio", d.folio);
  if (d.direccion === "recibido") {
    const rut = normalizarRut(d.contraparte_rut);
    if (!rut) return null;
    q = q.eq("contraparte_rut", rut);
  }
  const { data, error } = await q.limit(1).maybeSingle();
  fallar(error, "buscarDuplicado");
  return data ? filaDocumento(data) : null;
}

/** Proveedor cuyo RUT coincide, para enlazar la factura sin elegirlo a mano. */
async function proveedorPorRut(rut: string | null): Promise<string | null> {
  if (!rut) return null;
  const { data } = await supabaseServer.from("suppliers").select("id, rut").not("rut", "is", null);
  const hit = (data ?? []).find((s) => normalizarRut(s.rut as string) === rut);
  return (hit?.id as string) ?? null;
}

function prepararFila(input: NuevoDocumento, actor: string | null) {
  const estado =
    input.estado ?? (input.direccion === "recibido" ? "pendiente" : input.folio ? "emitido" : "borrador");
  const permitidos = input.direccion === "emitido" ? ESTADOS_EMITIDO : ESTADOS_RECIBIDO;
  if (!permitidos.includes(estado)) {
    throw new ErrorDocumentos(`Estado "${estado}" no corresponde a un documento ${input.direccion}.`);
  }
  if (estado === "emitido" && !input.folio) {
    throw new ErrorDocumentos("Un documento emitido necesita el folio que le asignó el SII.");
  }
  return {
    direccion: input.direccion,
    tipo: input.tipo,
    folio: input.folio ?? null,
    fecha: input.fecha,
    periodo: input.periodo ?? periodoDeFecha(input.fecha),
    contraparte_rut: normalizarRut(input.contraparte_rut),
    contraparte_nombre: input.contraparte_nombre?.trim() || null,
    contraparte_giro: input.contraparte_giro?.trim() || null,
    contraparte_direccion: input.contraparte_direccion?.trim() || null,
    contraparte_email: input.contraparte_email?.trim() || null,
    neto: Math.round(input.neto ?? 0),
    exento: Math.round(input.exento ?? 0),
    iva: Math.round(input.iva ?? 0),
    otros_impuestos: Math.round(input.otros_impuestos ?? 0),
    retencion: Math.round(input.retencion ?? 0),
    total: Math.round(input.total),
    estado,
    estado_pago: input.estado_pago ?? (input.direccion === "recibido" ? "pendiente" : "no_aplica"),
    vence_pago: input.vence_pago ?? null,
    pagado_el: input.estado_pago === "pagado" ? input.pagado_el ?? input.fecha : null,
    supplier_id: input.supplier_id ?? null,
    supplier_order_id: input.supplier_order_id ?? null,
    referencia_id: input.referencia_id ?? null,
    items: input.items ?? null,
    origen: input.origen ?? "manual",
    notas: input.notas?.trim() || null,
    creado_por: actor,
  };
}

export async function crearDocumento(input: NuevoDocumento, actor: string | null): Promise<DocumentoRow> {
  const fila = prepararFila(input, actor);
  const duplicado = await buscarDuplicado(fila);
  if (duplicado) {
    throw new ErrorDocumentos("Ese documento ya está registrado.", 409, { duplicado });
  }
  if (fila.direccion === "recibido" && !fila.supplier_id) {
    fila.supplier_id = await proveedorPorRut(fila.contraparte_rut);
  }
  const { data, error } = await supabaseServer.from("tax_documents").insert(fila).select("*").single();
  fallar(error, "crearDocumento");
  const doc = filaDocumento(data!);
  await auditLog({
    action: "tax_document.create",
    entity: "tax_documents",
    entityId: doc.id,
    actor,
    details: { direccion: doc.direccion, tipo: doc.tipo, folio: doc.folio, total: doc.total },
  });
  return doc;
}

const CAMPOS_EDITABLES = [
  "tipo", "folio", "fecha", "periodo", "contraparte_rut", "contraparte_nombre", "contraparte_giro",
  "contraparte_direccion", "contraparte_email", "neto", "exento", "iva", "otros_impuestos", "retencion",
  "total", "estado", "estado_pago", "vence_pago", "pagado_el", "supplier_id", "supplier_order_id",
  "referencia_id", "notas",
] as const;

export async function actualizarDocumento(
  id: string,
  cambios: Partial<Record<(typeof CAMPOS_EDITABLES)[number], unknown>>,
  actor: string | null,
): Promise<DocumentoRow> {
  const actual = await obtenerDocumento(id);
  if (!actual) throw new ErrorDocumentos("Documento no encontrado.", 404);

  const patch: Record<string, unknown> = {};
  for (const k of CAMPOS_EDITABLES) if (k in cambios) patch[k] = cambios[k];
  if ("contraparte_rut" in patch) patch.contraparte_rut = normalizarRut(patch.contraparte_rut as string);
  if ("estado" in patch) {
    const permitidos = actual.direccion === "emitido" ? ESTADOS_EMITIDO : ESTADOS_RECIBIDO;
    if (!permitidos.includes(patch.estado as EstadoDocumento)) {
      throw new ErrorDocumentos(`Estado "${patch.estado}" no corresponde a un documento ${actual.direccion}.`);
    }
  }
  if (patch.estado_pago === "pagado" && !patch.pagado_el && !actual.pagado_el) {
    patch.pagado_el = hoyEnChile();
  }
  if (patch.estado_pago === "pendiente") patch.pagado_el = null;

  const { data, error } = await supabaseServer.from("tax_documents").update(patch).eq("id", id).select("*").single();
  fallar(error, "actualizarDocumento");
  await auditLog({
    action: "tax_document.update",
    entity: "tax_documents",
    entityId: id,
    actor,
    details: { cambios: patch },
  });
  return filaDocumento(data!);
}

export async function eliminarDocumento(id: string, actor: string | null): Promise<void> {
  const actual = await obtenerDocumento(id);
  if (!actual) throw new ErrorDocumentos("Documento no encontrado.", 404);
  if (actual.direccion === "emitido" && actual.estado === "emitido") {
    throw new ErrorDocumentos(
      "Un documento emitido no se borra: se anula con una nota de crédito. Si fue un error de registro, márcalo como anulado.",
      409,
    );
  }
  const { error } = await supabaseServer.from("tax_documents").delete().eq("id", id);
  fallar(error, "eliminarDocumento");
  if (actual.archivo_path) await supabaseServer.storage.from(BUCKET_DOCUMENTOS).remove([actual.archivo_path]);
  await auditLog({
    action: "tax_document.delete",
    entity: "tax_documents",
    entityId: id,
    actor,
    details: { tipo: actual.tipo, folio: actual.folio, total: actual.total, contraparte: actual.contraparte_rut },
  });
}

// ─── Archivos ───────────────────────────────────────────────────────────

const TIPOS_ARCHIVO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/xml": "xml",
  "text/xml": "xml",
};

export const TAMANO_MAXIMO_ARCHIVO = 10 * 1024 * 1024;

export async function guardarArchivo(carpeta: string, archivo: File): Promise<{ path: string; nombre: string }> {
  const ext = TIPOS_ARCHIVO[archivo.type];
  if (!ext) throw new ErrorDocumentos("Sólo se aceptan PDF, fotos (JPG, PNG, WEBP) o XML.");
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO) throw new ErrorDocumentos("El archivo no puede pasar de 10 MB.");
  const path = `${carpeta}/${Date.now()}.${ext}`;
  const { error } = await supabaseServer.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, await archivo.arrayBuffer(), { contentType: archivo.type, upsert: false });
  if (error) throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  return { path, nombre: archivo.name || `documento.${ext}` };
}

export async function adjuntarArchivoDocumento(id: string, archivo: File, actor: string | null): Promise<DocumentoRow> {
  const actual = await obtenerDocumento(id);
  if (!actual) throw new ErrorDocumentos("Documento no encontrado.", 404);
  const { path, nombre } = await guardarArchivo(`documentos/${id}`, archivo);
  const { data, error } = await supabaseServer
    .from("tax_documents")
    .update({ archivo_path: path, archivo_nombre: nombre })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    await supabaseServer.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    fallar(error, "adjuntarArchivoDocumento");
  }
  if (actual.archivo_path) await supabaseServer.storage.from(BUCKET_DOCUMENTOS).remove([actual.archivo_path]);
  await auditLog({ action: "tax_document.file", entity: "tax_documents", entityId: id, actor, details: { nombre } });
  return filaDocumento(data!);
}

/** URL temporal (5 minutos) para ver un archivo del bucket privado. */
export async function urlFirmada(path: string): Promise<string> {
  const { data, error } = await supabaseServer.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error(`No se pudo abrir el archivo: ${error?.message ?? "sin URL"}`);
  return data.signedUrl;
}

// ─── Importación del Registro de Compras y Ventas ───────────────────────

export type ResultadoImportacion = {
  nuevos: number;
  yaRegistrados: number;
  errores: { linea: number; motivo: string }[];
  periodos: Periodo[];
  vistaPrevia: { tipo: TipoDocumento; folio: string; rut: string | null; razonSocial: string; fecha: string; total: number; nuevo: boolean }[];
};

export async function importarRcv(opts: {
  contenido: string;
  direccion: Direccion;
  confirmar: boolean;
  actor: string | null;
}): Promise<ResultadoImportacion> {
  const { filas, errores } = parsearRcv(opts.contenido);
  const periodos = [...new Set(filas.map((f) => periodoDeFecha(f.fecha)))].sort();

  // Lo que ya existe en esos meses, para no duplicar ni pisar lo revisado a mano.
  const existentes = new Set<string>();
  if (periodos.length) {
    const { data, error } = await supabaseServer
      .from("tax_documents")
      .select("tipo, folio, contraparte_rut")
      .eq("direccion", opts.direccion)
      .not("folio", "is", null);
    fallar(error, "importarRcv.existentes");
    for (const d of data ?? []) {
      existentes.add(opts.direccion === "emitido" ? `${d.tipo}|${d.folio}` : `${d.tipo}|${d.contraparte_rut}|${d.folio}`);
    }
  }

  const claveDe = (f: (typeof filas)[number]) =>
    opts.direccion === "emitido" ? `${f.tipo}|${f.folio}` : `${f.tipo}|${f.rut}|${f.folio}`;

  const vistos = new Set<string>();
  const nuevas = filas.filter((f) => {
    const k = claveDe(f);
    if (existentes.has(k) || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  const vistaPrevia = filas.slice(0, 200).map((f) => ({
    tipo: f.tipo,
    folio: f.folio,
    rut: f.rut,
    razonSocial: f.razonSocial,
    fecha: f.fecha,
    total: f.total,
    nuevo: !existentes.has(claveDe(f)),
  }));

  if (opts.confirmar && nuevas.length) {
    const { data: proveedores } = await supabaseServer.from("suppliers").select("id, rut").not("rut", "is", null);
    const porRut = new Map((proveedores ?? []).map((s) => [normalizarRut(s.rut as string), s.id as string]));

    const filasDb = nuevas.map((f) =>
      prepararFila(
        {
          direccion: opts.direccion,
          tipo: f.tipo,
          folio: Number(f.folio),
          fecha: f.fecha,
          contraparte_rut: f.rut,
          contraparte_nombre: f.razonSocial,
          neto: f.neto,
          exento: f.exento,
          iva: f.iva,
          otros_impuestos: f.otrosImpuestos,
          total: f.total,
          // Lo que está en el registro del SII ya existe para el SII: los
          // emitidos entran como emitidos; los recibidos, a revisar.
          estado: opts.direccion === "emitido" ? "emitido" : "pendiente",
          supplier_id: opts.direccion === "recibido" && f.rut ? porRut.get(f.rut) ?? null : null,
          origen: "rcv",
        },
        opts.actor,
      ),
    );
    for (let i = 0; i < filasDb.length; i += 500) {
      const { error } = await supabaseServer.from("tax_documents").insert(filasDb.slice(i, i + 500));
      fallar(error, "importarRcv.insert");
    }
    await auditLog({
      action: "tax_document.import_rcv",
      entity: "tax_documents",
      actor: opts.actor,
      details: { direccion: opts.direccion, nuevos: nuevas.length, periodos },
    });
  }

  return {
    nuevos: nuevas.length,
    yaRegistrados: filas.length - nuevas.length,
    errores,
    periodos,
    vistaPrevia,
  };
}

// ─── Ventas registradas por el sistema ──────────────────────────────────

export type VentasSistema = {
  pos: number;
  web: number;
  total: number;
  /** POS por medio de pago (CASH, CARD, TRANSFER, STAFF_CREDIT…). */
  porMedio: Record<string, number>;
  /** Lo pagado con tarjeta o MercadoPago: el voucher ya vale como boleta. */
  conVoucher: number;
  /** Efectivo, transferencia y fiado: necesitan boleta emitida. */
  requierenBoleta: number;
};

async function paginar<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) return filas;
  }
}

export async function ventasDelSistema(periodo: Periodo): Promise<VentasSistema> {
  const { desde, hasta } = limitesPeriodo(periodo);

  const [ventas, pedidos] = await Promise.all([
    paginar<{ total: number; payment_method: string | null; sale_payments: { method: string; amount: number }[] | null }>(
      (a, b) =>
        supabaseServer
          .from("sales")
          .select("total, payment_method, sale_payments(method, amount)")
          .eq("voided", false)
          .gte("ts", desde)
          .lt("ts", hasta)
          .order("id")
          .range(a, b),
    ),
    paginar<{ total: number }>((a, b) =>
      supabaseServer
        .from("orders")
        .select("total")
        .eq("payment_status", "paid")
        .gte("created_at", desde)
        .lt("created_at", hasta)
        .order("id")
        .range(a, b),
    ),
  ]);

  const porMedio: Record<string, number> = {};
  let pos = 0;
  for (const v of ventas) {
    const total = Number(v.total) || 0;
    pos += total;
    const pagos = v.sale_payments?.length
      ? v.sale_payments
      : [{ method: (v.payment_method ?? "OTHER").toUpperCase(), amount: total }];
    for (const p of pagos) {
      const medio = String(p.method).toUpperCase();
      porMedio[medio] = (porMedio[medio] ?? 0) + (Number(p.amount) || 0);
    }
  }
  const web = pedidos.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const tarjeta = ["CARD", "DEBIT", "CREDIT", "WALLET"].reduce((s, m) => s + (porMedio[m] ?? 0), 0);

  return {
    pos: Math.round(pos),
    web: Math.round(web),
    total: Math.round(pos + web),
    porMedio,
    conVoucher: Math.round(tarjeta + web),
    requierenBoleta: Math.max(0, Math.round(pos - tarjeta)),
  };
}

// ─── Configuración ──────────────────────────────────────────────────────

export async function obtenerConfiguracion(): Promise<ConfiguracionTributaria> {
  const { data, error } = await supabaseServer.from("tax_settings").select("*").eq("id", true).maybeSingle();
  fallar(error, "obtenerConfiguracion");
  return {
    tasa_ppm: data?.tasa_ppm != null ? Number(data.tasa_ppm) : 0.125,
    tasas_previsionales: tasasConDefecto(data?.tasas_previsionales as Partial<TasasPrevisionales> | null),
  };
}

export async function guardarConfiguracion(
  cambios: { tasa_ppm?: number; tasas_previsionales?: Partial<TasasPrevisionales> },
  actor: string | null,
): Promise<ConfiguracionTributaria> {
  const fila: Record<string, unknown> = { id: true };
  if (cambios.tasa_ppm != null) fila.tasa_ppm = cambios.tasa_ppm;
  if (cambios.tasas_previsionales) fila.tasas_previsionales = tasasConDefecto(cambios.tasas_previsionales);
  const { error } = await supabaseServer.from("tax_settings").upsert(fila);
  fallar(error, "guardarConfiguracion");
  await auditLog({ action: "tax_settings.update", entity: "tax_settings", actor, details: fila });
  return obtenerConfiguracion();
}

// ─── Libro mensual ──────────────────────────────────────────────────────

export async function obtenerPeriodo(periodo: Periodo): Promise<PeriodoRow | null> {
  const { data, error } = await supabaseServer.from("tax_periods").select("*").eq("periodo", periodo).maybeSingle();
  fallar(error, "obtenerPeriodo");
  if (!data) return null;
  return {
    ...(data as PeriodoRow),
    tasa_ppm: data.tasa_ppm == null ? null : Number(data.tasa_ppm),
    remanente_anterior: data.remanente_anterior == null ? null : Number(data.remanente_anterior),
    retencion_impuesto_unico: Number(data.retencion_impuesto_unico ?? 0),
  };
}

export type LibroMensual = {
  periodo: Periodo;
  cerrado: boolean;
  cerradoAt: string | null;
  notas: string | null;
  /** Cálculo sólo con los documentos cargados. */
  segunDocumentos: ResumenMensual;
  /** Cálculo sumando las ventas del sistema que no tienen documento. Es el que se usa para planificar. */
  estimado: ResumenMensual;
  ventasSistema: VentasSistema;
  ventasDocumentadas: number;
  ventasSinDocumento: number;
  remanenteOrigen: "manual" | "mes_anterior" | "sin_dato";
  tasaPpmOrigen: "periodo" | "configuracion";
  retencionImpuestoUnico: number;
  documentos: { emitidos: number; recibidos: number; porRevisar: number; borradores: number };
};

export async function libroMensual(periodo: Periodo): Promise<LibroMensual> {
  const anterior = periodoSiguiente(periodo, -1);
  const [docs, fila, filaAnterior, config, ventasSistema] = await Promise.all([
    listarDocumentos({ periodo }),
    obtenerPeriodo(periodo),
    obtenerPeriodo(anterior),
    obtenerConfiguracion(),
    ventasDelSistema(periodo),
  ]);

  let remanenteAnterior = 0;
  let remanenteOrigen: LibroMensual["remanenteOrigen"] = "sin_dato";
  if (fila?.remanente_anterior != null) {
    remanenteAnterior = fila.remanente_anterior;
    remanenteOrigen = "manual";
  } else if (filaAnterior?.cerrado_at && filaAnterior.resumen) {
    remanenteAnterior = Number(filaAnterior.resumen.remanenteSiguiente ?? 0);
    remanenteOrigen = "mes_anterior";
  }
  const tasaPpm = fila?.tasa_ppm ?? config.tasa_ppm;
  const retencionImpuestoUnico = fila?.retencion_impuesto_unico ?? 0;

  const libro = docs.map(aLibro);
  const ventasDocumentadas = totalVentasDocumentadas(libro);
  const ventasSinDocumento = Math.max(0, ventasSistema.total - ventasDocumentadas);
  const opciones = { remanenteAnterior, tasaPpm, retencionImpuestoUnico };

  // Un mes cerrado muestra lo que se declaró, no un recálculo.
  const estimado =
    fila?.cerrado_at && fila.resumen ? fila.resumen : resumirMes(libro, { ...opciones, ventasSinDocumento });

  return {
    periodo,
    cerrado: Boolean(fila?.cerrado_at),
    cerradoAt: fila?.cerrado_at ?? null,
    notas: fila?.notas ?? null,
    segunDocumentos: resumirMes(libro, opciones),
    estimado,
    ventasSistema,
    ventasDocumentadas,
    ventasSinDocumento,
    remanenteOrigen,
    tasaPpmOrigen: fila?.tasa_ppm != null ? "periodo" : "configuracion",
    retencionImpuestoUnico,
    documentos: {
      emitidos: docs.filter((d) => d.direccion === "emitido").length,
      recibidos: docs.filter((d) => d.direccion === "recibido").length,
      porRevisar: docs.filter((d) => d.estado === "pendiente").length,
      borradores: docs.filter((d) => d.estado === "borrador").length,
    },
  };
}

export async function guardarPeriodo(
  periodo: Periodo,
  cambios: { tasa_ppm?: number | null; remanente_anterior?: number | null; retencion_impuesto_unico?: number; notas?: string | null },
  actor: string | null,
): Promise<void> {
  const actual = await obtenerPeriodo(periodo);
  if (actual?.cerrado_at) throw new ErrorDocumentos("El período está cerrado: reábrelo para cambiarlo.", 409);
  const { error } = await supabaseServer.from("tax_periods").upsert({ periodo, ...cambios });
  fallar(error, "guardarPeriodo");
  await auditLog({ action: "tax_period.update", entity: "tax_periods", entityId: periodo, actor, details: cambios });
}

/**
 * Cierra el mes con la foto del cálculo: lo que se declaró en el F29. Desde
 * ahí sus documentos quedan congelados y el remanente pasa al mes siguiente.
 */
export async function cerrarPeriodo(periodo: Periodo, actor: string | null): Promise<void> {
  const libro = await libroMensual(periodo);
  if (libro.cerrado) throw new ErrorDocumentos("El período ya está cerrado.", 409);
  if (libro.documentos.porRevisar > 0) {
    throw new ErrorDocumentos(
      `Quedan ${libro.documentos.porRevisar} facturas recibidas sin revisar en este mes. Acéptalas o reclámalas antes de cerrar.`,
      409,
    );
  }
  const { error } = await supabaseServer.from("tax_periods").upsert({
    periodo,
    resumen: libro.estimado,
    cerrado_at: new Date().toISOString(),
    cerrado_por: actor,
  });
  fallar(error, "cerrarPeriodo");
  await auditLog({
    action: "tax_period.close",
    entity: "tax_periods",
    entityId: periodo,
    actor,
    details: { totalF29: libro.estimado.totalF29, remanenteSiguiente: libro.estimado.remanenteSiguiente },
  });
}

export async function reabrirPeriodo(periodo: Periodo, actor: string | null): Promise<void> {
  const { error } = await supabaseServer
    .from("tax_periods")
    .update({ cerrado_at: null, cerrado_por: null, resumen: null })
    .eq("periodo", periodo);
  fallar(error, "reabrirPeriodo");
  await auditLog({ action: "tax_period.reopen", entity: "tax_periods", entityId: periodo, actor });
}

// ─── Trabajadores ───────────────────────────────────────────────────────

function filaEmpleado(r: Record<string, unknown>): EmpleadoRow {
  const e = r as unknown as EmpleadoRow;
  return {
    ...e,
    sueldo_imponible: aNumero(e.sueldo_imponible),
    adicional_salud: aNumero(e.adicional_salud),
    comision_afp: e.comision_afp == null ? null : Number(e.comision_afp),
  };
}

export async function listarEmpleados(): Promise<EmpleadoRow[]> {
  const { data, error } = await supabaseServer
    .from("employees")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  fallar(error, "listarEmpleados");
  return (data ?? []).map(filaEmpleado);
}

export type DatosEmpleado = Partial<Omit<EmpleadoRow, "id">> & { nombre?: string };

export async function guardarEmpleado(id: string | null, datos: DatosEmpleado, actor: string | null): Promise<EmpleadoRow> {
  const fila: Record<string, unknown> = { ...datos };
  if ("rut" in fila) fila.rut = normalizarRut(fila.rut as string);
  const consulta = id
    ? supabaseServer.from("employees").update(fila).eq("id", id)
    : supabaseServer.from("employees").insert(fila);
  const { data, error } = await consulta.select("*").single();
  if (error?.code === "23505") throw new ErrorDocumentos("Ya hay un trabajador con ese RUT.", 409);
  fallar(error, "guardarEmpleado");
  // Sin montos en la auditoría: los sueldos no tienen por qué quedar en un log.
  await auditLog({ action: id ? "employee.update" : "employee.create", entity: "employees", entityId: data!.id as string, actor });
  return filaEmpleado(data!);
}

export async function eliminarEmpleado(id: string, actor: string | null): Promise<void> {
  const { error } = await supabaseServer.from("employees").delete().eq("id", id);
  fallar(error, "eliminarEmpleado");
  await auditLog({ action: "employee.delete", entity: "employees", entityId: id, actor });
}

// ─── Obligaciones y panel ───────────────────────────────────────────────

export async function listarObligacionesGuardadas(periodos: Periodo[]): Promise<ObligacionRow[]> {
  if (!periodos.length) return [];
  const { data, error } = await supabaseServer.from("tax_obligations").select("*").in("periodo", periodos);
  fallar(error, "listarObligacionesGuardadas");
  return (data ?? []).map((o) => ({
    ...(o as ObligacionRow),
    monto_estimado: o.monto_estimado == null ? null : Number(o.monto_estimado),
    monto_pagado: o.monto_pagado == null ? null : Number(o.monto_pagado),
  }));
}

export async function registrarPagoObligacion(
  datos: {
    tipo: TipoObligacion;
    periodo: Periodo;
    vence_el: string;
    monto_estimado?: number | null;
    monto_pagado?: number | null;
    pagado_el?: string | null;
    notas?: string | null;
  },
  archivo: File | null,
  actor: string | null,
): Promise<ObligacionRow> {
  const fila: Record<string, unknown> = { ...datos };
  if (archivo) {
    const { path, nombre } = await guardarArchivo(`obligaciones/${datos.tipo}-${datos.periodo}`, archivo);
    fila.comprobante_path = path;
    fila.comprobante_nombre = nombre;
  }
  const { data, error } = await supabaseServer
    .from("tax_obligations")
    .upsert(fila, { onConflict: "tipo,periodo" })
    .select("*")
    .single();
  fallar(error, "registrarPagoObligacion");
  await auditLog({
    action: "tax_obligation.payment",
    entity: "tax_obligations",
    entityId: `${datos.tipo}:${datos.periodo}`,
    actor,
    details: { monto_pagado: datos.monto_pagado, pagado_el: datos.pagado_el },
  });
  return data as ObligacionRow;
}

export async function obtenerObligacion(tipo: TipoObligacion, periodo: Periodo): Promise<ObligacionRow | null> {
  const { data, error } = await supabaseServer
    .from("tax_obligations")
    .select("*")
    .eq("tipo", tipo)
    .eq("periodo", periodo)
    .maybeSingle();
  fallar(error, "obtenerObligacion");
  return (data as ObligacionRow) ?? null;
}

export type ObligacionConEstado = Obligacion & {
  montoEstimado: number | null;
  /** De dónde sale la estimación, en palabras. */
  origenEstimacion: string | null;
  montoPagado: number | null;
  pagadoEl: string | null;
  tieneComprobante: boolean;
  notas: string | null;
};

/**
 * Calendario con montos: vencimientos entre `desde` y `hasta`, cada uno con
 * cuánto se estima pagar y si ya se pagó.
 */
export async function calendario(desde: string, hasta: string): Promise<ObligacionConEstado[]> {
  // Se mira también un poco hacia atrás: un pago vencido y sin marcar no
  // desaparece del calendario al día siguiente de vencer.
  const lista = obligacionesEntre(sumarDias(desde, -15), hasta);
  const periodos = [...new Set(lista.map((o) => o.periodo))];
  const [guardadas, empleados, config] = await Promise.all([
    listarObligacionesGuardadas(periodos),
    listarEmpleados(),
    obtenerConfiguracion(),
  ]);
  const porClave = new Map(guardadas.map((g) => [`${g.tipo}|${g.periodo}`, g]));

  const activos = empleados.filter((e) => e.activo);
  const previred = estimarImposiciones(
    activos.map((e) => ({
      nombre: e.nombre,
      sueldoImponible: e.sueldo_imponible,
      tipoContrato: e.tipo_contrato,
      afp: e.afp,
      comisionAfp: e.comision_afp,
      adicionalSalud: e.adicional_salud,
    })),
    config.tasas_previsionales,
  );

  const periodosF29 = [...new Set(lista.filter((o) => o.tipo === "F29").map((o) => o.periodo))];
  const librosF29 = new Map<Periodo, LibroMensual>(
    await Promise.all(periodosF29.map(async (p) => [p, await libroMensual(p)] as const)),
  );

  return lista
    .map((o) => {
      const g = porClave.get(`${o.tipo}|${o.periodo}`);
      let montoEstimado: number | null = g?.monto_estimado ?? null;
      let origenEstimacion: string | null = g?.monto_estimado != null ? "Monto anotado a mano" : null;
      if (montoEstimado == null && o.tipo === "F29") {
        const libro = librosF29.get(o.periodo)!;
        montoEstimado = libro.estimado.totalF29;
        origenEstimacion = libro.cerrado
          ? "Lo declarado al cerrar el mes"
          : libro.ventasSinDocumento > 0
            ? "Documentos cargados + ventas del sistema sin documento"
            : "Documentos cargados";
      }
      if (montoEstimado == null && o.tipo === "PREVIRED" && activos.length) {
        montoEstimado = previred.totalPrevired;
        origenEstimacion = `Estimación con ${activos.length} trabajador${activos.length === 1 ? "" : "es"}`;
      }
      return {
        ...o,
        vence: g?.vence_el ?? o.vence,
        montoEstimado,
        origenEstimacion,
        montoPagado: g?.monto_pagado ?? null,
        pagadoEl: g?.pagado_el ?? null,
        tieneComprobante: Boolean(g?.comprobante_path),
        notas: g?.notas ?? null,
      };
    })
    .filter((o) => o.vence >= desde || !o.pagadoEl);
}

export type Alerta = { nivel: "rojo" | "ambar" | "info"; titulo: string; detalle: string; tab?: string };

export async function panel(hoy: string) {
  const periodoActual = periodoDeFecha(hoy);
  const periodoAnterior = periodoSiguiente(periodoActual, -1);

  const [proximas, libroActual, libroAnterior, pendientesRes, porPagarRes, borradoresRes] = await Promise.all([
    calendario(hoy, sumarDias(hoy, 75)),
    libroMensual(periodoActual),
    libroMensual(periodoAnterior),
    supabaseServer
      .from("tax_documents")
      .select("id, tipo, folio, fecha, created_at, contraparte_nombre, total")
      .eq("direccion", "recibido")
      .eq("estado", "pendiente")
      .order("fecha"),
    supabaseServer
      .from("tax_documents")
      .select("id, total, vence_pago")
      .eq("direccion", "recibido")
      .eq("estado_pago", "pendiente")
      .neq("estado", "reclamado"),
    supabaseServer.from("tax_documents").select("id", { count: "exact", head: true }).eq("estado", "borrador"),
  ]);
  fallar(pendientesRes.error, "panel.pendientes");
  fallar(porPagarRes.error, "panel.porPagar");

  const pendientes = pendientesRes.data ?? [];
  const porPagar = porPagarRes.data ?? [];
  const vencidasPago = porPagar.filter((d) => d.vence_pago && d.vence_pago < hoy);

  // El plazo de 8 días corre desde que la factura llega al SII; sin ese dato
  // se cuenta desde la fecha del documento, que es igual o anterior.
  const porVencerReclamo = pendientes.filter((d) => {
    const dias = diasEntre(String(d.fecha), hoy);
    return dias >= DIAS_PARA_RECLAMAR - 3 && dias <= DIAS_PARA_RECLAMAR;
  });

  const alertas: Alerta[] = [];
  for (const o of proximas) {
    if (o.pagadoEl) continue;
    const dias = diasEntre(hoy, o.vence);
    if (dias < 0) {
      alertas.push({
        nivel: "rojo",
        titulo: `${o.titulo} de ${nombrePeriodo(o.periodo)}: venció`,
        detalle: `Venció el ${fechaCorta(o.vence)}. Si ya lo pagaste, márcalo como pagado; si no, págalo cuanto antes: los intereses y multas corren por día.`,
        tab: "calendario",
      });
    } else if (dias <= 5) {
      alertas.push({
        nivel: "ambar",
        titulo: `${o.titulo}: ${textoPlazo(hoy, o.vence)}`,
        detalle: o.pagarAntesDel
          ? `Vence el ${fechaCorta(o.vence)}, que no es día hábil: págalo a más tardar el ${fechaCorta(o.pagarAntesDel)}.`
          : `${o.detalle} Vence el ${fechaCorta(o.vence)}.`,
        tab: "calendario",
      });
    }
  }
  if (porVencerReclamo.length) {
    alertas.push({
      nivel: "ambar",
      titulo: `${porVencerReclamo.length} factura${porVencerReclamo.length === 1 ? "" : "s"} por quedar aceptada${porVencerReclamo.length === 1 ? "" : "s"} sola${porVencerReclamo.length === 1 ? "" : "s"}`,
      detalle: `Pasados ${DIAS_PARA_RECLAMAR} días desde que llega al SII, una factura queda aceptada aunque no la hayas revisado. Si alguna viene mal, reclámala en el SII.`,
      tab: "recibidas",
    });
  }
  if (libroAnterior.documentos.porRevisar > 0 && !libroAnterior.cerrado) {
    alertas.push({
      nivel: "ambar",
      titulo: `Facturas de ${nombrePeriodo(periodoAnterior)} sin revisar`,
      detalle: `Hay ${libroAnterior.documentos.porRevisar}. El F29 de ese mes se declara el 20: revísalas antes para que el crédito cuadre.`,
      tab: "recibidas",
    });
  }
  if (libroActual.ventasSistema.requierenBoleta > 0 && libroActual.documentos.emitidos === 0) {
    alertas.push({
      nivel: "info",
      titulo: "Ventas en efectivo o transferencia sin boletas cargadas",
      detalle: "Las ventas con tarjeta y MercadoPago tienen voucher, que vale como boleta. Las de efectivo y transferencia necesitan boleta emitida: cárgalas o impórtalas del Registro de Ventas del SII.",
      tab: "emitidos",
    });
  }
  if ((borradoresRes.count ?? 0) > 0) {
    alertas.push({
      nivel: "info",
      titulo: `${borradoresRes.count} borrador${borradoresRes.count === 1 ? "" : "es"} sin folio`,
      detalle: "Un borrador no es un documento válido. Emítelo en el SII y anota el folio, o bórralo si ya no va.",
      tab: "emitidos",
    });
  }
  if (vencidasPago.length) {
    alertas.push({
      nivel: "ambar",
      titulo: `${vencidasPago.length} factura${vencidasPago.length === 1 ? "" : "s"} de proveedor con pago vencido`,
      detalle: "Revisa la pestaña de facturas recibidas, filtro «por pagar».",
      tab: "recibidas",
    });
  }

  return {
    hoy,
    periodoActual,
    periodoAnterior,
    proximas,
    libroActual,
    libroAnterior,
    pendientesRevision: pendientes.length,
    porPagar: { cantidad: porPagar.length, total: porPagar.reduce((s, d) => s + Number(d.total), 0), vencidas: vencidasPago.length },
    alertas,
  };
}

// ─── Emisión ────────────────────────────────────────────────────────────

export type SolicitudEmision = {
  tipo: TipoDocumento;
  fecha: string;
  receptor: { rut?: string | null; nombre?: string | null; giro?: string | null; direccion?: string | null; email?: string | null };
  lineas: LineaEmision[];
  referencia_id?: string | null;
  razon_referencia?: string | null;
  notas?: string | null;
};

export type ResultadoEmision = {
  documento: DocumentoRow;
  /** true si salió con folio por el proveedor de facturación. */
  emitido: boolean;
  mensaje: string;
};

/**
 * Prepara el documento y, si hay proveedor de facturación configurado, lo
 * emite. Sin proveedor queda como BORRADOR: sirve para tener los datos
 * listos y copiarlos al portal del SII; cuando el SII entrega el folio, se
 * anota y pasa a emitido.
 */
export async function emitirDocumento(s: SolicitudEmision, actor: string | null): Promise<ResultadoEmision> {
  const referencia = s.referencia_id ? await obtenerDocumento(s.referencia_id) : null;
  if (s.referencia_id && !referencia) throw new ErrorDocumentos("No se encontró el documento que se corrige.", 404);
  if (referencia && (referencia.direccion !== "emitido" || !referencia.folio)) {
    throw new ErrorDocumentos("Sólo se puede corregir un documento emitido que ya tenga folio.");
  }

  const faltan = faltantesParaEmitir({
    tipo: s.tipo,
    lineas: s.lineas,
    receptorRut: s.receptor.rut,
    receptorNombre: s.receptor.nombre,
    receptorGiro: s.receptor.giro,
    receptorDireccion: s.receptor.direccion,
    referenciaId: s.referencia_id,
  });
  if (faltan.length) throw new ErrorDocumentos(`Para emitir falta: ${faltan.join(", ")}.`);

  const totales = calcularTotales(s.tipo, s.lineas, { tipoReferencia: referencia?.tipo });
  const borrador = await crearDocumento(
    {
      direccion: "emitido",
      tipo: s.tipo,
      fecha: s.fecha,
      contraparte_rut: s.receptor.rut,
      contraparte_nombre: s.receptor.nombre,
      contraparte_giro: s.receptor.giro,
      contraparte_direccion: s.receptor.direccion,
      contraparte_email: s.receptor.email,
      ...totales,
      estado: "borrador",
      referencia_id: referencia?.id ?? null,
      items: { lineas: s.lineas, razonReferencia: s.razon_referencia ?? null },
      notas: s.notas,
    },
    actor,
  );

  const proveedor = proveedorDte();
  if (!proveedor) {
    return {
      documento: borrador,
      emitido: false,
      mensaje:
        "Quedó como borrador: todavía no hay un proveedor de facturación conectado. Emítelo en el portal del SII con estos datos y luego anota aquí el folio que te entregue.",
    };
  }

  try {
    const r = await proveedor.emitir({
      tipo: s.tipo,
      fecha: s.fecha,
      receptor: {
        rut: normalizarRut(s.receptor.rut),
        nombre: s.receptor.nombre ?? null,
        giro: s.receptor.giro ?? null,
        direccion: s.receptor.direccion ?? null,
        email: s.receptor.email ?? null,
      },
      items: s.lineas,
      referencia: referencia
        ? { tipo: referencia.tipo, folio: referencia.folio!, fecha: referencia.fecha, razon: s.razon_referencia ?? "Corrige documento" }
        : undefined,
    });
    const { data, error } = await supabaseServer
      .from("tax_documents")
      .update({
        folio: r.folio,
        estado: "emitido",
        origen: "proveedor_dte",
        proveedor_dte: proveedor.nombre,
        proveedor_track_id: r.trackId,
      })
      .eq("id", borrador.id)
      .select("*")
      .single();
    fallar(error, "emitirDocumento.folio");
    await auditLog({
      action: "tax_document.emit",
      entity: "tax_documents",
      entityId: borrador.id,
      actor,
      details: { proveedor: proveedor.nombre, folio: r.folio, trackId: r.trackId },
    });
    return { documento: filaDocumento(data!), emitido: true, mensaje: `Emitido con folio ${r.folio}.` };
  } catch (e) {
    if (e instanceof ErrorDocumentos) throw e;
    const motivo = e instanceof Error ? e.message : String(e);
    await supabaseServer
      .from("tax_documents")
      .update({ estado: "error", notas: `Rechazado por ${proveedor.nombre}: ${motivo}`.slice(0, 1000) })
      .eq("id", borrador.id);
    throw new ErrorDocumentos(`El proveedor de facturación rechazó el documento: ${motivo}`, 502);
  }
}
