"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  PlusIcon, 
  SparklesIcon, 
  PencilSquareIcon, 
  EyeIcon, 
  ShoppingBagIcon, 
  TrashIcon
} from "@heroicons/react/24/outline";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import Button from "@/components/ui/Button";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function PacksAdminPage() {
  const { products, loading, deleteProduct, toggleActive } = useProducts();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  // Filtrar productos que son packs (por categoría 'Packs' o que tengan bundle_config configurado)
  const packs = products.filter((p) => {
    const isPackCategory = p.categories?.some((c) =>
      ["packs", "combos", "promociones"].includes(c.toLowerCase())
    );
    const hasMarker = (p.features || []).some(
      (f: any) => typeof f === "string" && f.startsWith("__BUNDLE_CONFIG__:")
    );
    const isBundle = Boolean(p.bundle_config?.isBundle || hasMarker);
    const matchesQuery =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    return (isPackCategory || isBundle) && matchesQuery;
  });

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el pack "${name}"?`)) {
      try {
        await deleteProduct(id);
        showToast("Pack eliminado correctamente", "success");
      } catch (err: any) {
        showToast(`Error al eliminar: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-8 text-brand-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Packs y Productos Compuestos</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Administra combos, ofertas especiales y packs con opciones personalizables para tus clientes.
          </p>
        </div>
        <Link href="/admin/packs/nuevo">
          <Button type="button" className="flex items-center gap-2">
            <PlusIcon className="size-5" />
            Crear Nuevo Pack
          </Button>
        </Link>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Buscar pack por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm outline-none bg-transparent"
        />
        {search && (
          <button 
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Listado */}
      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-2 text-sm">Cargando packs...</p>
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <SparklesIcon className="size-12 mx-auto text-gray-400" />
          <h3 className="mt-3 text-lg font-medium text-gray-900">No hay packs configurados</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Crea tu primer pack compuesto combinando productos existentes de tu tienda y definiendo opciones para los clientes.
          </p>
          <div className="mt-6">
            <Link href="/admin/packs/nuevo">
              <Button type="button" className="inline-flex items-center gap-2">
                <PlusIcon className="size-4" />
                Crear Mi Primer Pack
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => {
            let bundle = pack.bundle_config;
            if (!bundle) {
              const marker = (pack.features || []).find(
                (f: any) => typeof f === "string" && f.startsWith("__BUNDLE_CONFIG__:")
              );
              if (marker) {
                try {
                  bundle = JSON.parse(marker.slice("__BUNDLE_CONFIG__:".length));
                } catch {}
              }
            }
            const fixedCount = bundle?.fixedItems?.length || 0;
            const optionsCount = bundle?.optionGroups?.length || 0;

            return (
              <div 
                key={pack.id} 
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-video sm:aspect-square bg-gray-50 flex items-center justify-center p-4 border-b border-gray-100">
                  <ImageWithFallback
                    src={pack.image || "/file.svg"}
                    alt={pack.name}
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      pack.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {pack.isActive ? "Activo" : "Inactivo"}
                    </span>
                    {pack.featured && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        Destacado ⭐
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">
                        {pack.name}
                      </h3>
                    </div>
                    {pack.barcode && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {pack.barcode}
                      </p>
                    )}

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        {clp(pack.price)}
                      </span>
                      {pack.offerPrice && pack.offerPrice < pack.price && (
                        <span className="text-xs text-red-600 font-medium">
                          Oferta: {clp(pack.offerPrice)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 py-2 px-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700 flex items-center gap-1.5">
                        <ShoppingBagIcon className="size-3.5 text-brand-600" />
                        Composición:
                      </p>
                      {bundle?.isBundle ? (
                        <ul className="list-disc list-inside text-gray-500 pl-1 space-y-0.5">
                          {fixedCount > 0 && <li>{fixedCount} producto(s) fijo(s)</li>}
                          {optionsCount > 0 && <li>{optionsCount} grupo(s) de opciones configurables</li>}
                        </ul>
                      ) : (
                        <p className="italic text-gray-400">Pack simple (sin configuración avanzada)</p>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
                      <span>Stock: <strong>{pack.stock}</strong> u.</span>
                      <span className="text-neutral-400">Cat: {pack.categories?.join(", ") || "Packs"}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Link 
                        href={`/productos/${pack.slug}`}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="Ver en la tienda"
                      >
                        <EyeIcon className="size-4" />
                      </Link>
                      <button
                        onClick={() => toggleActive(pack.id, !pack.isActive)}
                        className={`p-2 rounded-lg hover:bg-gray-100 text-xs font-medium ${
                          pack.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"
                        }`}
                        title={pack.isActive ? "Desactivar" : "Activar"}
                      >
                        {pack.isActive ? "Pausar" : "Activar"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(pack.id, pack.name)}
                        className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Eliminar pack"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                      <Link href={`/admin/packs/${pack.id}`}>
                        <Button type="button" size="sm" variant="outline" className="flex items-center gap-1.5">
                          <PencilSquareIcon className="size-4" />
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
