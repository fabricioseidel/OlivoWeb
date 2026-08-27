"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import { uploadImageToCloudinaryServerAction } from "@/actions/upload";
import { compressImageFile } from "@/utils/image";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

const DEFAULT_IMAGE = "/file.svg";
const MAX_SIZE_KB = 20480;

export default function BulkImageEditorPage() {
  const { products, loading, updateProductsBulk } = useProducts();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  // id -> data URL pendiente de guardar
  const [pending, setPending] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (onlyMissing && !pending[p.id]) {
          const missing = !p.image || p.image === DEFAULT_IMAGE;
          if (!missing) return false;
        }
        if (!term) return true;
        return (
          p.name?.toLowerCase().includes(term) ||
          String(p.id).toLowerCase().includes(term)
        );
      })
      .slice(0, 300);
  }, [products, search, onlyMissing, pending]);

  const pendingCount = Object.keys(pending).length;

  const handlePick = async (id: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("El archivo debe ser una imagen", "error");
      return;
    }
    if (file.size > MAX_SIZE_KB * 1024) {
      showToast(`La imagen supera el límite de ${(MAX_SIZE_KB / 1024).toFixed(0)}MB`, "error");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setPending((prev) => ({ ...prev, [id]: dataUrl }));
    } catch {
      showToast("No se pudo procesar la imagen", "error");
    }
  };

  const clearPending = (id: string) => {
    setPending((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSave = async () => {
    const ids = Object.keys(pending);
    if (ids.length === 0) return;
    setSaving(true);
    setProgress(0);

    const updates: Record<string, { image: string }> = {};
    const failed: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const res = await uploadImageToCloudinaryServerAction(pending[id]);
        if (!res.ok || !res.url) throw new Error(res.error || "Falló la subida");
        updates[id] = { image: res.url };
      } catch {
        const name = products.find((p) => p.id === id)?.name || id;
        failed.push(name);
      }
      setProgress(i + 1);
    }

    try {
      const okIds = Object.keys(updates);
      if (okIds.length > 0) {
        await updateProductsBulk(updates as any);
        setPending((prev) => {
          const next = { ...prev };
          for (const id of okIds) delete next[id];
          return next;
        });
      }
      if (failed.length === 0) {
        showToast(`${okIds.length} ${okIds.length === 1 ? "imagen actualizada" : "imágenes actualizadas"}`, "success");
      } else if (okIds.length === 0) {
        showToast(`No se pudo subir ninguna imagen. Falló: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`, "error");
      } else {
        showToast(`${okIds.length} guardadas, ${failed.length} fallaron (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""})`, "warning");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error al guardar los cambios", "error");
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 font-medium mb-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Productos
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <PhotoIcon className="w-7 h-7 text-brand-600" />
            Editor masivo de imágenes
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            Asigna o reemplaza la foto de varios productos y guárdalas de una vez.
          </p>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={pendingCount === 0 || saving}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold whitespace-nowrap"
        >
          <CloudArrowUpIcon className="w-5 h-5 mr-2" />
          {saving
            ? `Guardando ${progress}/${pendingCount}…`
            : pendingCount > 0
            ? `Guardar ${pendingCount} ${pendingCount === 1 ? "imagen" : "imágenes"}`
            : "Guardar"}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código de barras…"
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 px-4 h-11 rounded-xl border border-gray-300 bg-white cursor-pointer select-none text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Solo sin imagen
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-medium">
          No hay productos que coincidan.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => {
            const previewSrc = pending[p.id] || p.image || DEFAULT_IMAGE;
            const isPlaceholder = !pending[p.id] && (!p.image || p.image === DEFAULT_IMAGE);
            const hasPending = Boolean(pending[p.id]);
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
                  hasPending ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"
                }`}
              >
                <div
                  className="relative aspect-square bg-gray-50 flex items-center justify-center cursor-pointer group"
                  onClick={() => inputRefs.current[p.id]?.click()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={p.name}
                    className={`w-full h-full object-contain ${isPlaceholder ? "opacity-30 p-8" : ""}`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold bg-brand-600 px-3 py-1.5 rounded-lg">
                      {isPlaceholder ? "Subir imagen" : "Reemplazar"}
                    </span>
                  </div>
                  {hasPending && (
                    <>
                      <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Pendiente
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearPending(p.id);
                        }}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 rounded-full p-1 shadow"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {isPlaceholder && !hasPending && (
                    <span className="absolute top-2 left-2 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Sin foto
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate flex-1" title={p.name}>
                      {p.name}
                    </p>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(p.name);
                          showToast("Nombre copiado", "success");
                        } catch {
                          showToast("No se pudo copiar", "error");
                        }
                      }}
                      title="Copiar nombre"
                      className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{p.id}</p>
                </div>
                <input
                  ref={(el) => {
                    inputRefs.current[p.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handlePick(p.id, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {products.length > filtered.length && !search && !onlyMissing && (
        <p className="text-center text-xs text-gray-400 mt-6">
          Mostrando {filtered.length} de {products.length}. Usa el buscador para encontrar productos específicos.
        </p>
      )}
    </div>
  );
}
