/**
 * Archivos del negocio que no deben ser públicos: comprobantes de
 * transferencia de las ventas y facturas o comprobantes de pago de los
 * pedidos a proveedor.
 *
 * Se guardan en el bucket privado `comprobantes` y en la base queda una ruta
 * interna (`/api/admin/archivos?path=…`). Esa ruta pide sesión del personal y
 * redirige a una URL firmada que dura 5 minutos. Como es la misma URL que
 * antes guardaba el enlace público, las pantallas (`<a href>`, `<img src>`)
 * no cambian.
 */

import { supabaseServer } from "@/lib/supabase-server";

export const BUCKET_COMPROBANTES = "comprobantes";

/** Carpetas permitidas: la ruta de lectura no sirve nada fuera de ellas. */
export const CARPETAS_COMPROBANTES = ["ventas/", "pedidos-proveedor/"] as const;

const EXTENSIONES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const TIPOS_COMPROBANTE = Object.keys(EXTENSIONES);

export function rutaInterna(path: string): string {
  return `/api/admin/archivos?path=${encodeURIComponent(path)}`;
}

/** Si la URL guardada es una ruta interna, el path dentro del bucket privado. */
export function pathDeRutaInterna(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/api/admin/archivos?")) return null;
  const path = new URLSearchParams(url.split("?")[1]).get("path");
  return path && esPathPermitido(path) ? path : null;
}

export function esPathPermitido(path: string): boolean {
  return CARPETAS_COMPROBANTES.some((c) => path.startsWith(c)) && !path.includes("..");
}

/** Sube al bucket privado y devuelve el path y la ruta interna para guardar. */
export async function subirComprobante(carpeta: string, archivo: File, prefijo: string) {
  const ext = EXTENSIONES[archivo.type];
  if (!ext) throw new Error("Tipo de archivo no permitido");
  // Aleatorio largo: el nombre ya no es la única barrera, pero tampoco se adivina.
  const path = `${carpeta}/${prefijo}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseServer.storage
    .from(BUCKET_COMPROBANTES)
    .upload(path, await archivo.arrayBuffer(), { contentType: archivo.type, upsert: false });
  if (error) throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  return { path, url: rutaInterna(path) };
}

export async function borrarComprobante(path: string) {
  await supabaseServer.storage.from(BUCKET_COMPROBANTES).remove([path]);
}
