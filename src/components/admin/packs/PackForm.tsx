"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  TrashIcon, 
  ShoppingBagIcon, 
  ListBulletIcon,
  CalculatorIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
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
  BundleOptionGroup
} from "@/types/bundle";
import { calculateBundleStock, calculateBundleCost } from "@/lib/bundle";

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
  const [barcode, setBarcode] = useState(initialData?.barcode || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [gallery, setGallery] = useState<string[]>(initialData?.gallery || []);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? true);
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories && initialData.categories.length > 0 ? initialData.categories : ["Packs"]
  );

  // Componentes fijos del pack
  const resolvedInitialBundle = useMemo(() => {
    if (initialData?.bundle_config?.isBundle) return initialData.bundle_config;
    const raw = (initialData?.features || []) as string[];
    const marker = raw.find((f) => typeof f === "string" && f.startsWith("__BUNDLE_CONFIG__:"));
    if (marker) {
      try {
        return JSON.parse(marker.slice("__BUNDLE_CONFIG__:".length));
      } catch {}
    }
    return null;
  }, [initialData]);

  const [fixedItems, setFixedItems] = useState<BundleFixedItem[]>(
    resolvedInitialBundle?.fixedItems || []
  );

  // Grupos de opciones del pack (ej. sabor de bebida, salsas)
  const [optionGroups, setOptionGroups] = useState<BundleOptionGroup[]>(
    resolvedInitialBundle?.optionGroups || []
  );

  // Efecto para sincronizar cuando initialData carga asíncronamente
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setPrice(initialData.price ? String(initialData.price) : "");
      setOfferPrice(initialData.offerPrice ? String(initialData.offerPrice) : "");
      setBarcode(initialData.barcode || "");
      setImage(initialData.image || "");
      setGallery(initialData.gallery || []);
      setIsActive(initialData.isActive ?? true);
      setFeatured(initialData.featured ?? true);
      if (initialData.categories && initialData.categories.length > 0) {
        setCategories(initialData.categories);
      }

      let bundle = initialData.bundle_config;
      if (!bundle) {
        const raw = (initialData.features || []) as string[];
        const marker = raw.find((f) => typeof f === "string" && f.startsWith("__BUNDLE_CONFIG__:"));
        if (marker) {
          try {
            bundle = JSON.parse(marker.slice("__BUNDLE_CONFIG__:".length));
          } catch {}
        }
      }
      if (bundle) {
        if (bundle.fixedItems) setFixedItems(bundle.fixedItems);
        if (bundle.optionGroups) setOptionGroups(bundle.optionGroups);
      }
    }
  }, [initialData]);

  // Estado para buscar producto en fijos
  const [productSearch, setProductSearch] = useState("");

  // Estado para buscar producto en opciones por cada grupo
  const [optionSearches, setOptionSearches] = useState<{ [groupId: string]: string }>({});

  // Estado temporal para agregar opción manual de texto a un grupo
  const [tempOptionText, setTempOptionText] = useState<{ [groupId: string]: string }>({});

  // Caché de proveedores de producto
  const [supplierCache, setSupplierCache] = useState<{
    [barcode: string]: { supplierId?: string; supplierName?: string; unitCost?: number };
  }>({});

  const fetchProductSupplier = useCallback(async (barcodeOrId: string) => {
    if (!barcodeOrId) return null;
    if (supplierCache[barcodeOrId]) return supplierCache[barcodeOrId];

    try {
      const res = await fetch(`/api/admin/product-suppliers?productId=${encodeURIComponent(barcodeOrId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          const info = {
            supplierId: first.supplier_id || first.supplier?.id,
            supplierName: first.supplier?.name || "Sin proveedor",
            unitCost: first.unit_cost != null ? Number(first.unit_cost) : undefined,
          };
          setSupplierCache((prev) => ({ ...prev, [barcodeOrId]: info }));
          return info;
        }
      }
    } catch {}
    return null;
  }, [supplierCache]);

  // Enriquecer items existentes con stock y proveedor desde catálogo si faltan
  useEffect(() => {
    if (products.length === 0) return;

    setFixedItems((prev) =>
      prev.map((item) => {
        const matched = products.find(
          (p) => p.barcode === item.barcode || p.id === item.id || (item.barcode && p.id === item.barcode)
        );
        if (!matched) return item;
        return {
          ...item,
          barcode: item.barcode || matched.barcode,
          unitCost: item.unitCost || matched.purchasePrice || 0,
          stock: item.stock !== undefined ? item.stock : matched.stock,
        };
      })
    );

    setOptionGroups((prev) =>
      prev.map((g) => ({
        ...g,
        options: g.options.map((opt) => {
          const matched = products.find(
            (p) => p.barcode === opt.barcode || p.id === opt.id || (opt.barcode && p.id === opt.barcode)
          );
          if (!matched) return opt;
          return {
            ...opt,
            barcode: opt.barcode || matched.barcode,
            unitCost: opt.unitCost || matched.purchasePrice || 0,
            stock: opt.stock !== undefined ? opt.stock : matched.stock,
          };
        }),
      }))
    );
  }, [products]);

  // Consultar proveedores para todos los barcodes que no tengan supplierName
  useEffect(() => {
    const barcodesToLookup: string[] = [];
    fixedItems.forEach((item) => {
      const bc = item.barcode || item.id;
      if (bc && !item.supplierName) barcodesToLookup.push(bc);
    });
    optionGroups.forEach((g) => {
      g.options.forEach((opt) => {
        const bc = opt.barcode || opt.id;
        if (bc && !opt.supplierName) barcodesToLookup.push(bc);
      });
    });

    if (barcodesToLookup.length === 0) return;

    barcodesToLookup.forEach(async (bc) => {
      const info = await fetchProductSupplier(bc);
      if (info?.supplierName) {
        setFixedItems((prev) =>
          prev.map((item) =>
            (item.barcode === bc || item.id === bc) && !item.supplierName
              ? {
                  ...item,
                  supplierName: info.supplierName,
                  supplierId: info.supplierId,
                  unitCost: item.unitCost || info.unitCost,
                }
              : item
          )
        );
        setOptionGroups((prev) =>
          prev.map((g) => ({
            ...g,
            options: g.options.map((opt) =>
              (opt.barcode === bc || opt.id === bc) && !opt.supplierName
                ? {
                    ...opt,
                    supplierName: info.supplierName,
                    supplierId: info.supplierId,
                    unitCost: opt.unitCost || info.unitCost,
                  }
                : opt
            ),
          }))
        );
      }
    });
  }, [fixedItems, optionGroups, fetchProductSupplier]);

  // Lista de productos filtrados para buscador de fijos
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term)))
      .slice(0, 8);
  }, [products, productSearch]);

  // Helper para filtrar productos del catálogo para opciones
  const getFilteredProductsForOption = (term: string) => {
    if (!term.trim()) return [];
    const t = term.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(t) || (p.barcode && p.barcode.includes(t)))
      .slice(0, 8);
  };

  // Configuración de bundle en tiempo real
  const currentBundleConfig: BundleConfig = useMemo(
    () => ({
      isBundle: true,
      fixedItems,
      optionGroups,
    }),
    [fixedItems, optionGroups]
  );

  // Cálculo de stock dinámico ("se arma al momento")
  const stockCalculation = useMemo(() => {
    return calculateBundleStock(currentBundleConfig, (bc) => {
      const p = products.find((prod) => prod.barcode === bc || prod.id === bc);
      return p ? p.stock : 0;
    });
  }, [currentBundleConfig, products]);

  // Cálculo de costos consolidados
  const costCalculation = useMemo(() => {
    return calculateBundleCost(currentBundleConfig, (bc) => {
      const p = products.find((prod) => prod.barcode === bc || prod.id === bc);
      return p ? (p.purchasePrice || 0) : 0;
    });
  }, [currentBundleConfig, products]);

  // Cálculos financieros en tiempo real
  const financialSummary = useMemo(() => {
    let fixedTotalRetail = 0;
    fixedItems.forEach((item) => {
      fixedTotalRetail += (item.unitPrice || 0) * item.quantity;
    });

    const packPriceNum = parseFloat(price) || 0;
    const clientSavings = fixedTotalRetail > packPriceNum ? fixedTotalRetail - packPriceNum : 0;
    const clientSavingsPct = fixedTotalRetail > 0 ? Math.round((clientSavings / fixedTotalRetail) * 100) : 0;
    const estimatedMargin = packPriceNum - costCalculation.totalCost;
    const marginPct = packPriceNum > 0 ? Math.round((estimatedMargin / packPriceNum) * 100) : 0;

    return {
      fixedTotalRetail,
      totalCost: costCalculation.totalCost,
      fixedCost: costCalculation.fixedCost,
      optionsCost: costCalculation.optionsCost,
      clientSavings,
      clientSavingsPct,
      estimatedMargin,
      marginPct,
    };
  }, [fixedItems, price, costCalculation]);

  // Lista unificada de componentes para la tabla de proveedores
  const allComponentsList = useMemo(() => {
    const list: Array<{
      id: string;
      barcode?: string;
      name: string;
      type: string;
      supplierName?: string;
      quantity: number;
      unitCost: number;
      stock?: number;
    }> = [];

    fixedItems.forEach((item) => {
      const prod = products.find((p) => p.barcode === item.barcode || p.id === item.id);
      list.push({
        id: item.id,
        barcode: item.barcode,
        name: item.name,
        type: "Fijo",
        supplierName: item.supplierName || "Sin proveedor asignado",
        quantity: item.quantity,
        unitCost: item.unitCost || prod?.purchasePrice || 0,
        stock: item.stock !== undefined ? item.stock : prod?.stock,
      });
    });

    optionGroups.forEach((g) => {
      g.options.forEach((opt) => {
        const prod = products.find((p) => p.barcode === opt.barcode || p.id === opt.id);
        list.push({
          id: opt.id,
          barcode: opt.barcode,
          name: opt.name,
          type: `Opción (${g.title})`,
          supplierName: opt.supplierName || "Sin proveedor asignado",
          quantity: g.minQuantity || 1,
          unitCost: opt.unitCost || prod?.purchasePrice || 0,
          stock: opt.stock !== undefined ? opt.stock : prod?.stock,
        });
      });
    });

    return list;
  }, [fixedItems, optionGroups, products]);

  // Proveedores únicos involucrados
  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    allComponentsList.forEach((c) => {
      if (c.supplierName) set.add(c.supplierName);
    });
    return Array.from(set);
  }, [allComponentsList]);

  // Manejadores para productos fijos
  const handleAddFixedProduct = async (prod: Product) => {
    const existing = fixedItems.find((f) => f.id === prod.id || (f.barcode && f.barcode === prod.barcode));
    if (existing) {
      setFixedItems(
        fixedItems.map((f) =>
          f.id === existing.id ? { ...f, quantity: f.quantity + 1 } : f
        )
      );
      setProductSearch("");
      return;
    }

    const supplierInfo = await fetchProductSupplier(prod.barcode || prod.id);

    setFixedItems([
      ...fixedItems,
      {
        id: prod.id,
        name: prod.name,
        barcode: prod.barcode,
        quantity: 1,
        unitPrice: prod.price || 0,
        unitCost: supplierInfo?.unitCost ?? prod.purchasePrice ?? 0,
        supplierName: supplierInfo?.supplierName,
        supplierId: supplierInfo?.supplierId,
        stock: prod.stock,
      },
    ]);
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

  // Agregar producto del catálogo a un grupo de opciones
  const handleAddCatalogProductToOptionGroup = async (groupId: string, prod: Product) => {
    const supplierInfo = await fetchProductSupplier(prod.barcode || prod.id);

    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        // Evitar duplicados por barcode o id dentro del mismo grupo
        if (g.options.some((o) => (o.barcode && o.barcode === prod.barcode) || o.id === prod.id)) {
          return g;
        }
        return {
          ...g,
          options: [
            ...g.options,
            {
              id: prod.id,
              name: prod.name,
              barcode: prod.barcode,
              unitCost: supplierInfo?.unitCost ?? prod.purchasePrice ?? 0,
              supplierName: supplierInfo?.supplierName,
              supplierId: supplierInfo?.supplierId,
              stock: prod.stock,
            },
          ],
        };
      })
    );
    setOptionSearches((prev) => ({ ...prev, [groupId]: "" }));
  };

  // Agregar opción de texto libre a un grupo de opciones
  const handleAddTextOptionToGroup = (groupId: string, text: string) => {
    if (!text.trim()) return;
    setOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: [
            ...g.options,
            {
              id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: text.trim(),
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
      const finalGallery = (await Promise.all(gallery.map((g) => uploadIfDataUrl(g)))).filter(Boolean);

      const generatedId = initialData?.id || `PACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const finalBarcode = barcode.trim() || initialData?.barcode || generatedId;

      // Configuración estructurada del pack
      const bundleConfig: BundleConfig = {
        isBundle: true,
        fixedItems,
        optionGroups,
      };

      // Costo consolidado del pack
      const computedPurchasePrice =
        costCalculation.totalCost > 0
          ? costCalculation.totalCost
          : Math.round(priceNum * 0.5);

      // Generar lista de características legibles para los clientes en la tienda
      const cleanFeatures: string[] = [];
      fixedItems.forEach((item) => {
        cleanFeatures.push(`${item.quantity > 1 ? `${item.quantity} ` : ""}${item.name}`);
      });
      optionGroups.forEach((group) => {
        cleanFeatures.push(`${group.title} (a elección)`);
      });

      // El stock del pack se almacena según el stock dinámico calculado
      const computedStock = stockCalculation.stock;

      const packPayload: Partial<Product> = {
        id: generatedId,
        barcode: finalBarcode,
        name: name.trim(),
        description: description.trim().replace(/__BUNDLE_CONFIG__:\{.*?\}/g, "").trim(),
        price: priceNum,
        offerPrice: offerPrice.trim() ? parseFloat(offerPrice) : null,
        stock: computedStock,
        categories: categories.includes("Packs") ? categories : ["Packs", ...categories],
        featured,
        isActive,
        image: finalImageUrl,
        gallery: finalGallery,
        slug: name.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-"),
        purchasePrice: computedPurchasePrice,
        bundle_config: bundleConfig,
        features: cleanFeatures,
      };

      const targetId = initialData?.id || initialData?.barcode || finalBarcode;
      if (isEditing && targetId) {
        await updateProduct(targetId, packPayload);
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
              Configura los productos sueltos que componen el pack y sus opciones. El stock y proveedores se calculan automáticamente.
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
        {/* Columna Izquierda: Datos Básicos, Stock Dinámico e Imagen (1 columna) */}
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

            <div>
              <Input
                label="Código / Barcode del Pack"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Autogenerado (ej: PACK-...)"
              />
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

          {/* STOCK DINÁMICO CALCULADO AL MOMENTO */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CalculatorIcon className="size-5 text-brand-600" />
                Stock del Pack
              </h2>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  stockCalculation.stock > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {stockCalculation.stock > 0 ? `${stockCalculation.stock} packs armables` : "Agotado"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {stockCalculation.stock}
                </span>
                <span className="text-sm text-gray-500 font-medium">unidades disponibles</span>
              </div>

              {stockCalculation.limitingItem ? (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                  <ExclamationTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Componente limitante:</span>
                    <span>{stockCalculation.limitingItem}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
                  El stock se calcula automáticamente según la menor disponibilidad de sus componentes sueltos.
                </p>
              )}

              <p className="text-[11px] text-gray-400 border-t border-gray-200 pt-2 leading-relaxed">
                ℹ️ Los packs se <strong>arman al momento</strong>: no tienen stock físico separado. Al venderse, se descuenta directamente de cada producto suelto individual.
              </p>
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

          {/* Resumen Financiero y Rentabilidad */}
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
                <span className="text-emerald-800">Costo consolidado insumos:</span>
                <span className="font-medium">{clp(financialSummary.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Margen bruto estimado:</span>
                <span className="font-bold text-emerald-900">
                  {clp(financialSummary.estimatedMargin)} ({financialSummary.marginPct}%)
                </span>
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
                  Son los artículos obligatorios que componen el pack (ej. chorizos, pan, carbón).
                </p>
              </div>
              <span className="text-xs font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                {fixedItems.length} ítems fijos
              </span>
            </div>

            {/* Buscador para agregar producto del catálogo */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Buscar y añadir producto del catálogo:
              </label>
              <input
                type="text"
                placeholder="Escribe el nombre o código de barras (ej: Chorizo, Longaniza, Pan)..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              />

              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddFixedProduct(p)}
                      className="w-full text-left p-3 hover:bg-brand-50 flex items-center justify-between gap-3 text-sm transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-800 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>SKU: {p.barcode || p.id}</span>
                          <span>·</span>
                          <span className={p.stock > 0 ? "text-emerald-600" : "text-rose-500 font-medium"}>
                            Stock: {p.stock} u.
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-gray-800 block">{clp(p.price)}</span>
                        {p.purchasePrice ? (
                          <span className="text-[11px] text-gray-400">Costo: {clp(p.purchasePrice)}</span>
                        ) : null}
                      </div>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        {item.supplierName && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                            {item.supplierName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Normal: {clp(item.unitPrice || 0)} c/u {item.unitCost ? `· Costo: ${clp(item.unitCost)}` : ""}
                        {item.stock !== undefined ? ` · Stock suelto: ${item.stock} u.` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
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
                {optionGroups.map((group) => {
                  const optMatches = getFilteredProductsForOption(optionSearches[group.id] || "");
                  return (
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
                                className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-xs"
                              >
                                <span>{opt.name}</span>
                                {opt.stock !== undefined && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                      opt.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600 font-bold"
                                    }`}
                                  >
                                    Stock: {opt.stock}
                                  </span>
                                )}
                                {opt.supplierName && (
                                  <span className="text-[10px] text-gray-400">({opt.supplierName})</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromGroup(group.id, opt.id)}
                                  className="text-gray-400 hover:text-red-500 ml-0.5 font-bold text-sm"
                                  title="Quitar opción"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Buscador de catálogo para añadir como opción */}
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="🔍 Buscar y añadir producto del catálogo como opción (ej: Coca-Cola Zero 3L)..."
                              value={optionSearches[group.id] || ""}
                              onChange={(e) =>
                                setOptionSearches((prev) => ({ ...prev, [group.id]: e.target.value }))
                              }
                              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white outline-none focus:ring-2 focus:ring-brand-500"
                            />

                            {optMatches.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-gray-100">
                                {optMatches.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleAddCatalogProductToOptionGroup(group.id, p)}
                                    className="w-full text-left p-2.5 hover:bg-brand-50 flex items-center justify-between text-xs transition-colors"
                                  >
                                    <div className="truncate">
                                      <span className="font-semibold text-gray-800">{p.name}</span>
                                      <span className="text-gray-400 ml-2">({p.barcode})</span>
                                    </div>
                                    <span
                                      className={`shrink-0 ml-2 font-medium ${
                                        p.stock > 0 ? "text-emerald-700" : "text-rose-500"
                                      }`}
                                    >
                                      Stock: {p.stock} u.
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Fallback de texto manual si no está en catálogo */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="O escribir opción manual de texto..."
                              value={tempOptionText[group.id] || ""}
                              onChange={(e) =>
                                setTempOptionText((prev) => ({ ...prev, [group.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddTextOptionToGroup(group.id, tempOptionText[group.id] || "");
                                }
                              }}
                              className="flex-1 text-xs border border-gray-200 rounded-xl p-2 bg-white text-gray-600 outline-none"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddTextOptionToGroup(group.id, tempOptionText[group.id] || "")}
                            >
                              + Añadir Manual
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN 3: PROVEEDORES Y COSTOS DE COMPONENTES */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TruckIcon className="size-5 text-brand-600" />
                  3. Proveedores y Costos de Componentes
                </h2>
                <p className="text-xs text-gray-500">
                  Cada componente del pack mantiene su propio proveedor, costo unitario y stock suelto en inventario.
                </p>
              </div>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {allComponentsList.length} productos
              </span>
            </div>

            {allComponentsList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Añade productos fijos u opciones arriba para ver el desglose de proveedores y costos de reposición.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Producto Componente</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Proveedor Asignado</th>
                        <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                        <th className="py-2.5 px-3 text-right">Cant. Pack</th>
                        <th className="py-2.5 px-3 text-right">Stock Suelto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {allComponentsList.map((comp, idx) => (
                        <tr key={`${comp.barcode || comp.id}-${idx}`} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-800 block">{comp.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {comp.barcode || comp.id}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                comp.type === "Fijo"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {comp.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded text-[11px]">
                              {comp.supplierName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-gray-700">
                            {clp(comp.unitCost || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-800">
                            {comp.quantity} u.
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-semibold ${
                                (comp.stock ?? 0) > 0 ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              {comp.stock ?? 0} u.
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumen de proveedores únicos involucrados */}
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-950 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Proveedores del pack:</span>
                  {uniqueSuppliers.length > 0 ? (
                    uniqueSuppliers.map((s) => (
                      <span
                        key={s}
                        className="bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-xs font-medium"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Sin proveedores registrados</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
