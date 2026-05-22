"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import AddressAutocomplete, { AddressResult } from "@/components/AddressAutocomplete";

type Direccion = {
  id: string;
  nombre: string;
  calle: string;
  numero: string;
  interior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  predeterminada: boolean;
};

const formularioVacio: Direccion = {
  id: "",
  nombre: "",
  calle: "",
  numero: "",
  interior: "",
  colonia: "",
  ciudad: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
  predeterminada: false,
};

function normalizeGoogleAddress(raw: unknown, displayName: string): Direccion | null {
  if (!raw) return null;
  const name = displayName?.trim() || "Principal";
  let source = raw;
  if (Array.isArray(raw)) source = raw[0];

  const tryGet = (obj: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      if (obj && typeof obj[key] === "string" && obj[key]) return obj[key] as string;
    }
    return "";
  };

  if (typeof source === "string") {
    return { id: "google-address", nombre: name, calle: source, numero: "", interior: "", colonia: "", ciudad: "", estado: "", codigoPostal: "", telefono: "", predeterminada: true };
  }
  if (typeof source !== "object") return null;

  const src = source as Record<string, unknown>;
  return {
    id: "google-address",
    nombre: name || "Principal",
    calle: tryGet(src, ["streetAddress", "street_address", "street", "line1", "addressLine1", "formattedValue"]),
    numero: tryGet(src, ["streetNumber", "street_number", "number"]),
    interior: tryGet(src, ["unit", "apartment", "suite", "addressLine2", "line2"]),
    colonia: tryGet(src, ["locality", "city", "town"]),
    ciudad: tryGet(src, ["locality", "city", "town"]),
    estado: tryGet(src, ["region", "state", "administrative_area_level_1", "province"]),
    codigoPostal: tryGet(src, ["postalCode", "postal_code", "zip"]),
    telefono: "",
    predeterminada: true,
  };
}

const inputClass = "w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all";
const labelClass = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2";

export default function DireccionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [direccionActual, setDireccionActual] = useState<Direccion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [formData, setFormData] = useState<Direccion>(formularioVacio);

  const showMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 4000);
  };

  const saveToStorage = (list: Direccion[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("addresses", JSON.stringify(list));
      const pred = list.find((d) => d.predeterminada);
      if (pred) localStorage.setItem("defaultAddress", JSON.stringify(pred));
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/direcciones");
    } else if (status === "authenticated") {
      const saved = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("addresses") || "[]")
        : [];
      let effective: Direccion[] = Array.isArray(saved) ? saved : [];

      const googleAddress = (session?.user as Record<string, unknown>)?.address;
      const googleDerived = normalizeGoogleAddress(googleAddress, session?.user?.name || session?.user?.email || "");
      if (!effective.length && googleDerived) {
        effective = [googleDerived];
        saveToStorage(effective);
      } else if (typeof window !== "undefined" && effective.length && effective[0]?.id?.startsWith("addr-")) {
        localStorage.removeItem("addresses");
        effective = googleDerived ? [googleDerived] : [];
        if (googleDerived) saveToStorage(effective);
      }

      setDirecciones(effective);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddressSelect = useCallback((val: AddressResult | string) => {
    if (typeof val === "string") {
      setFormData((prev) => ({ ...prev, calle: val }));
    } else {
      let street = val.street || "";
      let streetNumber = val.streetNumber || "";
      if (!street) {
        const parts = val.formattedAddress.split(",").map((p) => p.trim());
        if (parts.length > 0) {
          const first = parts[0];
          if (/^\d+$/.test(first)) {
            if (!streetNumber) streetNumber = first;
            if (parts.length > 1) street = parts[1];
          } else {
            const matchSuffix = first.match(/^(.+?)\s+(?:#|No\.?)?\s*(\d+)$/i);
            const matchPrefix = first.match(/^(?:#|No\.?)?\s*(\d+)\s+(.+)$/i);
            if (matchSuffix) {
              street = matchSuffix[1];
              if (!streetNumber) streetNumber = matchSuffix[2];
            } else if (matchPrefix) {
              if (!streetNumber) streetNumber = matchPrefix[1];
              street = matchPrefix[2];
            } else {
              street = first;
              if (!streetNumber) {
                const matchAnyNumber = first.match(/(\d+)/);
                if (matchAnyNumber) {
                  streetNumber = matchAnyNumber[1];
                  street = first.replace(streetNumber, "").replace(/#|No\.|Num\./i, "").trim().replace(/^[\s,.-]+|[\s,.-]+$/g, "");
                }
              }
            }
          }
        }
      }
      setFormData((prev) => ({
        ...prev,
        calle: street,
        numero: streetNumber,
        interior: "",
        ciudad: val.state?.includes("Metropolitana") ? "Santiago" : (val.city && !val.city.includes("Provincia") ? val.city : "Santiago"),
        colonia: val.district || val.city || prev.colonia,
        estado: val.state || prev.estado,
        codigoPostal: val.postalCode || prev.codigoPostal,
      }));
    }
  }, []);

  const handleEliminar = (id: string) => {
    const updated = direcciones.filter((d) => d.id !== id);
    setDirecciones(updated);
    saveToStorage(updated);
    setConfirmingDeleteId(null);
    showMensaje("exito", "Dirección eliminada correctamente");
  };

  const handleEstablecerPredeterminada = (id: string) => {
    const updated = direcciones.map((d) => ({ ...d, predeterminada: d.id === id }));
    setDirecciones(updated);
    saveToStorage(updated);
    showMensaje("exito", "Dirección predeterminada actualizada");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    let updated: Direccion[];
    if (direccionActual) {
      updated = direcciones.map((d) => {
        if (formData.predeterminada) return { ...d, predeterminada: d.id === direccionActual.id ? formData.predeterminada : false, ...(d.id === direccionActual.id ? formData : {}) };
        return d.id === direccionActual.id ? formData : d;
      });
    } else {
      const nueva = { ...formData, id: `dir-${Date.now()}` };
      updated = formData.predeterminada
        ? [...direcciones.map((d) => ({ ...d, predeterminada: false })), nueva]
        : [...direcciones, nueva];
    }

    setDirecciones(updated);
    saveToStorage(updated);
    setMostrarFormulario(false);
    setDireccionActual(null);
    setIsSubmitting(false);
    showMensaje("exito", direccionActual ? "Dirección actualizada correctamente" : "Dirección agregada correctamente");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/mi-cuenta"
        className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-emerald-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Volver a Mi Cuenta
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Mis Direcciones</h1>
          <p className="text-gray-500 font-medium">Gestiona los domicilios de envío de tus pedidos.</p>
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => { setDireccionActual(null); setFormData(formularioVacio); setMostrarFormulario(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Agregar
          </button>
        )}
      </div>

      {/* Mensaje de feedback */}
      {mensaje.texto && (
        <div className={`mb-6 px-5 py-4 rounded-2xl text-sm font-bold ${mensaje.tipo === "exito" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-6">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6">
            {direccionActual ? "Editar dirección" : "Nueva dirección"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className={labelClass}>Nombre de la dirección</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej. Casa, Oficina…" className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Teléfono de contacto</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className={inputClass} required />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Calle</label>
                <AddressAutocomplete value={formData.calle} onChange={handleAddressSelect} placeholder="Ingresa tu dirección" country="cl" required />
              </div>

              <div>
                <label className={labelClass}>Número exterior</label>
                <input type="text" name="numero" value={formData.numero} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Número interior (opcional)</label>
                <input type="text" name="interior" value={formData.interior} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Comuna</label>
                <input type="text" name="colonia" value={formData.colonia} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Código Postal</label>
                <input type="text" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Ciudad</label>
                <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Región</label>
                <input type="text" name="estado" value={formData.estado} onChange={handleChange} className={inputClass} required />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <input
                  type="checkbox"
                  id="predeterminada"
                  name="predeterminada"
                  checked={formData.predeterminada}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="predeterminada" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Establecer como dirección predeterminada
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setMostrarFormulario(false); setDireccionActual(null); }}
                className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-wider hover:border-gray-300 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {isSubmitting ? "Guardando…" : "Guardar dirección"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de direcciones */}
      {!mostrarFormulario && (
        direcciones.length > 0 ? (
          <div className="space-y-4">
            {direcciones.map((dir) => (
              <div
                key={dir.id}
                className={`bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border overflow-hidden transition-all ${dir.predeterminada ? "border-emerald-300" : "border-gray-100"}`}
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${dir.predeterminada ? "bg-emerald-100" : "bg-gray-100"}`}>
                        <MapPinIcon className={`w-5 h-5 ${dir.predeterminada ? "text-emerald-600" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900">{dir.nombre}</h3>
                          {dir.predeterminada && (
                            <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 rounded-full">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-600">
                          {dir.calle} {dir.numero}{dir.interior ? `, Int. ${dir.interior}` : ""}
                        </p>
                        <p className="text-sm font-medium text-gray-500">
                          {dir.colonia}, {dir.ciudad}
                        </p>
                        <p className="text-sm font-medium text-gray-500">
                          {dir.estado}{dir.codigoPostal ? ` · ${dir.codigoPostal}` : ""}
                        </p>
                        {dir.telefono && (
                          <p className="text-xs font-bold text-gray-400 mt-1">Tel: {dir.telefono}</p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 shrink-0">
                      {confirmingDeleteId === dir.id ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                          <span className="text-xs font-black text-red-700 mr-1">¿Eliminar?</span>
                          <button
                            onClick={() => handleEliminar(dir.id)}
                            className="p-1.5 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all"
                            title="Confirmar eliminación"
                          >
                            <CheckIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 active:scale-95 transition-all"
                            title="Cancelar"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setDireccionActual(dir); setFormData(dir); setMostrarFormulario(true); }}
                            className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(dir.id)}
                            className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!dir.predeterminada && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleEstablecerPredeterminada(dir.id)}
                        className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors"
                      >
                        Establecer como predeterminada →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-dashed border-gray-200 py-20 px-6 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPinIcon className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Sin direcciones guardadas</h3>
            <p className="text-gray-400 font-medium mb-8 max-w-xs mx-auto">
              Agrega una dirección para facilitar tus próximas compras.
            </p>
            <button
              onClick={() => { setFormData(formularioVacio); setMostrarFormulario(true); }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Agregar dirección
            </button>
          </div>
        )
      )}
    </div>
  );
}
