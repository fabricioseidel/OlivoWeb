"use client";

/**
 * Importar el Registro de Compras y Ventas descargado del SII.
 *
 * Dos pasos: primero se muestra qué entraría (sin guardar nada) y recién al
 * confirmar se guarda. Volver a subir el mismo archivo no duplica: lo que ya
 * está registrado se reconoce por tipo, folio y RUT.
 */

import { useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import type { Direccion } from "@/lib/documentos/tipos";
import type { ResultadoImportacion } from "@/server/documentos.service";
import { Boton, fecha, json, nombreTipo, pedir, pesos } from "./ui";

/**
 * El SII entrega los CSV en UTF-8, pero un archivo que pasó por Excel en
 * Windows vuelve en Latin-1 y las ñ salen rotas. Se prueba UTF-8 estricto y,
 * si falla, se lee como Windows-1252.
 */
async function leerTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export default function ImportarRcv({
  direccion,
  onImportado,
  onCancelar,
}: {
  direccion: Direccion;
  onImportado: (r: ResultadoImportacion) => void;
  onCancelar: () => void;
}) {
  const [contenido, setContenido] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [vista, setVista] = useState<ResultadoImportacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegir = async (archivo: File | undefined) => {
    setError(null);
    setVista(null);
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    const texto = await leerTexto(archivo);
    setContenido(texto);
    setCargando(true);
    try {
      setVista(await pedir<ResultadoImportacion>("/api/admin/documentos/importar", json("POST", { contenido: texto, direccion, confirmar: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!contenido) return;
    setCargando(true);
    try {
      onImportado(await pedir<ResultadoImportacion>("/api/admin/documentos/importar", json("POST", { contenido, direccion, confirmar: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
        <li>Entra a <strong>sii.cl</strong> con el RUT de la empresa y abre el <strong>Registro de Compras y Ventas</strong> (en Servicios online).</li>
        <li>Elige el mes y la pestaña <strong>{direccion === "recibido" ? "Compras" : "Ventas"}</strong>.</li>
        <li>Pulsa <strong>«Descargar detalles»</strong> y sube aquí ese archivo CSV, sin abrirlo antes en Excel.</li>
      </ol>

      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-brand-400">
        <ArrowUpTrayIcon className="h-8 w-8 text-brand-700" />
        <span className="text-sm font-bold text-gray-800">{nombreArchivo || "Elegir el archivo CSV"}</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => elegir(e.target.files?.[0])} />
      </label>

      {cargando && !vista && <p className="text-sm text-gray-600">Leyendo el archivo…</p>}
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      {vista && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-brand-50 p-3">
              <p className="text-2xl font-black text-brand-900">{vista.nuevos}</p>
              <p className="text-xs font-bold text-brand-900/80">nuevos</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-2xl font-black text-gray-900">{vista.yaRegistrados}</p>
              <p className="text-xs font-bold text-gray-600">ya estaban</p>
            </div>
            <div className={`rounded-xl p-3 ${vista.errores.length ? "bg-rose-50" : "bg-gray-50"}`}>
              <p className={`text-2xl font-black ${vista.errores.length ? "text-rose-800" : "text-gray-900"}`}>{vista.errores.length}</p>
              <p className="text-xs font-bold text-gray-600">con problemas</p>
            </div>
          </div>

          {vista.errores.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded-xl bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
              {vista.errores.map((e, i) => (
                <li key={i}>Línea {e.linea}: {e.motivo}</li>
              ))}
            </ul>
          )}

          {vista.vistaPrevia.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-xl ring-1 ring-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Documento</th>
                    <th className="px-2 py-1.5 text-left">Emisor / cliente</th>
                    <th className="px-2 py-1.5 text-left">Fecha</th>
                    <th className="px-2 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vista.vistaPrevia.map((f, i) => (
                    <tr key={i} className={f.nuevo ? "" : "text-gray-400"}>
                      <td className="px-2 py-1.5 whitespace-nowrap">{nombreTipo(f.tipo)} {f.folio}</td>
                      <td className="px-2 py-1.5">{f.razonSocial || f.rut}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{fecha(f.fecha)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">{pesos(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        <Boton onClick={confirmar} cargando={cargando && Boolean(vista)} disabled={!vista || vista.nuevos === 0}>
          {vista?.nuevos ? `Importar ${vista.nuevos} documento${vista.nuevos === 1 ? "" : "s"}` : "Importar"}
        </Boton>
      </div>
    </div>
  );
}
