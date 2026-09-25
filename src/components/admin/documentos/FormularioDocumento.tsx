"use client";

/**
 * Registrar un documento a mano: la factura que trajo el proveedor, una
 * boleta de honorarios, o una boleta/factura emitida fuera del panel.
 *
 * Pensado para hacerse desde el celular con la factura en la mano: la foto
 * se saca con la cámara, el RUT se valida mientras se escribe y, si ya existe
 * una factura con ese folio del mismo proveedor, se avisa antes de duplicarla.
 */

import { useEffect, useMemo, useState } from "react";
import { CameraIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { formatearRut, normalizarRut, rutValido } from "@/lib/documentos/rut";
import { TIPOS_DOCUMENTO, TIPOS_CON_IVA_INCLUIDO, type Direccion, type TipoDocumento } from "@/lib/documentos/tipos";
import { calcularDesdeNeto, desglosarBruto } from "@/lib/documentos/libro";
import { hoyEnChile } from "@/lib/documentos/vencimientos";
import { tasaRetencionHonorarios } from "@/lib/documentos/imposiciones";
import type { DocumentoRow } from "@/server/documentos.service";
import { Boton, Campo, claseInput, fecha as fechaTexto, json, pedir, pesos } from "./ui";

type Proveedor = { id: string; name: string; rut: string | null };

const TIPOS_POR_DIRECCION: Record<Direccion, TipoDocumento[]> = {
  recibido: ["33", "34", "61", "56", "BHE", "52"],
  emitido: ["39", "41", "33", "34", "61", "56", "46", "48"],
};

export default function FormularioDocumento({
  direccion,
  onGuardado,
  onCancelar,
}: {
  direccion: Direccion;
  onGuardado: (d: DocumentoRow) => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDocumento>(TIPOS_POR_DIRECCION[direccion][0]);
  const [folio, setFolio] = useState("");
  const [fecha, setFecha] = useState(hoyEnChile());
  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [neto, setNeto] = useState("");
  const [exento, setExento] = useState("");
  const [iva, setIva] = useState("");
  const [ivaManual, setIvaManual] = useState(false);
  const [otros, setOtros] = useState("");
  const [totalBruto, setTotalBruto] = useState("");
  const [retencion, setRetencion] = useState("");
  const [vencePago, setVencePago] = useState("");
  const [revisada, setRevisada] = useState(false);
  const [pagada, setPagada] = useState(false);
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<DocumentoRow | null>(null);

  useEffect(() => {
    if (direccion !== "recibido") return;
    pedir<Proveedor[]>("/api/admin/suppliers").then(setProveedores).catch(() => setProveedores([]));
  }, [direccion]);

  const soloTotal = TIPOS_CON_IVA_INCLUIDO.includes(tipo) || tipo === "BHE";
  const sinIva = tipo === "34" || tipo === "41" || tipo === "52";
  const n = (v: string) => Math.max(0, Math.round(Number(v.replace(/\D/g, "")) || 0));

  // El IVA se calcula solo desde el neto, salvo que se corrija a mano para
  // que cuadre al peso con lo impreso en la factura.
  useEffect(() => {
    if (!ivaManual && !soloTotal) setIva(sinIva ? "0" : String(calcularDesdeNeto(n(neto)).iva));
  }, [neto, ivaManual, soloTotal, sinIva]);

  useEffect(() => {
    if (tipo === "BHE") {
      const anio = Number(fecha.slice(0, 4));
      setRetencion(String(Math.round((n(totalBruto) * tasaRetencionHonorarios(anio)) / 100)));
    }
  }, [tipo, totalBruto, fecha]);

  const montos = useMemo(() => {
    if (tipo === "BHE") return { neto: 0, exento: 0, iva: 0, otros_impuestos: 0, retencion: n(retencion), total: n(totalBruto) };
    if (soloTotal) {
      const { neto: nn, iva: ii } = desglosarBruto(n(totalBruto));
      return { neto: nn, exento: 0, iva: ii, otros_impuestos: 0, retencion: 0, total: n(totalBruto) };
    }
    const t = n(neto) + n(exento) + n(iva) + n(otros);
    return { neto: n(neto), exento: n(exento), iva: n(iva), otros_impuestos: n(otros), retencion: 0, total: t };
  }, [tipo, soloTotal, neto, exento, iva, otros, totalBruto, retencion]);

  const rutEscrito = rut.trim().length > 0;
  const rutOk = rutValido(rut);

  const elegirProveedor = (id: string) => {
    setProveedorId(id);
    const p = proveedores.find((x) => x.id === id);
    if (p?.rut) setRut(formatearRut(p.rut));
    if (p && !nombre) setNombre(p.name);
  };

  // Al escribir un RUT conocido se elige el proveedor solo.
  useEffect(() => {
    const normal = normalizarRut(rut);
    if (!normal || proveedorId) return;
    const p = proveedores.find((x) => normalizarRut(x.rut) === normal);
    if (p) {
      setProveedorId(p.id);
      if (!nombre) setNombre(p.name);
    }
  }, [rut, proveedores, proveedorId, nombre]);

  const guardar = async () => {
    setError(null);
    setDuplicado(null);
    if (rutEscrito && !rutOk) return setError("El RUT no es válido: revisa el dígito verificador.");
    if (!montos.total) return setError("Falta el monto total del documento.");
    setGuardando(true);
    try {
      const { documento } = await pedir<{ documento: DocumentoRow }>(
        "/api/admin/documentos",
        json("POST", {
          direccion,
          tipo,
          folio: folio ? Number(folio) : null,
          fecha,
          contraparte_rut: rut || null,
          contraparte_nombre: nombre || null,
          ...montos,
          estado: direccion === "recibido" ? (revisada ? "aceptado" : "pendiente") : folio ? "emitido" : "borrador",
          estado_pago: direccion === "recibido" ? (pagada ? "pagado" : "pendiente") : "no_aplica",
          pagado_el: pagada ? fecha : null,
          vence_pago: vencePago || null,
          supplier_id: proveedorId || null,
          notas: notas || null,
        }),
      );
      let final = documento;
      if (archivo) {
        const form = new FormData();
        form.append("file", archivo);
        try {
          final = (await pedir<{ documento: DocumentoRow }>(`/api/admin/documentos/${documento.id}/archivo`, { method: "POST", body: form })).documento;
        } catch (e) {
          setError(`El documento se guardó, pero la foto no: ${e instanceof Error ? e.message : "error"}. Adjúntala desde la lista.`);
        }
      }
      onGuardado(final);
    } catch (e) {
      const err = e as Error & { status?: number; body?: { duplicado?: DocumentoRow } };
      if (err.status === 409 && err.body?.duplicado) setDuplicado(err.body.duplicado);
      else setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const numero = (valor: string, set: (v: string) => void, extra?: () => void) => ({
    value: valor,
    inputMode: "numeric" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value.replace(/[^\d]/g, ""));
      extra?.();
    },
    className: claseInput,
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo etiqueta="Tipo de documento" className="sm:col-span-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} className={claseInput}>
            {TIPOS_POR_DIRECCION[direccion].map((t) => (
              <option key={t} value={t}>
                {TIPOS_DOCUMENTO[t].nombre}
                {t !== "BHE" ? ` (${t})` : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Folio (N°)" ayuda={direccion === "emitido" ? "Vacío = borrador sin folio" : undefined}>
          <input {...numero(folio, setFolio)} placeholder="Ej. 12345" />
        </Campo>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo etiqueta="Fecha del documento">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseInput} required />
        </Campo>
        <Campo
          etiqueta={direccion === "recibido" ? "RUT de quien la emite" : "RUT del cliente"}
          error={rutEscrito && !rutOk ? "Dígito verificador incorrecto" : null}
          ayuda={rutEscrito && rutOk ? (
            <span className="inline-flex items-center gap-1 text-brand-800 font-semibold">
              <CheckCircleIcon className="h-3.5 w-3.5" /> RUT válido
            </span>
          ) : undefined}
        >
          <input
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            onBlur={() => rutOk && setRut(formatearRut(rut))}
            placeholder="12.345.678-9"
            className={claseInput}
            autoComplete="off"
          />
        </Campo>
        <Campo etiqueta={direccion === "recibido" ? "Razón social" : "Nombre o razón social"}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={claseInput} />
        </Campo>
      </div>

      {direccion === "recibido" && proveedores.length > 0 && (
        <Campo etiqueta="Proveedor en el sistema" ayuda="Se elige solo si el RUT coincide con el de un proveedor cargado.">
          <select value={proveedorId} onChange={(e) => elegirProveedor(e.target.value)} className={claseInput}>
            <option value="">— Sin enlazar (gasto: luz, arriendo, etc.) —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.rut ? ` · ${formatearRut(p.rut)}` : ""}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {soloTotal ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo etiqueta={tipo === "BHE" ? "Monto bruto de la boleta" : "Total (con IVA)"}>
            <input {...numero(totalBruto, setTotalBruto)} placeholder="0" />
          </Campo>
          {tipo === "BHE" ? (
            <Campo etiqueta="Retención" ayuda={`${tasaRetencionHonorarios(Number(fecha.slice(0, 4)))}% en ${fecha.slice(0, 4)}. Se paga en el F29.`}>
              <input {...numero(retencion, setRetencion)} />
            </Campo>
          ) : (
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              Neto {pesos(montos.neto)} · IVA {pesos(montos.iva)}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo etiqueta="Neto">
            <input {...numero(neto, setNeto)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Exento">
            <input {...numero(exento, setExento)} placeholder="0" />
          </Campo>
          <Campo etiqueta="IVA" ayuda={ivaManual ? "Corregido a mano" : "Se calcula solo"}>
            <input {...numero(iva, setIva, () => setIvaManual(true))} />
          </Campo>
          <Campo etiqueta="Otros impuestos" ayuda="ILA de bebidas, etc.">
            <input {...numero(otros, setOtros)} placeholder="0" />
          </Campo>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-3">
        <span className="text-sm font-bold text-brand-900">Total del documento</span>
        <span className="text-xl font-black text-brand-900">{pesos(montos.total)}</span>
      </div>

      {direccion === "recibido" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Campo etiqueta="Fecha para pagarla" ayuda="Opcional: para el aviso de pago">
            <input type="date" value={vencePago} onChange={(e) => setVencePago(e.target.value)} className={claseInput} />
          </Campo>
          <label className="flex items-center gap-2 min-h-[40px] text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={revisada} onChange={(e) => setRevisada(e.target.checked)} className="h-4 w-4 accent-brand-700" />
            Ya la revisé: está bien
          </label>
          <label className="flex items-center gap-2 min-h-[40px] text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={pagada} onChange={(e) => setPagada(e.target.checked)} className="h-4 w-4 accent-brand-700" />
            Ya está pagada
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo etiqueta="Foto o PDF" ayuda={archivo ? archivo.name : "Desde el celular abre la cámara. Que se lean el folio y el total."}>
          <label className="flex items-center justify-center gap-2 min-h-[40px] rounded-xl border-2 border-dashed border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 cursor-pointer hover:border-brand-400 hover:text-brand-800">
            <CameraIcon className="h-5 w-5" />
            {archivo ? "Cambiar archivo" : "Sacar foto o elegir archivo"}
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </Campo>
        <Campo etiqueta="Notas">
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={claseInput} placeholder="Opcional" />
        </Campo>
      </div>

      {duplicado && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-950">
          <p className="font-bold">Este documento ya está registrado.</p>
          <p>
            {TIPOS_DOCUMENTO[duplicado.tipo].corto} N° {duplicado.folio} de {duplicado.contraparte_nombre ?? duplicado.contraparte_rut},
            del {fechaTexto(duplicado.fecha)}, por {pesos(duplicado.total)}. No hace falta cargarlo de nuevo.
          </p>
        </div>
      )}
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Boton type="button" variante="secundario" onClick={onCancelar}>Cancelar</Boton>
        <Boton type="submit" cargando={guardando}>Guardar documento</Boton>
      </div>
    </form>
  );
}
