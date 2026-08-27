"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { formatCLP } from "@/utils/currency";
import { formatearMargen } from "@/lib/pricing";
import MargenesCategoria from "./MargenesCategoria";
import ReglaVentaWeb from "./ReglaVentaWeb";
import type { FilaPrecio, FotoPrecios, MotivoPrecio } from "@/server/pricing.service";

const CLP = formatCLP;

/**
 * Pantalla de precios.
 *
 * Responde la pregunta que antes obligaba a abrir producto por producto: qué
 * deja realmente cada uno al precio que tiene puesto. El orden ya viene del
 * servidor con lo que pierde plata arriba, así que lo primero que se ve es lo
 * primero que hay que arreglar.
 *
 * El precio propuesto se puede editar antes de aplicarlo: la fórmula es una
 * sugerencia, no una orden — hay productos que se venden bajo margen a
 * propósito para atraer gente, y para esos existe "Está bien así".
 */

type Filtro = MotivoPrecio | "todos";

const FILTROS: { id: Filtro; etiqueta: string; explica: string }[] = [
  { id: "todos", etiqueta: "Todos", explica: "Todo el catálogo activo" },
  {
    id: "bajo-costo",
    etiqueta: "Vendiendo bajo el costo",
    explica: "El precio de venta no cubre lo que cuesta comprarlo. Cada venta pierde plata.",
  },
  {
    id: "bajo-margen",
    etiqueta: "Bajo margen",
    explica: "Deja menos de lo que pide la regla de su categoría.",
  },
  {
    id: "costo-cambio",
    etiqueta: "El costo cambió",
    explica: "El proveedor movió el precio después de la última revisión.",
  },
  {
    id: "sin-costo",
    etiqueta: "Sin costo",
    explica: "No hay costo de proveedor cargado, así que no se sabe cuánto deja.",
  },
  {
    id: "sin-revisar",
    etiqueta: "Sin revisar",
    explica: "El precio nunca se comparó contra su costo.",
  },
];

const TONO_MOTIVO: Record<MotivoPrecio, string> = {
  "bajo-costo": "bg-red-100 text-red-800 ring-red-200",
  "bajo-margen": "bg-amber-100 text-amber-800 ring-amber-200",
  "costo-cambio": "bg-blue-100 text-blue-800 ring-blue-200",
  "sin-costo": "bg-slate-100 text-slate-700 ring-slate-200",
  "sin-revisar": "bg-slate-100 text-slate-700 ring-slate-200",
};

const ETIQUETA_MOTIVO: Record<MotivoPrecio, string> = {
  "bajo-costo": "Pierde plata",
  "bajo-margen": "Bajo margen",
  "costo-cambio": "Costo cambió",
  "sin-costo": "Sin costo",
  "sin-revisar": "Sin revisar",
};

function Resumen({ foto }: { foto: FotoPrecios }) {
  const { resumen } = foto;
  const tarjetas = [
    { label: "Productos", valor: String(resumen.total), tono: "text-slate-900" },
    {
      label: "Pierden plata",
      valor: String(resumen.bajoCosto),
      tono: resumen.bajoCosto > 0 ? "text-red-600" : "text-slate-900",
    },
    {
      label: "Bajo margen",
      valor: String(resumen.bajoMargen),
      tono: resumen.bajoMargen > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      label: "Margen promedio",
      valor: formatearMargen(resumen.margenPromedio),
      tono: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tarjetas.map((t) => (
        <div key={t.label} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {t.label}
          </div>
          <div className={`mt-1 text-2xl font-black ${t.tono}`}>{t.valor}</div>
        </div>
      ))}
    </div>
  );
}

function Variacion({ fila }: { fila: FilaPrecio }) {
  if (fila.variacionCosto === null) return null;
  const subio = fila.variacionCosto > 0;
  const Icono = subio ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        subio ? "text-red-600" : "text-emerald-600"
      }`}
      title={
        fila.costoAnterior !== null
          ? `Antes costaba ${CLP(fila.costoAnterior)} sin IVA`
          : undefined
      }
    >
      <Icono className="h-3.5 w-3.5" />
      {subio ? "+" : ""}
      {(fila.variacionCosto * 100).toFixed(1).replace(".", ",")}%
    </span>
  );
}

function Fila({
  fila,
  onAplicar,
  onRevisado,
  ocupado,
}: {
  fila: FilaPrecio;
  onAplicar: (barcode: string, precio: number) => Promise<void>;
  onRevisado: (barcode: string) => Promise<void>;
  ocupado: boolean;
}) {
  const [editado, setEditado] = useState<string>("");
  const propuesto = editado !== "" ? Number(editado) : fila.sugerido;
  const puedeAplicar =
    propuesto !== null && Number.isFinite(propuesto) && propuesto > 0 && propuesto !== fila.precioVenta;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-gray-900">{fila.nombre}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
            <span className="font-mono">{fila.barcode}</span>
            {fila.categoria && <span>· {fila.categoria}</span>}
            {fila.proveedores.find((p) => p.preferido)?.supplierName && (
              <span>· {fila.proveedores.find((p) => p.preferido)!.supplierName}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fila.motivos.map((m) => (
              <span
                key={m}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${TONO_MOTIVO[m]}`}
              >
                {ETIQUETA_MOTIVO[m]}
              </span>
            ))}
            {fila.hayProveedorMasBarato && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                <TagIcon className="h-3 w-3" />
                Hay más barato
              </span>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-x-5 text-right">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Costo
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {fila.costoBruto !== null ? CLP(fila.costoBruto) : "—"}
            </div>
            <div className="text-[10px] text-gray-400">con IVA</div>
            <Variacion fila={fila} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Venta
            </div>
            <div className="text-sm font-semibold text-gray-900">{CLP(fila.precioVenta)}</div>
            {fila.precioOferta !== null && (
              <div className="text-[10px] text-amber-600">oferta {CLP(fila.precioOferta)}</div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Margen
            </div>
            <div
              className={`text-sm font-black ${
                fila.margenActual === null
                  ? "text-gray-400"
                  : fila.margenActual < 0
                    ? "text-red-600"
                    : fila.margenActual < fila.margenObjetivo
                      ? "text-amber-600"
                      : "text-emerald-600"
              }`}
            >
              {formatearMargen(fila.margenActual)}
            </div>
            <div
              className="text-[10px] text-gray-400"
              title={
                fila.origenMargen === "producto"
                  ? "Margen propio de este producto"
                  : fila.origenMargen === "categoria"
                    ? `Regla de ${fila.categoria}`
                    : "Margen general"
              }
            >
              meta {formatearMargen(fila.margenObjetivo)}
            </div>
          </div>
        </div>
      </div>

      {fila.sugerido !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <label className="text-xs text-gray-500">
            Precio propuesto
            <input
              type="number"
              min={1}
              value={editado !== "" ? editado : String(fila.sugerido)}
              onChange={(e) => setEditado(e.target.value)}
              className="ml-2 w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </label>
          {fila.diferencia !== null && fila.diferencia !== 0 && editado === "" && (
            <span
              className={`text-xs font-semibold ${
                fila.diferencia > 0 ? "text-emerald-600" : "text-gray-500"
              }`}
            >
              {fila.diferencia > 0 ? "+" : ""}
              {CLP(fila.diferencia)} sobre el actual
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => onRevisado(fila.barcode)}
              disabled={ocupado}
              className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
              title="Deja el precio como está y lo marca como revisado"
            >
              Está bien así
            </button>
            <button
              type="button"
              onClick={() => propuesto !== null && onAplicar(fila.barcode, propuesto)}
              disabled={ocupado || !puedeAplicar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
            >
              <CheckIcon className="h-4 w-4" />
              Aplicar
            </button>
          </div>
        </div>
      )}

      {fila.sugerido === null && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-slate-400" />
          Sin costo de proveedor no se puede proponer un precio. Cargalo en la
          ficha del producto o en Proveedores.
        </div>
      )}
    </div>
  );
}

const POR_PAGINA = 40;

export default function PreciosPanel() {
  const { showToast } = useToast();
  const [foto, setFoto] = useState<FotoPrecios | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("bajo-costo");
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/precios", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la foto de precios");
      setFoto(await res.json());
    } catch (error: any) {
      showToast(error.message || "Error cargando precios", "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Arrancar en el filtro que tenga algo que mostrar evita abrir la pantalla en
  // una lista vacía cuando no hay productos vendiéndose a pérdida.
  //
  // Sólo en la PRIMERA carga: cada vez que se aplica un precio la foto se
  // recalcula, y sin esta guarda el filtro saltaba solo. Alguien revisando la
  // lista de "sin revisar" aplicaba un precio y la pantalla lo mandaba a otro
  // filtro, perdiendo dónde iba.
  const [filtroElegido, setFiltroElegido] = useState(false);
  useEffect(() => {
    if (!foto || filtroElegido) return;
    if (foto.resumen.bajoCosto > 0) setFiltro("bajo-costo");
    else if (foto.resumen.bajoMargen > 0) setFiltro("bajo-margen");
    else if (foto.resumen.costoCambio > 0) setFiltro("costo-cambio");
    else setFiltro("todos");
    setFiltroElegido(true);
  }, [foto, filtroElegido]);

  const filtradas = useMemo(() => {
    if (!foto) return [];
    const texto = busqueda.trim().toLowerCase();
    return foto.filas.filter((f) => {
      if (filtro !== "todos" && !f.motivos.includes(filtro)) return false;
      if (!texto) return true;
      return (
        f.nombre.toLowerCase().includes(texto) ||
        f.barcode.includes(texto) ||
        (f.categoria ?? "").toLowerCase().includes(texto)
      );
    });
  }, [foto, filtro, busqueda]);

  useEffect(() => {
    setVisibles(POR_PAGINA);
  }, [filtro, busqueda]);

  const cuenta = useCallback(
    (id: Filtro) => {
      if (!foto) return 0;
      if (id === "todos") return foto.resumen.total;
      const mapa: Record<MotivoPrecio, number> = {
        "bajo-costo": foto.resumen.bajoCosto,
        "bajo-margen": foto.resumen.bajoMargen,
        "costo-cambio": foto.resumen.costoCambio,
        "sin-costo": foto.resumen.sinCosto,
        "sin-revisar": foto.resumen.sinRevisar,
      };
      return mapa[id];
    },
    [foto]
  );

  const guardar = useCallback(
    async (barcode: string, cuerpo: Record<string, unknown>, mensaje: string) => {
      setOcupado(barcode);
      try {
        const res = await fetch("/api/admin/precios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode, ...cuerpo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar");
        showToast(mensaje, "success");
        await cargar();
      } catch (error: any) {
        showToast(error.message || "Error guardando", "error");
      } finally {
        setOcupado(null);
      }
    },
    [cargar, showToast]
  );

  const aplicar = useCallback(
    (barcode: string, precio: number) =>
      guardar(barcode, { precio }, `Precio actualizado a ${CLP(precio)}`),
    [guardar]
  );

  const revisado = useCallback(
    (barcode: string) => guardar(barcode, { accion: "revisado" }, "Marcado como revisado"),
    [guardar]
  );

  const explicacion = FILTROS.find((f) => f.id === filtro)?.explica;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto, código o categoría…"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
        />
        <Button onClick={cargar} disabled={cargando} className="shrink-0">
          <ArrowPathIcon className={`mr-2 h-5 w-5 ${cargando ? "animate-spin" : ""}`} />
          {cargando ? "Calculando…" : "Recalcular"}
        </Button>
      </div>

      {foto && <Resumen foto={foto} />}

      <ReglaVentaWeb onCambio={cargar} />

      {foto && (
        <MargenesCategoria
          categorias={foto.categorias}
          margenes={foto.margenes}
          onCambio={cargar}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const n = cuenta(f.id);
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFiltro(f.id);
                setFiltroElegido(true);
              }}
              title={f.explica}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                activo
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.etiqueta}
              <span className={activo ? "text-white/60" : "text-gray-400"}>{n}</span>
            </button>
          );
        })}
      </div>

      {explicacion && <p className="text-xs text-gray-500">{explicacion}</p>}

      {cargando && !foto && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 ring-1 ring-gray-200">
          Calculando márgenes de todo el catálogo…
        </div>
      )}

      {foto && filtradas.length === 0 && (
        <div className="rounded-2xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-200">
          <div className="text-sm font-bold text-emerald-900">
            {busqueda ? "Ningún producto coincide con la búsqueda" : "Nada que revisar acá"}
          </div>
          {!busqueda && filtro !== "todos" && (
            <div className="mt-1 text-xs text-emerald-800/80">
              Ningún producto cae en este filtro.
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filtradas.slice(0, visibles).map((f) => (
          <Fila
            key={f.barcode}
            fila={f}
            onAplicar={aplicar}
            onRevisado={revisado}
            ocupado={ocupado === f.barcode}
          />
        ))}
      </div>

      {filtradas.length > visibles && (
        <button
          type="button"
          onClick={() => setVisibles((v) => v + POR_PAGINA)}
          className="w-full rounded-2xl bg-white py-3 text-sm font-bold uppercase tracking-wider text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          Ver {Math.min(POR_PAGINA, filtradas.length - visibles)} más
          <span className="ml-1 text-gray-400">de {filtradas.length}</span>
        </button>
      )}
    </div>
  );
}
