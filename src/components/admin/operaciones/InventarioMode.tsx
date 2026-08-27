"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import UnifiedScanner from "@/components/admin/scanner/UnifiedScanner";
import QuickCreateProductModal from "@/components/admin/pos/QuickCreateProductModal";
import { useToast } from "@/contexts/ToastContext";

type Escaneado = {
  barcode: string;
  name: string;
  nuevo: boolean; // recién activado o creado en esta sesión
};

type Candidato = {
  barcode: string;
  name: string;
  sale_price: number | null;
  is_active: boolean;
  verified_at: string | null;
};

type Resumen = { verificados: number; seDesactivarian: number; total: number };

/**
 * Verificación de inventario por escaneo.
 *
 * Regla: un producto queda activo si fue verificado (escaneado) alguna vez.
 * Por eso no hay lógica especial por sesión — la primera pasada deja activo
 * sólo lo escaneado y las siguientes suman, sin apagar lo ya verificado.
 */
export default function InventarioMode() {
  const { showToast } = useToast();
  const [procesando, setProcesando] = useState(false);
  const [escaneados, setEscaneados] = useState<Escaneado[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  // Flujo cuando el código no existe: buscar por nombre, luego crear
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [crearConCodigo, setCrearConCodigo] = useState<string | null>(null);

  const ultimoCodigo = useRef<string>("");

  const cargarResumen = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventario/resumen", { cache: "no-store" });
      if (res.ok) setResumen(await res.json());
    } catch {
      /* el resumen es informativo; si falla no bloquea el escaneo */
    }
  }, []);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const registrar = useCallback(
    (barcode: string, name: string, nuevo: boolean) => {
      setEscaneados((prev) => {
        if (prev.some((e) => e.barcode === barcode)) return prev; // sin duplicados
        return [{ barcode, name, nuevo }, ...prev];
      });
    },
    []
  );

  const verificar = useCallback(
    async (barcode: string) => {
      if (procesando) return;
      setProcesando(true);
      try {
        const res = await fetch("/api/admin/inventario/verificar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al verificar");

        if (!data.found) {
          // No existe por código: se ofrece buscar por nombre o crearlo
          setCodigoNoEncontrado(barcode);
          setBusqueda("");
          setCandidatos([]);
          return;
        }

        registrar(barcode, data.name, Boolean(data.recienActivado));
        showToast(
          data.recienActivado ? `✓ Activado: ${data.name}` : `✓ ${data.name}`,
          "success"
        );
        cargarResumen();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Error al verificar", "error");
      } finally {
        setProcesando(false);
      }
    },
    [procesando, registrar, showToast, cargarResumen]
  );

  const onDetected = useCallback(
    (code: string) => {
      const limpio = code.trim();
      if (!limpio || limpio === ultimoCodigo.current) return;
      ultimoCodigo.current = limpio;
      // Permite volver a escanear el mismo código después de un momento
      setTimeout(() => {
        if (ultimoCodigo.current === limpio) ultimoCodigo.current = "";
      }, 1500);
      verificar(limpio);
    },
    [verificar]
  );

  const buscarPorNombre = useCallback(async (q: string) => {
    setBusqueda(q);
    if (q.trim().length < 2) {
      setCandidatos([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/admin/inventario/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCandidatos(data.productos ?? []);
    } catch {
      setCandidatos([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Resumen del catálogo */}
      {resumen && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
            <p className="text-2xl font-black text-brand-400">{resumen.verificados}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5">
              Verificados
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
            <p className="text-2xl font-black text-amber-400">{resumen.seDesactivarian}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5">
              Sin verificar
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
            <p className="text-2xl font-black text-white/70">{resumen.total}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5">
              Total
            </p>
          </div>
        </div>
      )}

      <UnifiedScanner onDetected={onDetected} isProcessing={procesando} />

      {/* Código sin coincidencia: buscar por nombre o crear */}
      {codigoNoEncontrado && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-200">
                El código {codigoNoEncontrado} no existe
              </p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Búscalo por nombre: puede estar cargado con otro código.
              </p>
            </div>
            <button
              onClick={() => setCodigoNoEncontrado(null)}
              className="text-white/30 hover:text-white text-xs font-black"
            >
              ✕
            </button>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => buscarPorNombre(e.target.value)}
              placeholder="Nombre del producto…"
              className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
            />
          </div>

          {buscando && (
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Buscando…</p>
          )}

          {candidatos.length > 0 && (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {candidatos.map((c) => (
                <li key={c.barcode}>
                  <button
                    onClick={async () => {
                      await verificar(c.barcode);
                      setCodigoNoEncontrado(null);
                    }}
                    className="w-full text-left bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/10 transition-colors"
                  >
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                      {c.barcode}
                      {!c.is_active && " · inactivo"}
                      {c.verified_at && " · ya verificado"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {busqueda.trim().length >= 2 && !buscando && candidatos.length === 0 && (
            <p className="text-xs text-white/40">Sin coincidencias por nombre.</p>
          )}

          <button
            onClick={() => setCrearConCodigo(codigoNoEncontrado)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-brand-500 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Crear producto nuevo
          </button>
        </div>
      )}

      {/* Escaneados en esta sesión */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Escaneados ahora ({escaneados.length})
          </p>
          <button
            onClick={cargarResumen}
            className="text-white/30 hover:text-white/70"
            title="Actualizar resumen"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        {escaneados.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-6">
            Escanea un producto para marcarlo como disponible en la tienda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {escaneados.map((e) => (
              <li
                key={e.barcode}
                className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10"
              >
                <CheckCircleIcon className="w-5 h-5 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{e.name}</p>
                  <p className="text-[10px] text-white/40 font-mono">{e.barcode}</p>
                </div>
                {e.nuevo && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-400 shrink-0">
                    Activado
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cierre de inventario: apaga lo nunca verificado. Deliberadamente
          separado y con confirmación — puede desactivar productos que sí están
          en la tienda pero aún no se alcanzaron a escanear. */}
      {resumen && resumen.seDesactivarian > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 mt-6">
          <p className="text-sm font-black text-red-300">Cerrar inventario</p>
          <p className="text-xs text-red-200/70 leading-relaxed">
            Desactiva los <strong>{resumen.seDesactivarian}</strong> productos que siguen activos
            pero nunca se han escaneado. Úsalo cuando termines de recorrer la tienda: lo que no
            escaneaste se considera no disponible.
          </p>
          <button
            onClick={async () => {
              const ok = window.confirm(
                `Se van a desactivar ${resumen.seDesactivarian} productos que nunca fueron escaneados.\n\n` +
                  `Los ${resumen.verificados} ya verificados no se tocan.\n\n` +
                  `¿Continuar?`
              );
              if (!ok) return;
              try {
                const res = await fetch("/api/admin/inventario/resumen", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ esperado: resumen.seDesactivarian }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Error al cerrar inventario");
                showToast(`${data.desactivados} productos desactivados`, "success");
                cargarResumen();
              } catch (e) {
                showToast(e instanceof Error ? e.message : "Error al cerrar", "error");
              }
            }}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 transition-colors"
          >
            Desactivar {resumen.seDesactivarian} no escaneados
          </button>
        </div>
      )}

      {crearConCodigo && (
        <QuickCreateProductModal
          initialBarcode={crearConCodigo}
          onClose={() => setCrearConCodigo(null)}
          onCreated={(p) => {
            // Los productos creados acá ya están verificados: alguien los tiene
            // en la mano. Se marca igual para que la purga no los apague.
            verificar(p.id);
            registrar(p.id, p.name, true);
            setCrearConCodigo(null);
            setCodigoNoEncontrado(null);
          }}
        />
      )}
    </div>
  );
}
