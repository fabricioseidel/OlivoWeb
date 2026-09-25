"use client";

/**
 * Trabajadores y estimación de lo que se paga en Previred.
 *
 * Sólo el dueño ve esta pestaña: tiene sueldos. El monto es una estimación
 * para separar la plata; el real lo calcula la planilla de Previred.
 */

import { useCallback, useEffect, useState } from "react";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/admin/shell";
import { useToast } from "@/contexts/ToastContext";
import { COMISIONES_AFP, TASAS_POR_DEFECTO, type TasasPrevisionales, type estimarImposiciones } from "@/lib/documentos/imposiciones";
import { formatearRut, rutValido } from "@/lib/documentos/rut";
import type { EmpleadoRow } from "@/server/documentos.service";
import { Cargando } from "./ResumenTab";
import { Boton, Campo, Modal, Tarjeta, claseInput, json, pedir, pesos } from "./ui";

type Datos = {
  empleados: EmpleadoRow[];
  estimacion: ReturnType<typeof estimarImposiciones>;
  tasas: TasasPrevisionales;
};

const NOMBRES_TASA: Record<keyof TasasPrevisionales, string> = {
  afp: "AFP obligatoria (trabajador)",
  salud: "Salud (trabajador)",
  cesantiaTrabajadorIndefinido: "Cesantía trabajador (indefinido)",
  cesantiaEmpleadorIndefinido: "Cesantía empleador (indefinido)",
  cesantiaEmpleadorPlazoFijo: "Cesantía empleador (plazo fijo)",
  mutual: "Mutual de seguridad",
  aporteEmpleador: "Aporte empleador reforma (Ley 21.735)",
  sis: "SIS aparte (si la planilla lo cobra)",
};

const vacio = {
  nombre: "",
  rut: "",
  cargo: "",
  tipo_contrato: "indefinido" as "indefinido" | "plazo_fijo",
  sueldo_imponible: "",
  afp: "",
  comision_afp: "",
  salud: "fonasa" as "fonasa" | "isapre",
  adicional_salud: "",
  activo: true,
};

export default function ImposicionesTab() {
  const { showToast } = useToast();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [editando, setEditando] = useState<EmpleadoRow | "nuevo" | null>(null);
  const [form, setForm] = useState(vacio);
  const [verTasas, setVerTasas] = useState(false);
  const [tasas, setTasas] = useState<TasasPrevisionales>(TASAS_POR_DEFECTO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d = await pedir<Datos>("/api/admin/documentos/empleados");
      setDatos(d);
      setTasas(d.tasas);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cargar", "error");
    }
  }, [showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = (e: EmpleadoRow | "nuevo") => {
    setEditando(e);
    setForm(
      e === "nuevo"
        ? vacio
        : {
            nombre: e.nombre,
            rut: e.rut ? formatearRut(e.rut) : "",
            cargo: e.cargo ?? "",
            tipo_contrato: e.tipo_contrato,
            sueldo_imponible: String(e.sueldo_imponible || ""),
            afp: e.afp ?? "",
            comision_afp: e.comision_afp != null ? String(e.comision_afp) : "",
            salud: e.salud,
            adicional_salud: e.adicional_salud ? String(e.adicional_salud) : "",
            activo: e.activo,
          },
    );
  };

  const guardar = async () => {
    if (form.rut && !rutValido(form.rut)) return showToast("El RUT no es válido", "error");
    setGuardando(true);
    try {
      const cuerpo = {
        nombre: form.nombre,
        rut: form.rut || null,
        cargo: form.cargo || null,
        tipo_contrato: form.tipo_contrato,
        sueldo_imponible: Number(form.sueldo_imponible) || 0,
        afp: form.afp || null,
        comision_afp: form.comision_afp ? Number(form.comision_afp.replace(",", ".")) : null,
        salud: form.salud,
        adicional_salud: Number(form.adicional_salud) || 0,
        activo: form.activo,
      };
      if (editando === "nuevo") await pedir("/api/admin/documentos/empleados", json("POST", cuerpo));
      else if (editando) await pedir(`/api/admin/documentos/empleados/${editando.id}`, json("PATCH", cuerpo));
      setEditando(null);
      showToast("Guardado", "success");
      cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!editando || editando === "nuevo") return;
    if (!window.confirm(`¿Borrar a ${editando.nombre}? Si dejó de trabajar, mejor desmárcalo como activo para conservar el registro.`)) return;
    try {
      await pedir(`/api/admin/documentos/empleados/${editando.id}`, { method: "DELETE" });
      setEditando(null);
      cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo borrar", "error");
    }
  };

  const guardarTasas = async () => {
    try {
      await pedir("/api/admin/documentos/configuracion", json("PUT", { tasas_previsionales: tasas }));
      showToast("Tasas guardadas", "success");
      cargar();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    }
  };

  if (!datos) return <Cargando />;
  const est = datos.estimacion;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tarjeta><p className="text-xs font-bold text-gray-500">Total Previred del mes</p><p className="text-2xl font-black text-gray-900">{pesos(est.totalPrevired)}</p></Tarjeta>
        <Tarjeta><p className="text-xs font-bold text-gray-500">Descontado a trabajadores</p><p className="text-2xl font-black text-gray-900">{pesos(est.trabajador)}</p></Tarjeta>
        <Tarjeta><p className="text-xs font-bold text-gray-500">Aporte de la empresa</p><p className="text-2xl font-black text-gray-900">{pesos(est.empleador)}</p></Tarjeta>
        <Tarjeta><p className="text-xs font-bold text-gray-500">Costo total del personal</p><p className="text-2xl font-black text-gray-900">{pesos(est.costoEmpresa)}</p></Tarjeta>
      </div>

      <Tarjeta
        titulo="Trabajadores"
        accion={<Boton onClick={() => abrir("nuevo")} icono={<PlusIcon className="h-4 w-4" />}>Agregar</Boton>}
      >
        {datos.empleados.length === 0 ? (
          <EmptyState
            icon={<UserGroupIcon className="h-7 w-7" />}
            title="Todavía no hay trabajadores cargados"
            description="Con el sueldo imponible de cada uno se estima cuánto pagar en Previred el día 13."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {datos.empleados.map((e) => {
              const d = est.detalle.find((x) => x.id === e.id);
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => abrir(e)} className="w-full flex flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-gray-50 rounded-xl px-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${e.activo ? "text-gray-900" : "text-gray-400 line-through"}`}>{e.nombre}</p>
                      <p className="text-xs text-gray-600">
                        {e.cargo ?? "Sin cargo"} · {e.tipo_contrato === "indefinido" ? "Indefinido" : "Plazo fijo"} · {e.afp ?? "AFP sin definir"} · {e.salud === "fonasa" ? "Fonasa" : "Isapre"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{pesos(e.sueldo_imponible)} imponible</p>
                      {d && <p className="text-xs text-gray-600">Previred {pesos(d.totalPrevired)} · líquido aprox. {pesos(d.liquidoAproximado)}</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Tasas usadas en la estimación"
        accion={<Boton variante="suave" onClick={() => setVerTasas((v) => !v)}>{verTasas ? "Ocultar" : "Revisar tasas"}</Boton>}
      >
        <p className="text-sm text-gray-600">
          Son las vigentes a septiembre de 2026 según fuentes públicas. Compáralas con tu primera planilla de Previred y
          corrígelas si difieren: cambian con la reforma previsional y con las comisiones de cada AFP.
        </p>
        {verTasas && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(NOMBRES_TASA) as (keyof TasasPrevisionales)[]).map((k) => (
              <Campo key={k} etiqueta={`${NOMBRES_TASA[k]} (%)`}>
                <input
                  inputMode="decimal"
                  value={String(tasas[k]).replace(".", ",")}
                  onChange={(e) => setTasas({ ...tasas, [k]: Number(e.target.value.replace(",", ".")) || 0 })}
                  className={claseInput}
                />
              </Campo>
            ))}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setTasas(TASAS_POR_DEFECTO)}>Volver a las por defecto</Boton>
              <Boton onClick={guardarTasas}>Guardar tasas</Boton>
            </div>
          </div>
        )}
      </Tarjeta>

      <Modal abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando === "nuevo" ? "Agregar trabajador" : "Editar trabajador"}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo etiqueta="Nombre">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={claseInput} />
            </Campo>
            <Campo etiqueta="RUT" error={form.rut && !rutValido(form.rut) ? "Dígito verificador incorrecto" : null}>
              <input value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} className={claseInput} placeholder="12.345.678-9" />
            </Campo>
            <Campo etiqueta="Cargo">
              <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={claseInput} placeholder="Cajero, reponedor…" />
            </Campo>
            <Campo etiqueta="Contrato">
              <select value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value as "indefinido" | "plazo_fijo" })} className={claseInput}>
                <option value="indefinido">Indefinido</option>
                <option value="plazo_fijo">Plazo fijo</option>
              </select>
            </Campo>
            <Campo etiqueta="Sueldo imponible mensual" ayuda="Sueldo base + gratificación + bonos imponibles">
              <input value={form.sueldo_imponible} onChange={(e) => setForm({ ...form, sueldo_imponible: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={claseInput} />
            </Campo>
            <Campo etiqueta="AFP">
              <select
                value={form.afp}
                onChange={(e) => setForm({ ...form, afp: e.target.value, comision_afp: e.target.value ? String(COMISIONES_AFP[e.target.value] ?? "") : "" })}
                className={claseInput}
              >
                <option value="">— Elige —</option>
                {Object.keys(COMISIONES_AFP).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Comisión AFP (%)" ayuda="Se completa sola; corrígela si tu planilla dice otra">
              <input value={form.comision_afp.replace(".", ",")} onChange={(e) => setForm({ ...form, comision_afp: e.target.value })} inputMode="decimal" className={claseInput} />
            </Campo>
            <Campo etiqueta="Salud">
              <select value={form.salud} onChange={(e) => setForm({ ...form, salud: e.target.value as "fonasa" | "isapre" })} className={claseInput}>
                <option value="fonasa">Fonasa</option>
                <option value="isapre">Isapre</option>
              </select>
            </Campo>
            {form.salud === "isapre" && (
              <Campo etiqueta="Adicional Isapre (sobre el 7%)" ayuda="En pesos">
                <input value={form.adicional_salud} onChange={(e) => setForm({ ...form, adicional_salud: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={claseInput} />
              </Campo>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            Trabaja actualmente
          </label>
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {editando !== "nuevo" ? <Boton variante="peligro" onClick={eliminar}>Borrar</Boton> : <span />}
            <div className="flex gap-2">
              <Boton variante="secundario" onClick={() => setEditando(null)}>Cancelar</Boton>
              <Boton onClick={guardar} cargando={guardando} disabled={!form.nombre.trim()}>Guardar</Boton>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
