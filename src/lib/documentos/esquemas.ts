/**
 * Validación de lo que llega a /api/admin/documentos.
 */

import { z } from "zod";
import { CODIGOS_DOCUMENTO, TIPOS_EMITIBLES } from "./tipos";
import { rutValido } from "./rut";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)");
const periodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período inválido (AAAA-MM)");
const monto = z.number().int("Los montos van en pesos enteros").min(0, "Los montos no pueden ser negativos");
const texto = (max: number) => z.string().trim().max(max).nullable().optional();
const rut = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((v) => !v || rutValido(v), "El RUT no es válido: revisa el dígito verificador");

export const esquemaDocumento = z.object({
  direccion: z.enum(["emitido", "recibido"]),
  tipo: z.enum(CODIGOS_DOCUMENTO as [string, ...string[]]),
  folio: z.number().int().positive("El folio debe ser un número mayor que cero").nullable().optional(),
  fecha,
  periodo: periodo.nullable().optional(),
  contraparte_rut: rut,
  contraparte_nombre: texto(200),
  contraparte_giro: texto(200),
  contraparte_direccion: texto(300),
  contraparte_email: z.string().trim().email("Correo inválido").nullable().optional().or(z.literal("")),
  neto: monto.optional(),
  exento: monto.optional(),
  iva: monto.optional(),
  otros_impuestos: monto.optional(),
  retencion: monto.optional(),
  total: monto,
  estado: z.enum(["borrador", "emitido", "anulado", "error", "pendiente", "aceptado", "reclamado"]).optional(),
  estado_pago: z.enum(["pendiente", "pagado", "no_aplica"]).optional(),
  vence_pago: fecha.nullable().optional(),
  pagado_el: fecha.nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  supplier_order_id: z.string().uuid().nullable().optional(),
  referencia_id: z.string().uuid().nullable().optional(),
  notas: texto(1000),
});

export const esquemaDocumentoNuevo = esquemaDocumento.superRefine((d, ctx) => {
  const esFacturaRecibida = d.direccion === "recibido" && ["33", "34", "46", "56", "61", "BHE"].includes(d.tipo);
  if (esFacturaRecibida && !d.contraparte_rut) {
    ctx.addIssue({ code: "custom", path: ["contraparte_rut"], message: "Falta el RUT de quien emitió el documento" });
  }
  if (d.direccion === "recibido" && d.tipo !== "52" && !d.folio) {
    ctx.addIssue({ code: "custom", path: ["folio"], message: "Falta el folio (número del documento)" });
  }
});

export const esquemaCambiosDocumento = esquemaDocumento.omit({ direccion: true }).partial();

export const esquemaEmision = z.object({
  tipo: z.enum(TIPOS_EMITIBLES as [string, ...string[]]),
  fecha,
  receptor: z
    .object({
      rut,
      nombre: texto(200),
      giro: texto(200),
      direccion: texto(300),
      email: z.string().trim().email("Correo inválido").nullable().optional().or(z.literal("")),
    })
    .default({}),
  lineas: z
    .array(
      z.object({
        descripcion: z.string().trim().min(1, "Cada línea necesita descripción").max(200),
        cantidad: z.number().positive("La cantidad debe ser mayor que cero"),
        precio: z.number().min(0, "El precio no puede ser negativo"),
        exento: z.boolean().optional(),
      }),
    )
    .min(1, "Agrega al menos una línea")
    .max(60),
  referencia_id: z.string().uuid().nullable().optional(),
  razon_referencia: texto(90),
  notas: texto(1000),
});

export const esquemaImportacion = z.object({
  contenido: z.string().min(1, "El archivo está vacío").max(5_000_000, "El archivo es demasiado grande"),
  direccion: z.enum(["emitido", "recibido"]),
  confirmar: z.boolean().default(false),
});

export const esquemaPeriodo = z.object({
  periodo,
  accion: z.enum(["guardar", "cerrar", "reabrir"]),
  tasa_ppm: z.number().min(0).max(100).nullable().optional(),
  remanente_anterior: monto.nullable().optional(),
  retencion_impuesto_unico: monto.optional(),
  notas: texto(1000),
});

export const esquemaPagoObligacion = z.object({
  tipo: z.enum(["F29", "PREVIRED", "PATENTE", "F22"]),
  periodo,
  vence_el: fecha,
  monto_estimado: monto.nullable().optional(),
  monto_pagado: monto.nullable().optional(),
  pagado_el: fecha.nullable().optional(),
  notas: texto(1000),
});

export const esquemaEmpleado = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre").max(120),
  rut,
  cargo: texto(80),
  tipo_contrato: z.enum(["indefinido", "plazo_fijo"]),
  sueldo_imponible: monto,
  afp: texto(40),
  comision_afp: z.number().min(0).max(10).nullable().optional(),
  salud: z.enum(["fonasa", "isapre"]),
  adicional_salud: monto.optional(),
  fecha_ingreso: fecha.nullable().optional(),
  activo: z.boolean().optional(),
  notas: texto(500),
});

const tasa = z.number().min(0).max(100);

export const esquemaConfiguracion = z.object({
  tasa_ppm: tasa.optional(),
  tasas_previsionales: z
    .object({
      afp: tasa,
      salud: tasa,
      cesantiaTrabajadorIndefinido: tasa,
      cesantiaEmpleadorIndefinido: tasa,
      cesantiaEmpleadorPlazoFijo: tasa,
      mutual: tasa,
      aporteEmpleador: tasa,
      sis: tasa,
    })
    .partial()
    .optional(),
});

/** Mensaje legible con los errores de zod, para devolverlo tal cual al panel. */
export function mensajeValidacion(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(". ");
}
