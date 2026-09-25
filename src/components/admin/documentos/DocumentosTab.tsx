"use client";

/**
 * Lista de documentos del mes: facturas recibidas o documentos emitidos.
 *
 * Las acciones son las del día a día: revisar (aceptar o reclamar), marcar
 * pagada, ver o adjuntar la foto, y anotar el folio de un borrador cuando el
 * SII lo entrega.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpTrayIcon,
  CheckIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PaperClipIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { EmptyState, FilterChips, type FilterOption } from "@/components/admin/shell";
import { useToast } from "@/contexts/ToastContext";
import { formatearRut } from "@/lib/documentos/rut";
import type { Direccion } from "@/lib/documentos/tipos";
import { diasEntre, hoyEnChile } from "@/lib/documentos/vencimientos";
import type { DocumentoRow, ResultadoEmision, ResultadoImportacion } from "@/server/documentos.service";
import FormularioDocumento from "./FormularioDocumento";
import EmitirDocumento from "./EmitirDocumento";
import ImportarRcv from "./ImportarRcv";
import { Cargando } from "./ResumenTab";
import { Boton, Campo, Estado, Modal, SelectorMes, Tarjeta, claseInput, fecha, json, nombreTipo, pedir, pesos } from "./ui";

type Filtro = "todos" | "pendiente" | "porPagar" | "reclamado" | "borrador" | "emitido" | "anulado";

const FILTROS: Record<Direccion, Filtro[]> = {
  recibido: ["todos", "pendiente", "porPagar", "reclamado"],
  emitido: ["todos", "borrador", "emitido", "anulado"],
};

const NOMBRE_FILTRO: Record<Filtro, string> = {
  todos: "Todos",
  pendiente: "Por revisar",
  porPagar: "Por pagar (todos los meses)",
  reclamado: "Reclamadas",
  borrador: "Borradores",
  emitido: "Emitidos",
  anulado: "Anulados",
};

export default function DocumentosTab({
  direccion,
  periodo,
  onPeriodo,
}: {
  direccion: Direccion;
  periodo: string;
  onPeriodo: (p: string) => void;
}) {
  const { showToast } = useToast();
  const [docs, setDocs] = useState<DocumentoRow[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modal, setModal] = useState<"registrar" | "importar" | "emitir" | null>(null);
  const [folioDe, setFolioDe] = useState<DocumentoRow | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const qs = filtro === "porPagar" ? `direccion=${direccion}` : `direccion=${direccion}&periodo=${periodo}`;
      const { documentos } = await pedir<{ documentos: DocumentoRow[] }>(`/api/admin/documentos?${qs}`);
      setDocs(documentos);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron cargar los documentos", "error");
      setDocs([]);
    }
  }, [direccion, periodo, filtro, showToast]);

  useEffect(() => {
    setDocs(null);
    cargar();
  }, [cargar]);

  useEffect(() => setFiltro("todos"), [direccion]);

  const visibles = useMemo(() => {
    if (!docs) return [];
    if (filtro === "todos") return docs;
    if (filtro === "porPagar") return docs.filter((d) => d.estado_pago === "pendiente" && d.estado !== "reclamado");
    return docs.filter((d) => d.estado === filtro);
  }, [docs, filtro]);

  const totales = useMemo(
    () =>
      visibles.reduce(
        (t, d) => {
          const signo = d.tipo === "61" ? -1 : 1;
          const cuenta = !["borrador", "anulado", "error", "reclamado"].includes(d.estado);
          return cuenta ? { neto: t.neto + signo * d.neto, iva: t.iva + signo * d.iva, total: t.total + signo * d.total } : t;
        },
        { neto: 0, iva: 0, total: 0 },
      ),
    [visibles],
  );

  const opciones: FilterOption[] = FILTROS[direccion].map((f) => ({
    value: f,
    label: NOMBRE_FILTRO[f],
    count:
      f === "todos" || !docs
        ? undefined
        : f === "porPagar"
          ? undefined
          : docs.filter((d) => d.estado === f).length,
  }));

  const actualizar = async (d: DocumentoRow, cambios: Record<string, unknown>, aviso: string) => {
    setOcupado(d.id);
    try {
      await pedir(`/api/admin/documentos/${d.id}`, json("PATCH", cambios));
      showToast(aviso, "success");
      await cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async (d: DocumentoRow) => {
    if (!window.confirm(`¿Borrar ${nombreTipo(d.tipo)} ${d.folio ?? "(borrador)"} por ${pesos(d.total)}? No se puede deshacer.`)) return;
    setOcupado(d.id);
    try {
      await pedir(`/api/admin/documentos/${d.id}`, { method: "DELETE" });
      showToast("Documento borrado", "success");
      await cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo borrar", "error");
    } finally {
      setOcupado(null);
    }
  };

  const adjuntar = async (d: DocumentoRow, archivo: File | undefined) => {
    if (!archivo) return;
    setOcupado(d.id);
    const form = new FormData();
    form.append("file", archivo);
    try {
      await pedir(`/api/admin/documentos/${d.id}/archivo`, { method: "POST", body: form });
      showToast("Archivo adjuntado", "success");
      await cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo subir el archivo", "error");
    } finally {
      setOcupado(null);
    }
  };

  const hoy = hoyEnChile();

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filtro !== "porPagar" && <SelectorMes periodo={periodo} onCambiar={onPeriodo} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {direccion === "emitido" && (
            <Boton onClick={() => setModal("emitir")} icono={<DocumentPlusIcon className="h-4 w-4" />}>
              Emitir boleta o factura
            </Boton>
          )}
          <Boton
            variante={direccion === "recibido" ? "primario" : "secundario"}
            onClick={() => setModal("registrar")}
            icono={<PencilSquareIcon className="h-4 w-4" />}
          >
            {direccion === "recibido" ? "Registrar factura" : "Registrar emitido"}
          </Boton>
          <Boton variante="secundario" onClick={() => setModal("importar")} icono={<ArrowUpTrayIcon className="h-4 w-4" />}>
            Importar del SII
          </Boton>
        </div>
      </div>

      <FilterChips options={opciones} value={filtro} onChange={(v) => setFiltro(v as Filtro)} />

      {docs === null ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <Tarjeta>
          <EmptyState
            icon={<DocumentTextIcon className="h-7 w-7" />}
            title={direccion === "recibido" ? "No hay facturas en esta vista" : "No hay documentos en esta vista"}
            description={
              direccion === "recibido"
                ? "Importa el Registro de Compras del SII para traer todas las facturas del mes de una vez, o registra una a mano con su foto."
                : "Importa el Registro de Ventas del SII o prepara una boleta o factura."
            }
          />
        </Tarjeta>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white ring-1 ring-gray-200 p-3 text-center">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Neto</p><p className="font-black text-gray-900">{pesos(totales.neto)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">IVA</p><p className="font-black text-gray-900">{pesos(totales.iva)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</p><p className="font-black text-gray-900">{pesos(totales.total)}</p></div>
          </div>

          <ul className="space-y-2">
            {visibles.map((d) => {
              const diasDesdeEmision = diasEntre(d.fecha, hoy);
              const plazoReclamo = d.estado === "pendiente" ? 8 - diasDesdeEmision : null;
              return (
                <li key={d.id} className="rounded-2xl bg-white ring-1 ring-gray-200 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900">
                        {nombreTipo(d.tipo)} {d.folio ? `N° ${d.folio}` : <span className="text-gray-500 font-semibold">sin folio</span>}
                        <span className="ml-2 font-semibold text-gray-600">{fecha(d.fecha)}</span>
                      </p>
                      <p className="text-sm text-gray-700 truncate">
                        {d.contraparte_nombre || (direccion === "emitido" ? "Consumidor final" : "Sin razón social")}
                        {d.contraparte_rut && <span className="text-gray-500"> · {formatearRut(d.contraparte_rut)}</span>}
                      </p>
                      {d.notas && <p className="text-xs text-gray-500 mt-0.5">{d.notas}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">{d.tipo === "61" ? "−" : ""}{pesos(d.total)}</p>
                      <p className="text-xs text-gray-500">IVA {pesos(d.iva)}{d.retencion ? ` · retención ${pesos(d.retencion)}` : ""}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Estado estado={d.estado} />
                    {direccion === "recibido" && d.estado !== "reclamado" && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${d.estado_pago === "pagado" ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700"}`}>
                        {d.estado_pago === "pagado" ? `Pagada ${d.pagado_el ? fecha(d.pagado_el) : ""}` : d.vence_pago ? `Pagar antes del ${fecha(d.vence_pago)}` : "Sin pagar"}
                      </span>
                    )}
                    {plazoReclamo != null && plazoReclamo >= 0 && (
                      <span className="text-xs font-semibold text-amber-800">
                        {plazoReclamo === 0 ? "Hoy es el último día para reclamarla" : `Quedan ~${plazoReclamo} días para reclamarla si viene mal`}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.estado === "pendiente" && (
                      <>
                        <Boton variante="suave" cargando={ocupado === d.id} icono={<CheckIcon className="h-4 w-4" />} onClick={() => actualizar(d, { estado: "aceptado" }, "Factura aceptada")}>
                          Está bien
                        </Boton>
                        <Boton
                          variante="peligro"
                          disabled={ocupado === d.id}
                          onClick={() =>
                            window.confirm("Marcarla como reclamada la saca del crédito fiscal. Recuerda reclamarla también en el Registro de Compras del SII. ¿Seguir?") &&
                            actualizar(d, { estado: "reclamado" }, "Marcada como reclamada")
                          }
                        >
                          Reclamar
                        </Boton>
                      </>
                    )}
                    {direccion === "recibido" && d.estado !== "reclamado" && d.estado_pago === "pendiente" && (
                      <Boton variante="secundario" disabled={ocupado === d.id} onClick={() => actualizar(d, { estado_pago: "pagado" }, "Marcada como pagada")}>
                        Marcar pagada
                      </Boton>
                    )}
                    {d.estado === "borrador" && (
                      <Boton variante="suave" onClick={() => setFolioDe(d)}>Anotar folio del SII</Boton>
                    )}
                    {d.archivo_path ? (
                      <a
                        href={`/api/admin/documentos/${d.id}/archivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl text-sm font-bold bg-white text-gray-800 ring-1 ring-gray-300 hover:ring-brand-400"
                      >
                        <EyeIcon className="h-4 w-4" /> Ver archivo
                      </a>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl text-sm font-bold bg-white text-gray-800 ring-1 ring-gray-300 hover:ring-brand-400 cursor-pointer">
                        <PaperClipIcon className="h-4 w-4" /> Adjuntar foto
                        <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => adjuntar(d, e.target.files?.[0])} />
                      </label>
                    )}
                    {d.estado === "emitido" && direccion === "emitido" && (
                      <Boton
                        variante="peligro"
                        disabled={ocupado === d.id}
                        onClick={() =>
                          window.confirm("Ante el SII un documento emitido se anula con una nota de crédito. Márcalo como anulado sólo si ya emitiste esa nota. ¿Seguir?") &&
                          actualizar(d, { estado: "anulado" }, "Marcado como anulado")
                        }
                      >
                        Anular
                      </Boton>
                    )}
                    {d.estado !== "emitido" && (
                      <button type="button" onClick={() => eliminar(d)} className="text-xs font-bold text-gray-500 hover:text-rose-700 px-2">
                        Borrar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Modal abierto={modal === "registrar"} onCerrar={() => setModal(null)} titulo={direccion === "recibido" ? "Registrar factura recibida" : "Registrar documento emitido"}>
        <FormularioDocumento
          direccion={direccion}
          onCancelar={() => setModal(null)}
          onGuardado={() => {
            setModal(null);
            showToast("Documento guardado", "success");
            cargar();
          }}
        />
      </Modal>

      <Modal abierto={modal === "importar"} onCerrar={() => setModal(null)} titulo={`Importar el Registro de ${direccion === "recibido" ? "Compras" : "Ventas"} del SII`}>
        <ImportarRcv
          direccion={direccion}
          onCancelar={() => setModal(null)}
          onImportado={(r: ResultadoImportacion) => {
            setModal(null);
            showToast(`${r.nuevos} documentos importados`, "success");
            if (r.periodos.length === 1 && r.periodos[0] !== periodo) onPeriodo(r.periodos[0]);
            else cargar();
          }}
        />
      </Modal>

      <Modal abierto={modal === "emitir"} onCerrar={() => setModal(null)} titulo="Emitir boleta, factura o nota">
        <EmitirDocumento
          emitidos={(docs ?? []).filter((d) => d.estado === "emitido" && d.folio && d.tipo !== "61" && d.tipo !== "56")}
          onCancelar={() => setModal(null)}
          onListo={(r: ResultadoEmision) => {
            setModal(null);
            showToast(r.mensaje, r.emitido ? "success" : "info", 8000);
            cargar();
          }}
        />
      </Modal>

      <AnotarFolio doc={folioDe} onCerrar={() => setFolioDe(null)} onGuardado={() => { setFolioDe(null); cargar(); }} />
    </div>
  );
}

function AnotarFolio({ doc, onCerrar, onGuardado }: { doc: DocumentoRow | null; onCerrar: () => void; onGuardado: () => void }) {
  const { showToast } = useToast();
  const [folio, setFolio] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setFolio(""), [doc]);

  const guardar = async () => {
    if (!doc || !folio) return;
    setGuardando(true);
    try {
      await pedir(`/api/admin/documentos/${doc.id}`, json("PATCH", { folio: Number(folio), estado: "emitido" }));
      showToast(`Folio ${folio} anotado`, "success");
      onGuardado();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal abierto={Boolean(doc)} onCerrar={onCerrar} titulo="Anotar el folio del SII" ancho="max-w-md">
      {doc && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {nombreTipo(doc.tipo)} por {pesos(doc.total)} del {fecha(doc.fecha)}. Escribe el folio que te dio el SII al emitirla.
          </p>
          <Campo etiqueta="Folio">
            <input value={folio} onChange={(e) => setFolio(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={claseInput} autoFocus />
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
            <Boton onClick={guardar} cargando={guardando} disabled={!folio}>Guardar</Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
