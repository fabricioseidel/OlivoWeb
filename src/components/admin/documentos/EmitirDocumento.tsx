"use client";

/**
 * Preparar (y, con proveedor conectado, emitir) una boleta, factura o nota.
 *
 * Mientras no haya proveedor de facturación, lo que sale de aquí es un
 * BORRADOR y la pantalla lo dice antes de empezar: no se entrega nada que
 * parezca un documento válido sin serlo.
 */

import { useEffect, useMemo, useState } from "react";
import { ExclamationTriangleIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { calcularTotales, faltantesParaEmitir, preciosConIva, type LineaEmision } from "@/lib/documentos/emision";
import { formatearRut, rutValido } from "@/lib/documentos/rut";
import { TIPOS_DOCUMENTO, TIPOS_EMITIBLES, type TipoDocumento } from "@/lib/documentos/tipos";
import { hoyEnChile } from "@/lib/documentos/vencimientos";
import type { DocumentoRow, ResultadoEmision } from "@/server/documentos.service";
import { Boton, Campo, claseInput, fecha as fechaTexto, json, nombreTipo, pedir, pesos } from "./ui";

const lineaVacia = (): LineaEmision => ({ descripcion: "", cantidad: 1, precio: 0, exento: false });

export default function EmitirDocumento({
  emitidos,
  onListo,
  onCancelar,
}: {
  /** Documentos emitidos con folio, para elegir cuál corrige una nota. */
  emitidos: DocumentoRow[];
  onListo: (r: ResultadoEmision) => void;
  onCancelar: () => void;
}) {
  const [proveedor, setProveedor] = useState<string | null | undefined>(undefined);
  const [tipo, setTipo] = useState<TipoDocumento>("39");
  const [fecha, setFecha] = useState(hoyEnChile());
  const [receptor, setReceptor] = useState({ rut: "", nombre: "", giro: "", direccion: "", email: "" });
  const [lineas, setLineas] = useState<LineaEmision[]>([lineaVacia()]);
  const [referenciaId, setReferenciaId] = useState("");
  const [razon, setRazon] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pedir<{ proveedor: string | null }>("/api/admin/documentos/emitir")
      .then((r) => setProveedor(r.proveedor))
      .catch(() => setProveedor(null));
  }, []);

  const esNota = tipo === "61" || tipo === "56";
  const esFactura = tipo === "33" || tipo === "34";
  const referencia = emitidos.find((d) => d.id === referenciaId) ?? null;
  const pideReceptor = esFactura || (esNota && referencia && (referencia.tipo === "33" || referencia.tipo === "34"));
  const conIva = preciosConIva(tipo, referencia?.tipo);
  const totales = useMemo(() => calcularTotales(tipo, lineas, { tipoReferencia: referencia?.tipo }), [tipo, lineas, referencia]);

  // La nota de crédito de una factura va al mismo cliente: se copian sus datos.
  useEffect(() => {
    if (!referencia) return;
    setReceptor((r) => ({
      rut: referencia.contraparte_rut ? formatearRut(referencia.contraparte_rut) : r.rut,
      nombre: referencia.contraparte_nombre ?? r.nombre,
      giro: referencia.contraparte_giro ?? r.giro,
      direccion: referencia.contraparte_direccion ?? r.direccion,
      email: referencia.contraparte_email ?? r.email,
    }));
  }, [referencia]);

  const faltan = faltantesParaEmitir({
    tipo,
    lineas,
    receptorRut: receptor.rut || null,
    receptorNombre: receptor.nombre || null,
    receptorGiro: receptor.giro || null,
    receptorDireccion: receptor.direccion || null,
    referenciaId: referenciaId || null,
  });
  const rutMalo = receptor.rut.trim() !== "" && !rutValido(receptor.rut);

  const cambiarLinea = (i: number, cambio: Partial<LineaEmision>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambio } : l)));

  const enviar = async () => {
    setError(null);
    if (rutMalo) return setError("El RUT del cliente no es válido.");
    if (faltan.length) return setError(`Falta: ${faltan.join(", ")}.`);
    setEnviando(true);
    try {
      const r = await pedir<ResultadoEmision>(
        "/api/admin/documentos/emitir",
        json("POST", {
          tipo,
          fecha,
          receptor: {
            rut: receptor.rut || null,
            nombre: receptor.nombre || null,
            giro: receptor.giro || null,
            direccion: receptor.direccion || null,
            email: receptor.email || null,
          },
          lineas: lineas.map((l) => ({ ...l, descripcion: l.descripcion.trim() })),
          referencia_id: referenciaId || null,
          razon_referencia: razon || null,
        }),
      );
      onListo(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo emitir");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      {proveedor === null && (
        <div className="flex gap-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-950">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>
            <strong>Todavía no hay un proveedor de facturación conectado.</strong> Esto queda como <strong>borrador</strong>:
            sin folio y sin validez ante el SII. Emítelo en el portal del SII (o en la app e-Boleta) con estos datos y
            después anota aquí el folio que te entregue.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo etiqueta="Documento">
          <select value={tipo} onChange={(e) => { setTipo(e.target.value as TipoDocumento); setReferenciaId(""); }} className={claseInput}>
            {TIPOS_EMITIBLES.map((t) => (
              <option key={t} value={t}>{TIPOS_DOCUMENTO[t].nombre} ({t})</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseInput} />
        </Campo>
      </div>

      {esNota && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo etiqueta="Documento que corrige" ayuda={emitidos.length ? undefined : "No hay documentos emitidos con folio en este mes."}>
            <select value={referenciaId} onChange={(e) => setReferenciaId(e.target.value)} className={claseInput}>
              <option value="">— Elige —</option>
              {emitidos.map((d) => (
                <option key={d.id} value={d.id}>
                  {nombreTipo(d.tipo)} N° {d.folio} · {fechaTexto(d.fecha)} · {pesos(d.total)}
                  {d.contraparte_nombre ? ` · ${d.contraparte_nombre}` : ""}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Motivo">
            <input value={razon} onChange={(e) => setRazon(e.target.value)} className={claseInput} placeholder="Ej. devolución de producto" maxLength={90} />
          </Campo>
        </div>
      )}

      {(pideReceptor || tipo === "39" || tipo === "41") && (
        <fieldset className="rounded-2xl ring-1 ring-gray-200 p-3 sm:p-4">
          <legend className="px-1 text-xs font-black uppercase tracking-wider text-gray-700">
            {pideReceptor ? "Datos del cliente (obligatorios)" : "Cliente (opcional en boleta)"}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo etiqueta="RUT" error={rutMalo ? "Dígito verificador incorrecto" : null}>
              <input
                value={receptor.rut}
                onChange={(e) => setReceptor({ ...receptor, rut: e.target.value })}
                onBlur={() => rutValido(receptor.rut) && setReceptor({ ...receptor, rut: formatearRut(receptor.rut) })}
                className={claseInput}
                placeholder="76.123.456-7"
              />
            </Campo>
            <Campo etiqueta="Razón social">
              <input value={receptor.nombre} onChange={(e) => setReceptor({ ...receptor, nombre: e.target.value })} className={claseInput} />
            </Campo>
            {pideReceptor && (
              <>
                <Campo etiqueta="Giro">
                  <input value={receptor.giro} onChange={(e) => setReceptor({ ...receptor, giro: e.target.value })} className={claseInput} />
                </Campo>
                <Campo etiqueta="Dirección">
                  <input value={receptor.direccion} onChange={(e) => setReceptor({ ...receptor, direccion: e.target.value })} className={claseInput} />
                </Campo>
              </>
            )}
            <Campo etiqueta="Correo para enviarle el documento" className="sm:col-span-2">
              <input type="email" value={receptor.email} onChange={(e) => setReceptor({ ...receptor, email: e.target.value })} className={claseInput} />
            </Campo>
          </div>
        </fieldset>
      )}

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-gray-700">
          Detalle · precios {conIva ? "con IVA incluido" : "netos (sin IVA)"}
        </p>
        {lineas.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <Campo etiqueta={i === 0 ? "Descripción" : ""} className="col-span-12 sm:col-span-6">
              <input value={l.descripcion} onChange={(e) => cambiarLinea(i, { descripcion: e.target.value })} className={claseInput} placeholder="Producto o servicio" />
            </Campo>
            <Campo etiqueta={i === 0 ? "Cant." : ""} className="col-span-3 sm:col-span-2">
              <input type="number" min={0} step="any" value={l.cantidad} onChange={(e) => cambiarLinea(i, { cantidad: Number(e.target.value) })} className={claseInput} />
            </Campo>
            <Campo etiqueta={i === 0 ? "Precio" : ""} className="col-span-5 sm:col-span-2">
              <input
                inputMode="numeric"
                value={l.precio || ""}
                onChange={(e) => cambiarLinea(i, { precio: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                className={claseInput}
              />
            </Campo>
            <label className="col-span-2 sm:col-span-1 flex items-center gap-1 min-h-[40px] text-xs font-semibold text-gray-700" title="Línea exenta de IVA">
              <input type="checkbox" checked={Boolean(l.exento)} onChange={(e) => cambiarLinea(i, { exento: e.target.checked })} className="accent-brand-700" />
              Ex.
            </label>
            <button
              type="button"
              onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))}
              className="col-span-2 sm:col-span-1 flex items-center justify-center min-h-[40px] rounded-xl text-gray-500 hover:bg-rose-50 hover:text-rose-700"
              aria-label="Quitar línea"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Boton type="button" variante="suave" icono={<PlusIcon className="h-4 w-4" />} onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
          Agregar línea
        </Boton>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-brand-50 p-4 text-sm">
        <div><dt className="text-brand-900/70 text-xs font-bold">Neto</dt><dd className="font-bold text-brand-950">{pesos(totales.neto)}</dd></div>
        <div><dt className="text-brand-900/70 text-xs font-bold">Exento</dt><dd className="font-bold text-brand-950">{pesos(totales.exento)}</dd></div>
        <div><dt className="text-brand-900/70 text-xs font-bold">IVA 19%</dt><dd className="font-bold text-brand-950">{pesos(totales.iva)}</dd></div>
        <div><dt className="text-brand-900/70 text-xs font-bold">Total</dt><dd className="text-lg font-black text-brand-950">{pesos(totales.total)}</dd></div>
      </dl>

      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        <Boton onClick={enviar} cargando={enviando} disabled={proveedor === undefined}>
          {proveedor ? `Emitir con ${proveedor}` : "Guardar borrador"}
        </Boton>
      </div>
    </div>
  );
}
