"use client";

import React, { useState, useRef, useEffect } from "react";
import { saveProduct } from "@/services/products";
import { supabase } from "@/lib/supabase";
import {
  ExclamationCircleIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function CreacionRapidaPage() {
  const [barcode, setBarcode] = useState("");
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SEARCHING" | "FOUND" | "NOT_FOUND">("IDLE");
  const [formData, setFormData] = useState({ name: "", sku: "", stock: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep focus on barcode if we are idle
  useEffect(() => {
    if (scanStatus === "IDLE") {
      barcodeInputRef.current?.focus();
    }
  }, [scanStatus]);

  const resetState = () => {
    setBarcode("");
    setScanStatus("IDLE");
    setFormData({ name: "", sku: "", stock: 0 });
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setScanStatus("SEARCHING");
    setMessage(null);

    const scannedCode = barcode.trim();

    try {
      // Direct supabase call to avoid throwing an unhandled 404
      const { data, error } = await supabase
        .from("products")
        .select("barcode, name, stock")
        .eq("barcode", scannedCode)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        // FOUND -> Update Mode
        setFormData({
          name: data.name || "",
          sku: data.barcode || scannedCode,
          stock: data.stock || 0
        });
        setScanStatus("FOUND");
      } else {
        // NOT FOUND -> Create Mode
        setFormData({
          name: "",
          sku: scannedCode,
          stock: 0
        });
        setScanStatus("NOT_FOUND");
      }
      
      // Auto-focus on name so user can type right away
      setTimeout(() => nameInputRef.current?.focus(), 100);

    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: "Error al buscar el producto." });
      setScanStatus("IDLE");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await saveProduct({
        barcode: formData.sku,
        name: formData.name,
        stock: Number(formData.stock)
      });
      
      // Success Alert & Reset
      setMessage({ 
        type: "success", 
        text: scanStatus === "FOUND" ? `¡Producto actualizado! (${formData.sku})` : `¡Producto creado! (${formData.sku})` 
      });
      setBarcode("");
      setScanStatus("IDLE");
      setFormData({ name: "", sku: "", stock: 0 });
      
      // Refocus bar code scanner
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);

    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: error.message || "Error al guardar el producto." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <BoltIcon className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Creación Rápida</h1>
          <p className="text-sm text-gray-500">
            Escanea un código de barras para crear rápido o actualizar el inventario de un producto.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.type === "success" ? (
            <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {scanStatus === "IDLE" || scanStatus === "SEARCHING" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
            {scanStatus === "SEARCHING" ? (
               <ArrowPathIcon className="w-10 h-10 text-emerald-500 animate-spin" />
            ) : (
               <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Esperando Escáner...</h2>
            <p className="text-sm text-gray-500 mt-1">
              Asegúrate de que el cursor esté en la caja de abajo y usa la pistola.
            </p>
          </div>
          <form onSubmit={handleScan} className="max-w-md mx-auto">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="000000000000"
              className="w-full text-center text-3xl tracking-widest font-mono p-4 border-2 border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-xl outline-none transition-all"
              autoFocus
              disabled={scanStatus === "SEARCHING"}
            />
            <button
              type="submit"
              disabled={!barcode.trim() || scanStatus === "SEARCHING"}
              className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              Buscar Manualmente
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-4 border-b ${scanStatus === "FOUND" ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"}`}>
            <div className="flex items-center gap-3">
              {scanStatus === "FOUND" ? (
                <ExclamationCircleIcon className="w-6 h-6 text-amber-600" />
              ) : (
                <BoltIcon className="w-6 h-6 text-emerald-600" />
              )}
              <div>
                <h2 className={`font-bold ${scanStatus === "FOUND" ? "text-amber-900" : "text-emerald-900"}`}>
                  {scanStatus === "FOUND" ? "Modo Actualización" : "Modo Creación"}
                </h2>
                <p className={`text-xs ${scanStatus === "FOUND" ? "text-amber-700" : "text-emerald-700"}`}>
                  {scanStatus === "FOUND" 
                    ? "El producto ya existe. Actuliza sus datos esenciales."
                    : "El producto no existe. Se creará de forma rápida."}
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Código de Barras (SKU)
              </label>
              <input
                type="text"
                value={formData.sku}
                readOnly
                className="w-full font-mono bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Nombre del Producto
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Coca Cola 2L"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Cantidad de Inventario
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-lg font-bold"
              />
              {scanStatus === "FOUND" && (
                <p className="mt-1 text-xs text-amber-600">
                  Precaución: Este valor reemplazará el inventario actual.
                </p>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={resetState}
                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                Guardar y Escanear Otro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
