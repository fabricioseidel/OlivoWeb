"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpenIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useBranch } from "@/contexts/BranchContext";
import { useToast } from "@/contexts/ToastContext";
import { PageShell, HeroHeader, StatsRow, StatsCard, EmptyState } from "@/components/admin/shell";
import OlivoButton from "@/components/OlivoButton";
import { descargarCierreMensual } from "@/lib/print/cierreMensual";
import type { CierreListado } from "@/server/cierre.service";
import type { CierreResumen, CustomerBalance } from "@/lib/cierre/types";

const clp = (n: number | null | undefined) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** El día se parte a mano: `new Date("2026-09-10")` es UTC y en Chile retrocede uno. */
function etiquetaDia(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} ${
    ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][dt.getDay()]
  }`;
}

const rangoDelMes = (anio: number, mes: number) => {
  const ultimo = new Date(anio, mes, 0).getDate();
  const mm = String(mes).padStart(2, "0");
  return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${ultimo}` };
};

export default function CierresPage() {
  const { branches } = useBranch();
  const { showToast } = useToast();

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [cierres, setCierres] = useState<CierreListado[]>([]);
  const [deudas, setDeudas] = useState<CustomerBalance[]>([]);
  const [detalle, setDetalle] = useState<CierreResumen | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { desde, hasta } = rangoDelMes(anio, mes);
      const [resCierres, resDeudas] = await Promise.all([
        fetch(`/api/admin/cierres?desde=${desde}&hasta=${hasta}`, { cache: "no-store" }),
        fetch("/api/admin/cuentas?conDeuda=1", { cache: "no-store" }),
      ]);
      setCierres(resCierres.ok ? ((await resCierres.json()).cierres ?? []) : []);
      setDeudas(resDeudas.ok ? ((await resDeudas.json()).cuentas ?? []) : []);
    } catch {
      showToast("No se pudieron cargar los cierres", "error");
    } finally {
      setLoading(false);
    }
  }, [anio, mes, showToast]);

  useEffect(() => { void cargar(); }, [cargar]);

  const totales = useMemo(() => {
    const de = (c: CierreListado, k: "CASH" | "TRANSFER" | "CARD") =>
      Number(c.declared_totals?.[k]?.ventas ?? 0);
    return {
      efectivo: cierres.reduce((a, c) => a + de(c, "CASH"), 0),
      transferencia: cierres.reduce((a, c) => a + de(c, "TRANSFER"), 0),
      tarjeta: cierres.reduce((a, c) => a + de(c, "CARD"), 0),
      ventas: cierres.reduce((a, c) => a + Number(c.declared_totals?.total_ventas ?? 0), 0),
      fiado: cierres.reduce((a, c) => a + Number(c.declared_totals?.fiados_otorgados ?? 0), 0),
    };
  }, [cierres]);

  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mes - 1 + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth() + 1);
    setDetalle(null);
  };

  const verDetalle = async (id: string) => {
    const res = await fetch(`/api/admin/cierres?shiftId=${id}`, { cache: "no-store" });
    if (!res.ok) return showToast("No se pudo abrir el cierre", "error");
    setDetalle((await res.json()).resumen);
  };

  const nombreLocal = (id: string | null) =>
    branches.find((b) => b.id === id)?.name ?? "—";

  const descargar = async () => {
    if (cierres.length === 0) return showToast("No hay cierres en el mes", "error");
    await descargarCierreMensual({
      anio, mes,
      local: branches.length > 1 ? "Todos los locales" : (branches[0]?.name ?? "Olivomarket"),
      cierres, deudas,
    });
    showToast("PDF del mes descargado ✓", "success");
  };

  return (
    <PageShell
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Libro de caja" }]}
      hero={
        <HeroHeader
          kicker="Caja"
          title="Libro de caja"
          subtitle="Los cierres se hacen en el celular. Acá se revisan, se corrigen y se imprime el mes."
          icon={<BookOpenIcon className="h-6 w-6" />}
          right={
            <OlivoButton onClick={descargar} disabled={cierres.length === 0}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              PDF del mes
            </OlivoButton>
          }
        />
      }
    >
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-gray-900 capitalize w-44 text-center">
          {MESES[mes - 1]} {anio}
        </span>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <StatsRow>
        <StatsCard label="Ventas del mes" value={clp(totales.ventas)} tone="brand" />
        <StatsCard label="Efectivo" value={clp(totales.efectivo)} />
        <StatsCard label="Transferencia" value={clp(totales.transferencia)} />
        <StatsCard label="Tarjeta" value={clp(totales.tarjeta)} />
        <StatsCard
          label="Fiado entregado"
          value={clp(totales.fiado)}
          tone="amber"
          hint="No entra en las ventas: no es venta hasta que se paga"
        />
      </StatsRow>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Cargando…</p>
      ) : cierres.length === 0 ? (
        <EmptyState
          title="Sin cierres este mes"
          description="Los cierres se registran desde el POS en el celular, al terminar el día."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Día</th>
                <th className="px-4 py-3 font-semibold">Local</th>
                <th className="px-4 py-3 font-semibold text-right">Efectivo</th>
                <th className="px-4 py-3 font-semibold text-right">Transfer.</th>
                <th className="px-4 py-3 font-semibold text-right">Tarjeta</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Fiado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cierres.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => void verDetalle(c.id)}
                  className="cursor-pointer hover:bg-brand-50/40"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{etiquetaDia(c.business_date)}</td>
                  <td className="px-4 py-3 text-gray-500">{nombreLocal(c.branch_id)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{clp(c.declared_totals?.CASH?.ventas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{clp(c.declared_totals?.TRANSFER?.ventas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{clp(c.declared_totals?.CARD?.ventas)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {clp(c.declared_totals?.total_ventas)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                    {Number(c.declared_totals?.fiados_otorgados ?? 0) > 0
                      ? clp(c.declared_totals?.fiados_otorgados)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold text-gray-900">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Total del mes</td>
                <td className="px-4 py-3 text-right tabular-nums">{clp(totales.efectivo)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{clp(totales.transferencia)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{clp(totales.tarjeta)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{clp(totales.ventas)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-amber-700">{clp(totales.fiado)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {detalle && <DetalleCierre resumen={detalle} onClose={() => setDetalle(null)} />}
    </PageShell>
  );
}

// ── Detalle de un día ──────────────────────────────────────────────────────
function DetalleCierre({ resumen, onClose }: { resumen: CierreResumen; onClose: () => void }) {
  const t = resumen.shift.declared_totals;
  const cargos = resumen.account_entries.filter((e) => e.kind === "CHARGE");
  const abonos = resumen.account_entries.filter((e) => e.kind === "PAYMENT");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">{resumen.branch ?? "Local"}</p>
            <h2 className="text-xl font-bold text-gray-900">{etiquetaDia(resumen.shift.business_date)}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">
            Cerrar
          </button>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Efectivo", t?.CASH.ventas],
            ["Transferencia", t?.TRANSFER.ventas],
            ["Tarjeta", t?.CARD.ventas],
            ["Total ventas", t?.total_ventas],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-gray-50 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="text-base font-bold text-gray-900 tabular-nums">{clp(Number(value ?? 0))}</dd>
            </div>
          ))}
        </dl>

        <Seccion titulo={`Efectivo contado — ${clp(resumen.shift.actual_cash)}`}>
          <p className="text-xs text-gray-500">
            Sencillo inicial {clp(resumen.shift.starting_cash)} · ventas en efectivo{" "}
            {clp(t?.CASH.ventas ?? 0)}
          </p>
          {resumen.denominations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {resumen.denominations.map((d) => (
                <span key={d.denomination} className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {d.denomination.toLocaleString("es-CL")} × {d.quantity}
                </span>
              ))}
            </div>
          )}
        </Seccion>

        {resumen.transfers.length > 0 && (
          <Seccion titulo={`Transferencias (${resumen.transfers.length})`}>
            <ul className="space-y-1 text-sm">
              {resumen.transfers.map((tr, i) => (
                <li key={tr.id} className="flex justify-between">
                  <span className="text-gray-500">{tr.payer || `#${i + 1}`}</span>
                  <span className="font-medium tabular-nums">{clp(tr.amount)}</span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {resumen.vouchers.length > 0 && (
          <Seccion titulo={`Vouchers de máquina (${resumen.vouchers.length})`}>
            <ul className="space-y-2 text-sm">
              {resumen.vouchers.map((v) => {
                const desc = Number(v.total_amount) - Number(v.parts_total);
                return (
                  <li key={v.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Terminal {v.terminal_code || "—"}</span>
                      <span className="font-bold tabular-nums">{clp(v.total_amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 tabular-nums">
                      Créd {clp(v.credit_amount)} · Déb {clp(v.debit_amount)} · Prep {clp(v.prepaid_amount)}
                    </p>
                    {Math.abs(desc) > 0.5 && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        El desglose no suma el total: diferencia de {clp(Math.abs(desc))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Seccion>
        )}

        {cargos.length > 0 && (
          <Seccion titulo={`Fiado entregado — ${clp(t?.fiados_otorgados ?? 0)}`}>
            <ul className="space-y-1 text-sm">
              {cargos.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span className="text-gray-500">{c.name}</span>
                  <span className="font-medium tabular-nums text-amber-700">{clp(c.amount)}</span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {abonos.length > 0 && (
          <Seccion titulo={`Abonos recibidos — ${clp(t?.abonos_recibidos ?? 0)}`}>
            <ul className="space-y-1 text-sm">
              {abonos.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span className="text-gray-500">{a.name}</span>
                  <span className="font-medium tabular-nums">{clp(a.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-400">
              Los abonos no suman a las ventas del día: la venta se contó cuando se entregó la
              mercadería.
            </p>
          </Seccion>
        )}

        {resumen.shift.notes && (
          <Seccion titulo="Observaciones">
            <p className="text-sm text-gray-600">{resumen.shift.notes}</p>
          </Seccion>
        )}

        {resumen.shift.pos_totals && Object.keys(resumen.shift.pos_totals).length > 0 && (
          <Seccion titulo="Lo que registró el POS">
            <ul className="space-y-1 text-sm">
              {Object.entries(resumen.shift.pos_totals).map(([metodo, monto]) => (
                <li key={metodo} className="flex justify-between">
                  <span className="text-gray-500">{metodo}</span>
                  <span className="font-medium tabular-nums">{clp(monto)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-400">
              Comparación contra lo declarado. Mientras el POS no registre todas las ventas, la
              diferencia es esperable y no indica un descuadre de caja.
            </p>
          </Seccion>
        )}
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-100 pt-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{titulo}</h3>
      {children}
    </section>
  );
}
