"use client";

/**
 * Libro del mes: de los documentos a lo que se paga en el F29.
 *
 * Muestra dos cálculos lado a lado porque ninguno solo cuenta la verdad
 * completa: "según documentos" es lo que está cargado; "estimado" suma
 * además las ventas del sistema que no tienen documento (tarjeta, web), que
 * es con lo que conviene planificar la caja.
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowDownTrayIcon, LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { BUSINESS } from "@/lib/seo/business";
import { formatearRut } from "@/lib/documentos/rut";
import { TIPOS_DOCUMENTO } from "@/lib/documentos/tipos";
import { fechaCorta, nombrePeriodo, vencimientoF29 } from "@/lib/documentos/vencimientos";
import type { ResumenMensual } from "@/lib/documentos/libro";
import type { DocumentoRow, LibroMensual } from "@/server/documentos.service";
import { Cargando } from "./ResumenTab";
import { Boton, Campo, SelectorMes, Tarjeta, claseInput, json, pedir, pesos } from "./ui";

const MEDIOS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  TRANSFER: "Transferencia",
  STAFF_CREDIT: "Fiado del personal",
  WALLET: "Billetera",
  OTHER: "Otro",
};

function Fila({ etiqueta, valor, fuerte, signo }: { etiqueta: string; valor: number; fuerte?: boolean; signo?: "−" | "+" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${fuerte ? "border-t border-gray-200 mt-1 pt-2" : ""}`}>
      <dt className={`text-sm ${fuerte ? "font-black text-gray-900" : "text-gray-700"}`}>{etiqueta}</dt>
      <dd className={`text-sm tabular-nums ${fuerte ? "text-lg font-black text-gray-900" : "font-bold text-gray-900"}`}>
        {signo && valor ? `${signo} ` : ""}
        {pesos(valor)}
      </dd>
    </div>
  );
}

function CalculoF29({ r }: { r: ResumenMensual }) {
  return (
    <dl>
      <Fila etiqueta="IVA de lo vendido (débito)" valor={r.ivaDebito} />
      <Fila etiqueta="IVA de lo comprado (crédito)" valor={r.ivaCredito} signo="−" />
      <Fila etiqueta="Remanente del mes anterior" valor={r.remanenteAnterior} signo="−" />
      <Fila etiqueta="IVA a pagar" valor={r.ivaAPagar} fuerte />
      <Fila etiqueta={`PPM (${String(r.tasaPpm).replace(".", ",")}% de ${pesos(r.baseAfectaPpm)})`} valor={r.ppm} signo="+" />
      <Fila etiqueta="Retenciones" valor={r.retenciones} signo="+" />
      <Fila etiqueta="Total F29" valor={r.totalF29} fuerte />
      {r.remanenteSiguiente > 0 && (
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900">
          Te queda {pesos(r.remanenteSiguiente)} de crédito a favor para el mes siguiente.
        </p>
      )}
    </dl>
  );
}

export default function LibroTab({ periodo, onPeriodo }: { periodo: string; onPeriodo: (p: string) => void }) {
  const { showToast } = useToast();
  const [libro, setLibro] = useState<LibroMensual | null>(null);
  const [ajustes, setAjustes] = useState({ tasa_ppm: "", remanente_anterior: "", retencion_impuesto_unico: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const l = await pedir<LibroMensual>(`/api/admin/documentos/libro?periodo=${periodo}`);
      setLibro(l);
      setAjustes({
        tasa_ppm: l.tasaPpmOrigen === "periodo" ? String(l.estimado.tasaPpm) : "",
        remanente_anterior: l.remanenteOrigen === "manual" ? String(l.estimado.remanenteAnterior) : "",
        retencion_impuesto_unico: l.retencionImpuestoUnico ? String(l.retencionImpuestoUnico) : "",
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cargar el libro", "error");
    }
  }, [periodo, showToast]);

  useEffect(() => {
    setLibro(null);
    cargar();
  }, [cargar]);

  const accion = async (accion: "guardar" | "cerrar" | "reabrir") => {
    if (accion === "cerrar" && !window.confirm(`¿Cerrar ${nombrePeriodo(periodo)}? Hazlo después de presentar el F29: los documentos del mes quedan congelados y el remanente pasa al mes siguiente.`)) return;
    if (accion === "reabrir" && !window.confirm("Reabrir permite cambiar documentos de un mes ya declarado. Si cambias algo, tendrás que rectificar el F29. ¿Seguir?")) return;
    setGuardando(true);
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
      const l = await pedir<LibroMensual>(
        "/api/admin/documentos/libro",
        json("POST", {
          periodo,
          accion,
          ...(accion === "guardar"
            ? {
                tasa_ppm: num(ajustes.tasa_ppm),
                remanente_anterior: num(ajustes.remanente_anterior),
                retencion_impuesto_unico: num(ajustes.retencion_impuesto_unico) ?? 0,
              }
            : {}),
        }),
      );
      setLibro(l);
      showToast(accion === "cerrar" ? "Mes cerrado" : accion === "reabrir" ? "Mes reabierto" : "Guardado", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const exportar = async () => {
    if (!libro) return;
    try {
      const { documentos } = await pedir<{ documentos: DocumentoRow[] }>(`/api/admin/documentos?periodo=${periodo}`);
      const { utils, writeFile } = await import("xlsx");
      const filas = (dir: "emitido" | "recibido") =>
        documentos
          .filter((d) => d.direccion === dir)
          .map((d) => ({
            Tipo: `${TIPOS_DOCUMENTO[d.tipo].nombre} (${d.tipo})`,
            Folio: d.folio ?? "",
            Fecha: fechaCorta(d.fecha),
            RUT: d.contraparte_rut ? formatearRut(d.contraparte_rut) : "",
            "Razón social": d.contraparte_nombre ?? "",
            Neto: d.neto,
            Exento: d.exento,
            IVA: d.iva,
            "Otros impuestos": d.otros_impuestos,
            Retención: d.retencion,
            Total: d.total,
            Estado: d.estado,
          }));
      const r = libro.estimado;
      const resumen = [
        { Concepto: "Empresa", Valor: `${BUSINESS.legalName} · RUT ${BUSINESS.rut ?? ""}` },
        { Concepto: "Período", Valor: nombrePeriodo(periodo) },
        { Concepto: "Ventas registradas por el sistema (POS + web)", Valor: libro.ventasSistema.total },
        { Concepto: "Ventas con documento cargado", Valor: libro.ventasDocumentadas },
        { Concepto: "IVA débito", Valor: r.ivaDebito },
        { Concepto: "IVA crédito", Valor: r.ivaCredito },
        { Concepto: "Remanente mes anterior", Valor: r.remanenteAnterior },
        { Concepto: "IVA a pagar", Valor: r.ivaAPagar },
        { Concepto: `PPM (${r.tasaPpm}%)`, Valor: r.ppm },
        { Concepto: "Retenciones", Valor: r.retenciones },
        { Concepto: "Total F29 estimado", Valor: r.totalF29 },
        { Concepto: "Remanente para el mes siguiente", Valor: r.remanenteSiguiente },
      ];
      const libroXls = utils.book_new();
      utils.book_append_sheet(libroXls, utils.json_to_sheet(resumen), "Resumen");
      utils.book_append_sheet(libroXls, utils.json_to_sheet(filas("emitido")), "Ventas");
      utils.book_append_sheet(libroXls, utils.json_to_sheet(filas("recibido")), "Compras");
      writeFile(libroXls, `libro-${periodo}-olivo-market.xlsx`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo exportar", "error");
    }
  };

  if (!libro) {
    return (
      <div className="space-y-4">
        <SelectorMes periodo={periodo} onCambiar={onPeriodo} />
        <Cargando />
      </div>
    );
  }

  const vs = libro.ventasSistema;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SelectorMes periodo={periodo} onCambiar={onPeriodo} />
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={exportar} icono={<ArrowDownTrayIcon className="h-4 w-4" />}>
            Excel para el contador
          </Boton>
          {libro.cerrado ? (
            <Boton variante="secundario" onClick={() => accion("reabrir")} cargando={guardando} icono={<LockOpenIcon className="h-4 w-4" />}>
              Reabrir mes
            </Boton>
          ) : (
            <Boton onClick={() => accion("cerrar")} cargando={guardando} icono={<LockClosedIcon className="h-4 w-4" />}>
              Cerrar mes (ya declarado)
            </Boton>
          )}
        </div>
      </div>

      {libro.cerrado && (
        <p className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
          Mes cerrado el {fechaCorta(libro.cerradoAt!.slice(0, 10))}. Se muestra lo que se declaró.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Tarjeta titulo={libro.cerrado ? "F29 declarado" : "F29 estimado (para planificar)"}>
          <CalculoF29 r={libro.estimado} />
          <p className="mt-3 text-xs text-gray-600">
            Se paga a más tardar el <strong>{fechaCorta(vencimientoF29(periodo))}</strong>.
            {libro.ventasSinDocumento > 0 && !libro.cerrado && (
              <> Incluye {pesos(libro.ventasSinDocumento)} de ventas del sistema sin documento cargado, tratadas como boletas.</>
            )}
          </p>
        </Tarjeta>

        <Tarjeta titulo="Sólo con los documentos cargados">
          <CalculoF29 r={libro.segunDocumentos} />
          <p className="mt-3 text-xs text-gray-600">
            {libro.documentos.emitidos} emitidos · {libro.documentos.recibidos} recibidos
            {libro.documentos.porRevisar > 0 && <> · <strong className="text-amber-800">{libro.documentos.porRevisar} por revisar</strong></>}
            {libro.documentos.borradores > 0 && <> · {libro.documentos.borradores} borradores (no cuentan)</>}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Ventas que registró el sistema">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><p className="text-xs font-bold text-gray-500">Punto de venta</p><p className="text-lg font-black text-gray-900">{pesos(vs.pos)}</p></div>
          <div><p className="text-xs font-bold text-gray-500">Tienda web (pagado)</p><p className="text-lg font-black text-gray-900">{pesos(vs.web)}</p></div>
          <div><p className="text-xs font-bold text-gray-500">Con voucher (vale como boleta)</p><p className="text-lg font-black text-gray-900">{pesos(vs.conVoucher)}</p></div>
          <div><p className="text-xs font-bold text-gray-500">Necesitan boleta</p><p className="text-lg font-black text-amber-800">{pesos(vs.requierenBoleta)}</p></div>
        </div>
        {Object.keys(vs.porMedio).length > 0 && (
          <p className="mt-3 text-xs text-gray-600">
            {Object.entries(vs.porMedio).map(([m, v]) => `${MEDIOS[m] ?? m}: ${pesos(v)}`).join(" · ")}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Lo pagado con tarjeta o MercadoPago ya tiene voucher, que vale como boleta. Efectivo, transferencia y fiado
          necesitan boleta emitida (en el SII o desde aquí). Las ventas de Uber Eats no se registran en este sistema.
        </p>
      </Tarjeta>

      {!libro.cerrado && (
        <Tarjeta titulo="Ajustes del mes">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo etiqueta="Tasa PPM (%)" ayuda={libro.tasaPpmOrigen === "configuracion" ? `Vacío = la general (${String(libro.estimado.tasaPpm).replace(".", ",")}%)` : "Propia de este mes"}>
              <input value={ajustes.tasa_ppm} onChange={(e) => setAjustes({ ...ajustes, tasa_ppm: e.target.value })} inputMode="decimal" className={claseInput} placeholder={String(libro.estimado.tasaPpm)} />
            </Campo>
            <Campo
              etiqueta="Remanente del mes anterior"
              ayuda={
                libro.remanenteOrigen === "mes_anterior"
                  ? "Viene del mes anterior cerrado"
                  : libro.remanenteOrigen === "manual"
                    ? "Anotado a mano"
                    : "Cópialo del código 77 de tu último F29"
              }
            >
              <input value={ajustes.remanente_anterior} onChange={(e) => setAjustes({ ...ajustes, remanente_anterior: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={claseInput} placeholder={String(libro.estimado.remanenteAnterior)} />
            </Campo>
            <Campo etiqueta="Impuesto único retenido" ayuda="Sólo si algún sueldo supera 13,5 UTM">
              <input value={ajustes.retencion_impuesto_unico} onChange={(e) => setAjustes({ ...ajustes, retencion_impuesto_unico: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={claseInput} placeholder="0" />
            </Campo>
          </div>
          <div className="mt-3 flex justify-end">
            <Boton variante="suave" onClick={() => accion("guardar")} cargando={guardando}>Guardar ajustes</Boton>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
