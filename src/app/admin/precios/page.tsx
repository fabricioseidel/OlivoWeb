"use client";

/**
 * Taller de precios y costos.
 *
 * El cuello de botella del catálogo no es técnico sino de digitación: al
 * 2026-08-30 había 458 productos activos sin proveedor y 64 con stock y precio
 * $0. Cargarlos por la ficha de cada producto son cientos de navegaciones, y
 * por eso no avanzaba.
 *
 * Acá se escriben todos seguidos, como en una planilla, con el margen
 * calculándose a medida que se teclea y un solo guardado al final. La
 * aritmética no vive acá: sale de `pricing.ts`, para que la grilla y el
 * checkout no puedan discrepar.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsCard,
  StatsRow,
  TabNav,
  EmptyState,
  type Tab,
} from "@/components/admin/shell";
import { calcularFilaCosto, formatearMargen } from "@/lib/pricing";

type Fila = {
  barcode: string;
  nombre: string | null;
  categoria: string | null;
  stock: number;
  precioVenta: number | null;
  precioRevisado: boolean;
  proveedorId: string | null;
  proveedorNombre: string | null;
  costoNeto: number | null;
  packSize: number | null;
  tasa: number;
  margenObjetivo: number;
  costoUnitarioBruto: number | null;
  margenActual: number | null;
  precioSugerido: number | null;
  aPerdida: boolean;
};

type Totales = {
  activos: number;
  sinPrecio: number;
  sinPrecioConStock: number;
  sinProveedor: number;
  sinCosto: number;
  aPerdida: number;
};

/** Lo que el usuario tecleó en una fila y todavía no se guardó. */
type Edicion = {
  precioVenta?: string;
  costoBulto?: string;
  unidadesPorBulto?: string;
  proveedorId?: string;
};

const clp = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("es-CL")}`;

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function TallerPreciosPage() {
  const { showToast } = useToast();

  const [pendiente, setPendiente] = useState("sin-precio");
  const [conStock, setConStock] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [proveedores, setProveedores] = useState<{ id: string; name: string }[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});

  /** Proveedor que se aplica a las filas que no tengan uno propio. */
  const [proveedorPorDefecto, setProveedorPorDefecto] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ pendiente });
      if (conStock) params.set("conStock", "1");
      if (busqueda.trim()) params.set("q", busqueda.trim());

      const r = await fetch(`/api/admin/taller-precios?${params}`);
      if (!r.ok) throw new Error("No se pudo cargar");
      const d = await r.json();
      setFilas(d.filas ?? []);
      setProveedores(d.proveedores ?? []);
      setTotales(d.totales ?? null);
    } catch {
      showToast("No pudimos cargar el catálogo", "error");
    } finally {
      setCargando(false);
    }
  }, [pendiente, conStock, busqueda, showToast]);

  // La búsqueda espera a que se deje de teclear; el filtro y el stock no, que
  // son un clic y se esperan inmediatos.
  const primeraCarga = useRef(true);
  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      cargar();
      return;
    }
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const editar = (barcode: string, campo: keyof Edicion, valor: string) =>
    setEdiciones((prev) => ({ ...prev, [barcode]: { ...prev[barcode], [campo]: valor } }));

  /**
   * Lo que va a mostrar la fila, con lo tecleado ya aplicado.
   *
   * Se recalcula con la misma función que usa el servidor al guardar, así que
   * el margen que se ve mientras se escribe es el que va a quedar.
   */
  const proyectar = (f: Fila) => {
    const e = ediciones[f.barcode] ?? {};
    const costoBulto = num(e.costoBulto);
    const unidades = num(e.unidadesPorBulto);
    const precio = num(e.precioVenta);

    // Las unidades por bulto se aplican también sobre el costo YA guardado, no
    // sólo sobre uno nuevo. Es el caso de arreglar un producto a pérdida: el
    // costo está bien cargado en la factura, lo que falta es declarar que ese
    // número era el del pack. Exigir reescribir el costo para poder corregir
    // el bulto dejaba ese arreglo fuera de la grilla.
    const costoBase = costoBulto ?? f.costoNeto;
    const calc = calcularFilaCosto({
      costoBulto: costoBase,
      unidadesPorBulto: unidades ?? 1,
      precioVenta: precio ?? f.precioVenta,
      tasa: f.tasa,
      margen: f.margenObjetivo,
    });

    const proveedorId = e.proveedorId ?? f.proveedorId ?? proveedorPorDefecto ?? "";
    const tocada =
      precio !== null ||
      costoBulto !== null ||
      unidades !== null ||
      (e.proveedorId != null && e.proveedorId !== "");

    return { ...calc, precio: precio ?? f.precioVenta, costoBase, proveedorId, tocada };
  };

  const pendientesDeGuardar = useMemo(
    () => filas.filter((f) => proyectar(f).tocada).length,
    // `ediciones` es lo que cambia; `filas` sólo al recargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filas, ediciones, proveedorPorDefecto]
  );

  const guardar = async () => {
    const aGuardar = filas
      .map((f) => ({ f, p: proyectar(f) }))
      .filter(({ p }) => p.tocada)
      .map(({ f, p }) => {
        const e = ediciones[f.barcode] ?? {};
        return {
          barcode: f.barcode,
          precioVenta: num(e.precioVenta),
          // `costoBase` incluye el costo ya guardado, para que corregir sólo
          // las unidades por bulto alcance para recalcularlo.
          costoBulto: p.costoBase,
          unidadesPorBulto: num(e.unidadesPorBulto) ?? 1,
          proveedorId: p.proveedorId || null,
        };
      });

    if (aGuardar.length === 0) {
      showToast("No hay cambios para guardar", "info");
      return;
    }

    setGuardando(true);
    try {
      const r = await fetch("/api/admin/taller-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filas: aGuardar }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "No se pudo guardar");

      if (d.fallidas?.length) {
        // Las que fallaron se quedan escritas en pantalla para poder
        // corregirlas: perder lo tecleado sería peor que el error.
        const okBarcodes = new Set(
          d.resultados.filter((x: any) => x.ok).map((x: any) => x.barcode)
        );
        setEdiciones((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([b]) => !okBarcodes.has(b)))
        );
        showToast(
          `Se guardaron ${d.guardadas}. ${d.fallidas.length} quedaron con error: ${d.fallidas[0].error}`,
          "error"
        );
      } else {
        setEdiciones({});
        showToast(`Se guardaron ${d.guardadas} productos`, "success");
      }
      await cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const tabs: Tab[] = [
    { key: "sin-precio", label: "Sin precio", count: totales?.sinPrecioConStock },
    { key: "a-perdida", label: "A pérdida", count: totales?.aPerdida },
    { key: "sin-costo", label: "Sin costo", count: totales?.sinCosto },
    { key: "sin-proveedor", label: "Sin proveedor", count: totales?.sinProveedor },
    { key: "todos", label: "Todos" },
  ];

  return (
    <PageShell
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Precios y costos" }]}
      hero={
        <HeroHeader
          kicker="Catálogo"
          title="Precios y costos"
          subtitle="Cargá el costo y el precio de varios productos seguidos. El margen se calcula mientras escribís."
          icon={<BanknotesIcon className="size-7" />}
        />
      }
      tabs={<TabNav tabs={tabs} value={pendiente} onChange={setPendiente} />}
    >
      <StatsRow>
        <StatsCard
          label="Sin precio, con stock"
          value={totales?.sinPrecioConStock ?? "—"}
          tone="rose"
          hint="Están en góndola pero no se pueden vender por la web"
          icon={<ExclamationTriangleIcon className="size-5" />}
        />
        <StatsCard
          label="Se venden a pérdida"
          value={totales?.aPerdida ?? "—"}
          tone="amber"
          hint="Casi siempre es el costo del bulto cargado como unitario"
          icon={<ExclamationTriangleIcon className="size-5" />}
        />
        <StatsCard
          label="Sin proveedor"
          value={totales?.sinProveedor ?? "—"}
          tone="sky"
          hint="No se les puede calcular margen ni reponer"
          icon={<TruckIcon className="size-5" />}
        />
        <StatsCard
          label="Productos activos"
          value={totales?.activos ?? "—"}
          icon={<CheckCircleIcon className="size-5" />}
        />
      </StatsRow>

      <div className="o-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="buscar" className="mb-1 block text-sm font-medium text-neutral-700">
              Buscar
            </label>
            <input
              id="buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o código de barras"
              className="w-full rounded-xl border border-gray-500 px-3 py-2 text-[15px]"
            />
          </div>

          <div className="sm:w-72">
            <label htmlFor="prov" className="mb-1 block text-sm font-medium text-neutral-700">
              Proveedor para las filas nuevas
            </label>
            <select
              id="prov"
              value={proveedorPorDefecto}
              onChange={(e) => setProveedorPorDefecto(e.target.value)}
              className="w-full rounded-xl border border-gray-500 px-3 py-2 text-[15px]"
            >
              <option value="">Elegí uno…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={conStock}
              onChange={(e) => setConStock(e.target.checked)}
              className="size-4"
            />
            Sólo con stock
          </label>
        </div>

        {/* El aviso del proveedor va acá y no en un tooltip: sin proveedor el
            costo no se puede guardar, y enterarse recién al apretar guardar
            después de cargar treinta filas es la peor forma de saberlo. */}
        {!proveedorPorDefecto && pendiente !== "sin-precio" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Elegí un proveedor arriba antes de cargar costos: sin proveedor el costo no se
            puede guardar.
          </p>
        )}
      </div>

      {cargando ? (
        <div className="o-card p-10 text-center text-neutral-500">Cargando…</div>
      ) : filas.length === 0 ? (
        <EmptyState
          title="No queda nada pendiente acá"
          description="Probá con otra pestaña o quitá el filtro de stock."
        />
      ) : (
        <div className="o-card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold text-neutral-700">Producto</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">Proveedor</th>
                <th className="px-3 py-2 text-right font-semibold text-neutral-700">
                  Costo factura
                </th>
                <th className="px-3 py-2 text-right font-semibold text-neutral-700">
                  Unid. x bulto
                </th>
                <th className="px-3 py-2 text-right font-semibold text-neutral-700">
                  Costo c/IVA
                </th>
                <th className="px-3 py-2 text-right font-semibold text-neutral-700">Precio</th>
                <th className="px-3 py-2 text-right font-semibold text-neutral-700">Margen</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const p = proyectar(f);
                const e = ediciones[f.barcode] ?? {};
                return (
                  <tr
                    key={f.barcode}
                    className={`border-b border-neutral-100 ${p.tocada ? "bg-brand-50/50" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-neutral-900">{f.nombre ?? f.barcode}</div>
                      <div className="tabular text-xs text-neutral-500">
                        {f.barcode} · stock {f.stock}
                        {f.categoria ? ` · ${f.categoria}` : ""}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <select
                        aria-label={`Proveedor de ${f.nombre ?? f.barcode}`}
                        value={p.proveedorId}
                        onChange={(ev) => editar(f.barcode, "proveedorId", ev.target.value)}
                        className="w-40 rounded-lg border border-gray-500 px-2 py-1.5"
                      >
                        <option value="">—</option>
                        {proveedores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        aria-label={`Costo de factura de ${f.nombre ?? f.barcode}`}
                        inputMode="decimal"
                        value={e.costoBulto ?? ""}
                        onChange={(ev) => editar(f.barcode, "costoBulto", ev.target.value)}
                        placeholder={f.costoNeto != null ? String(Math.round(f.costoNeto)) : "neto"}
                        className="tabular w-24 rounded-lg border border-gray-500 px-2 py-1.5 text-right"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        aria-label={`Unidades por bulto de ${f.nombre ?? f.barcode}`}
                        inputMode="numeric"
                        value={e.unidadesPorBulto ?? ""}
                        onChange={(ev) => editar(f.barcode, "unidadesPorBulto", ev.target.value)}
                        placeholder={f.packSize ? String(f.packSize) : "1"}
                        className="tabular w-20 rounded-lg border border-gray-500 px-2 py-1.5 text-right"
                      />
                    </td>

                    <td className="tabular px-3 py-2 text-right text-neutral-700">
                      {clp(p.costoUnitarioBruto)}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        aria-label={`Precio de venta de ${f.nombre ?? f.barcode}`}
                        inputMode="numeric"
                        value={e.precioVenta ?? ""}
                        onChange={(ev) => editar(f.barcode, "precioVenta", ev.target.value)}
                        placeholder={
                          f.precioVenta ? String(Math.round(f.precioVenta)) : "sin precio"
                        }
                        className="tabular w-24 rounded-lg border border-gray-500 px-2 py-1.5 text-right"
                      />
                      {/* El sugerido es un botón y no un texto: verlo sin
                          poder aplicarlo obliga a copiarlo a mano. */}
                      {p.precioSugerido != null && p.precioSugerido !== p.precio && (
                        <button
                          type="button"
                          onClick={() =>
                            editar(f.barcode, "precioVenta", String(p.precioSugerido))
                          }
                          className="mt-1 block w-full text-right text-xs text-brand-texto underline"
                        >
                          usar {clp(p.precioSugerido)}
                        </button>
                      )}
                    </td>

                    <td
                      className={`tabular px-3 py-2 text-right font-medium ${
                        p.aPerdida
                          ? "text-rose-700"
                          : p.margenActual != null && p.margenActual < f.margenObjetivo
                            ? "text-amber-700"
                            : "text-neutral-800"
                      }`}
                    >
                      {p.margenActual == null ? "—" : formatearMargen(p.margenActual)}
                      {p.aPerdida && <div className="text-xs font-normal">bajo costo</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra fija: con la grilla larga, un botón al final del scroll obliga a
          bajar 400 filas para guardar. */}
      {pendientesDeGuardar > 0 && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <p className="text-sm text-neutral-700">
            <strong>{pendientesDeGuardar}</strong>{" "}
            {pendientesDeGuardar === 1 ? "producto editado" : "productos editados"}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEdiciones({})} disabled={guardando}>
              Descartar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
