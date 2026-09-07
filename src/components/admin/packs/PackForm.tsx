"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  TrashIcon, 
  SparklesIcon, 
  ShoppingBagIcon, 
  ListBulletIcon,
  CalculatorIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { useProducts, Product } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import MultiImageUpload from "@/components/ui/MultiImageUpload";
import { uploadImageToCloudinaryServerAction } from "@/actions/upload";
import { 
  BundleConfig, 
  BundleFixedItem, 
  BundleOptionGroup, 
  BundleOptionItem 
} from "@/types/bundle";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

interface PackFormProps {
  initialData?: Partial<Product>;
  isEditing?: boolean;
}

export default function PackForm({ initialData, isEditing = false }: PackFormProps) {
  const router = useRouter();
  const { products, addProduct, updateProduct } = useProducts();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Datos básicos del producto
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [offerPrice, setOfferPrice] = useState(initialData?.offerPrice ? String(initialData.offerPrice) : "");
  const [stock, setStock] = useState(initialData?.stock !== undefined ? String(initialData.stock) : "10");
  const [barcode, setBarcode] = useState(initialData?.barcode || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [gallery, setGallery] = useState<string[]>(initialData?.gallery || []);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? true);
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories && initialData.categories.length > 0 ? initialData.categories : ["Packs"]
  );

  // Componentes fijos del pack
  const initialBundle = initialData?.bundle_config;
  const [fixedItems, setFixedItems] = useState<BundleFixedItem[]>(
    initialBundle?.fixedItems || []
  );

  // Grupos de opciones del pack (ej. sabor de bebida, salsas)
  const [optionGroups, setOptionGroups] = useState<BundleOptionGroup[]>(
    initialBundle?.optionGroups || []
  );

  // Estado para buscar producto a agregar en fijos
  const [productSearch, setProductSearch] = useState("");
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<string>("");

  // Estado temporal para agregar opción a un grupo
  const [tempOptionText, setTempOptionText] = useState<{ [groupId: string]: string }>({});
  const [tempCatalogSelect, setTempCatalogSelect] = useState<{ [groupId: string]: string }>({});

  // Lista de productos filtrados para buscador
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term)))
      .slice(0, 8);
  }, [products, productSearch]);

  // Cálculos financieros en tiempo real
  const financialSummary = useMemo(() => {
    // 1. Costo y precio de productos fijos
    let fixedTotalRetail = 0;
    let fixedTotalCost = 0;

    fixedItems.forEach((item) => {
      fixedTotalRetail += (item.unitPrice || 0) * item.quantity;
      fixedTotalCost += (item.unitCost || 0) * item.quantity;
    });

    const packPriceNum = parseFloat(price) || 0;
    const clientSavings = fixedTotalRetail > packPriceNum ? fixedTotalRetail - packPriceNum : 0;
    const clientSavingsPct = fixedTotalRetail > 0 ? Math.round((clientSavings / fixedTotalRetail) * 100) : 0;
    const estimatedMargin = packPriceNum - fixedTotalCost;

    return {
      fixedTotalRetail,
      fixedTotalCost,
      clientSavings,
      clientSavingsPct,
      estimatedMargin,
    };
  }, [fixedItems, price]);

  // Manejadores para productos fijos
  const handleAddFixedProduct = (prod: Product) => {
    const existing = fixedItems.find((f) => f.id === prod.id || (f.barcode && f.barcode === prod.barcode));
    if (existing) {
      setFixedItems(
        fixedItems.map((f) =>
          f.id === existing.id ? { ...f, quantity: f.quantity + 1 } : f
        )
      );
    } else {
      setFixedItems([
        ...fixedItems,
        {
          id: prod.id,
          name: prod.name,
          barcode: prod.barcode,
          quantity: 1,
          unitPrice: prod.price || 0,
          unitCost: prod.purchasePrice || 0,
        },
      ]);
    }
    setProductSearch("");
  };

  const handleUpdateFixedQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setFixedItems(fixedItems.filter((f) => f.id !== id));
    } else {
      setFixedItems(fixedItems.map((f) => (f.id === id ? { ...f, quantity: qty } : f)));
    }
  };

  const handleRemoveFixed = (id: string) => {
    setFixedItems(fixedItems.filter((f) => f.id !== id));
  };

  // Manejadores para grupos de opciones
  const handleAddOptionGroup = () => {
    const newGroupId = `group-${Date.now()}`;
    setOptionGroups([
      ...optionGroups,
      {
        id: newGroupId,
        title: "Nuevo Grupo (ej. Bebida 3L)",
        subtitle: "Escoge una opción",
        required: true,
        minQuantity: 1,
        maxQuantity: 1,
        options: [],
      },
    ]);
  };

  const handleUpdateGroup = (groupId: string, field: keyof BundleOptionGroup, value: any) => {
    setOptionGroups(
      optionGroups.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    setOptionGroups(optionGroups.filter((g) => g.id !== groupId));
  };

  const handleAddOptionToGroup = (groupId: string, optionName: string, catalogProd?: Product) => {
    if (!optionName.trim()) return;
    setOptionGroups(
      optionGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: [
            ...g.options,
            {
              id: catalogProd ? catalogProd.id : `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: optionName.trim(),
              barcode: catalogProd?.barcode,
            },
          ],
        };
      })
    );
    setTempOptionText((prev) => ({ ...prev, [groupId]: "" }));
  };

  const handleRemoveOptionFromGroup = (groupId: string, optionId: string) => {
    setOptionGroups(
      optionGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.filter((o) => o.id !== optionId),
        };
      })
    );
  };

  // Guardar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("El nombre del pack es obligatorio", "error");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("Ingresa un precio válido mayor a 0", "error");
      return;
    }

    if (!image.trim()) {
      showToast("La imagen del pack es obligatoria", "error");
      return;
    }

    setLoading(true);

    try {
      // Subir imagen si viene en formato data URL base64
      const uploadIfDataUrl = async (img?: string): Promise<string> => {
        if (!img) return "";
        if (img.startsWith("data:image")) {
          const res = await uploadImageToCloudinaryServerAction(img);
          if (res.ok && res.url) return res.url;
          throw new Error(res.error || "Error al subir imagen");
        }
        return img;
      };

      const finalImageUrl = await uploadIfDataUrl(image);
      const finalGallery = (await Promise.all(gallery.map(g => uploadIfDataUrl(g)))).filter(Boolean);

      const generatedId = initialData?.id || `PACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const finalBarcode = barcode.trim() || initialData?.barcode || generatedId;

      // Bundle config estructurado
      const bundleConfig: BundleConfig = {
        isBundle: true,
        fixedItems,
        optionGroups,
      };

      // Si no hay costo de compra explícito, usamos el costo total de los productos fijos
      // o un 50% de costo teórico para asegurar que purchasePrice > 0 y sea visible en tienda
      const computedPurchasePrice = financialSummary.fixedTotalCost > 0 
        ? financialSummary.fixedTotalCost 
        : Math.round(priceNum * 0.5);

      const packPayload: Partial<Product> = {
        id: generatedId,
        barcode: finalBarcode,
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        offerPrice: offerPrice.trim() ? parseFloat(offerPrice) : null,
        stock: parseInt(stock) || 10,
        categories: categories.includes("Packs") ? categories : ["Packs", ...categories],
        featured,
        isActive,
        image: finalImageUrl,
        gallery: finalGallery,
        slug: name.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-"),
        purchasePrice: computedPurchasePrice,
        bundle_config: bundleConfig,
      };

      if (isEditing && initialData?.id) {
        await updateProduct(initialData.id, packPayload);
        showToast("Pack actualizado exitosamente", "success");
      } else {
        await addProduct(packPayload);
        showToast("Pack creado exitosamente", "success");
      }

      router.push("/admin/packs");
    } catch (err: any) {
      console.error("Error guardando pack:", err);
      showToast(err?.message || "Error al guardar el pack", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/packs"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? `Editar: ${name}` : "Nuevo Pack / Producto Compuesto"}
            </h1>
            <p className="text-sm text-gray-500">
              Configura los productos que incluye y las opciones a elección del cliente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/packs">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : isEditing ? "Actualizar Pack" : "Crear Pack"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Datos Básicos e Imagen (1 columna) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
              Información del Pack
            </h2>

            <div>
              <Input
                label="Nombre del Pack *"
                id="packName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: ¡Pack Choripán Fiestero!"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción detallada
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Describe qué contiene el pack, recomendaciones de consumo, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Precio Pack ($) *"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="16990"
                  required
                />
              </div>
              <div>
                <Input
                  label="Precio Oferta ($)"
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Stock inicial *"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
              <div>
                <Input
                  label="Código / Barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Autogenerado"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Pack activo y visible en tienda</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Destacar en portada</span>
              </label>
            </div>
          </div>

          {/* Imagen */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
              Imagen del Pack
            </h2>
            <SingleImageUpload
              label="Foto principal *"
              value={image}
              onChange={(url) => setImage(url)}
              required
            />
            <MultiImageUpload
              label="Galería adicional (opcional)"
              values={gallery}
              onChange={(arr) => setGallery(arr)}
              maxImages={4}
            />
          </div>

          {/* Resumen Financiero */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
              <CalculatorIcon className="size-5 text-emerald-600" />
              Calculadora de Rentabilidad
            </div>
            
            <div className="space-y-1.5 text-xs text-emerald-950">
              <div className="flex justify-between">
                <span className="text-emerald-800">Suma partes (precio normal):</span>
                <span className="font-semibold">{clp(financialSummary.fixedTotalRetail)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Precio de venta del Pack:</span>
                <span className="font-bold text-sm text-emerald-900">{clp(parseFloat(price) || 0)}</span>
              </div>
              <div className="flex justify-between text-brand-700 font-medium">
                <span>Ahorro para el cliente:</span>
                <span>{clp(financialSummary.clientSavings)} ({financialSummary.clientSavingsPct}%)</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex justify-between">
                <span className="text-emerald-800">Costo insumos fijos:</span>
                <span className="font-medium">{clp(financialSummary.fixedTotalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Margen bruto estimado:</span>
                <span className="font-bold">{clp(financialSummary.estimatedMargin)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Constructor de Componentes (2 columnas) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECCIÓN 1: PRODUCTOS FIJOS */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingBagIcon className="size-5 text-brand-600" />
                  1. Productos Fijos Incluidos
                </h2>
                <p className="text-xs text-gray-500">
                  Son los artículos que vienen obligatoriamente en el pack (ej. chorizos, pan, carbón).
                </p>
              </div>
              <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                {fixedItems.length} ítems fijos
              </span>
            </div>

            {/* Buscador para agregar producto */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Buscar y añadir producto del catálogo:
              </label>
              <input
                type="text"
                placeholder="Escribe el nombre del producto (ej: Chorizo, Marraqueta, etc.)..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              />

              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddFixedProduct(p)}
                      className="w-full text-left p-3 hover:bg-brand-50 flex items-center justify-between gap-3 text-sm transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-medium text-gray-800 truncate">{p.name}</span>
                        <span className="text-xs text-gray-400">({p.barcode})</span>
                      </div>
                      <span className="font-semibold text-gray-700 shrink-0">{clp(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de productos fijos seleccionados */}
            {fixedItems.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">
                  Aún no has agregado productos fijos. Usa el buscador de arriba.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {fixedItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-white flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        Normal: {clp(item.unitPrice || 0)} c/u {item.unitCost ? `· Costo: ${clp(item.unitCost)}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleUpdateFixedQty(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-l-lg text-sm"
                        >
                          -
                        </button>
                        <span className="px-3 text-sm font-bold text-gray-800">
                          {item.quantity} u.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateFixedQty(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-r-lg text-sm"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                        {clp((item.unitPrice || 0) * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFixed(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                        title="Quitar ítem"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: GRUPOS DE OPCIONES / ELECCIÓN DEL CLIENTE */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ListBulletIcon className="size-5 text-brand-600" />
                  2. Opciones Personalizables por el Cliente
                </h2>
                <p className="text-xs text-gray-500">
                  Permite al cliente escoger el sabor de bebida, salsas, o cualquier variedad incluida en el pack.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddOptionGroup}
                className="flex items-center gap-1.5"
              >
                <PlusIcon className="size-4" />
                Agregar Grupo
              </Button>
            </div>

            {optionGroups.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">
                  ¿El pack incluye opciones a elegir (como sabores o salsas)? Haz clic en <strong>Agregar Grupo</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {optionGroups.map((group, index) => (
                  <div
                    key={group.id}
                    className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Título del Grupo *"
                          value={group.title}
                          onChange={(e) => handleUpdateGroup(group.id, "title", e.target.value)}
                          placeholder="Ej: Bebida 3L (Variedad)"
                          required
                        />
                        <Input
                          label="Subtítulo / Instrucción"
                          value={group.subtitle || ""}
                          onChange={(e) => handleUpdateGroup(group.id, "subtitle", e.target.value)}
                          placeholder="Ej: Escoge el sabor de tu bebida"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-28">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ¿Cuántas elige?
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={group.minQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              handleUpdateGroup(group.id, "minQuantity", val);
                              handleUpdateGroup(group.id, "maxQuantity", val);
                            }}
                            className="w-full text-sm border border-gray-300 rounded-lg p-2 font-bold text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(group.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg mt-4"
                          title="Eliminar grupo"
                        >
                          <TrashIcon className="size-5" />
                        </button>
                      </div>
                    </div>

                    {/* Lista de opciones configuradas en este grupo */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Opciones disponibles para que el cliente elija ({group.options.length}):
                      </label>

                      {group.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {group.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
                            >
                              {opt.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionFromGroup(group.id, opt.id)}
                                className="text-gray-400 hover:text-red-500 ml-1 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Inputs para agregar nueva opción */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Escribir nombre de opción (ej: Coca-Cola Original 3L)..."
                          value={tempOptionText[group.id] || ""}
                          onChange={(e) =>
                            setTempOptionText((prev) => ({ ...prev, [group.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddOptionToGroup(group.id, tempOptionText[group.id] || "");
                            }
                          }}
                          className="flex-1 text-xs border border-gray-300 rounded-xl p-2.5 bg-white outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddOptionToGroup(group.id, tempOptionText[group.id] || "")}
                        >
                          + Añadir Opción
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
