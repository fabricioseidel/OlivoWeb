"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  TagIcon
} from "@heroicons/react/24/outline";

import { updateProductAction } from "@/actions/products";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import MultiImageUpload from "@/components/ui/MultiImageUpload";
import { useToast } from "@/contexts/ToastContext";
import { ProductFormData, productSchema } from "@/schemas/product.schema";
import { ProductRecord } from "@/server/products.service";
import { ProductFormState } from "@/types/forms/productFormState";

interface EditProductFormProps {
  productId: string;
  initialProduct: ProductRecord;
}

function mapProductToForm(product: ProductRecord): ProductFormData {
  return {
    nombre: product.name ?? "",
    categoria: product.category ?? "",
    descripcion: product.description ?? "",
    precio: Number(product.sale_price ?? 0),
    precioOriginal: product.suggested_price ? Number(product.suggested_price) : undefined,
    stock: Number(product.stock ?? 0),
    barcode: product.barcode ?? "",
    image: product.image_url ?? "",
    gallery: product.gallery ?? [],
    isActive: product.is_active ?? true,
    isFeatured: product.featured ?? false,
    // vendor, tags, sku no están en ProductRecord explícitamente, se pueden agregar después
  };
}

export default function EditProductForm({ productId, initialProduct }: EditProductFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverState, setServerState] = useState<ProductFormState>();
  const [isPending, startTransition] = useTransition();

  const defaultValues = useMemo(() => mapProductToForm(initialProduct), [initialProduct]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues,
  });

  // Watch for media updates
  const mainImage = watch("image");
  const galleryImages = watch("gallery") || [];
  const isActive = watch("isActive");

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!serverState?.errors) return;
    Object.entries(serverState.errors).forEach(([field, messages]) => {
      const message = messages?.[0];
      if (!message) return;
      // @ts-expect-error -- dynamic field names from server validation
      setError(field, { type: "server", message });
    });
  }, [serverState?.errors, setError]);

  useEffect(() => {
    if (serverState?.toastMessage) {
      showToast(serverState.toastMessage, serverState.toastType);
    }
  }, [serverState?.toastMessage, serverState?.toastType, showToast]);

  const onSubmit = handleSubmit((values) => {
    setServerState(undefined);
    startTransition(async () => {
      const result = await updateProductAction(productId, values);
      setServerState(result);

      if (result?.ok) {
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/productos" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a productos
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/productos"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Descartar
          </Link>
          <Button type="submit" loading={isPending} disabled={!isDirty && !isPending}>
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title & Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <Input
                label="Título"
                placeholder="Ej: Camiseta de algodón orgánico"
                error={errors.nombre?.message}
                {...register("nombre")}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  className="w-full min-h-[160px] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="Describe tu producto..."
                  {...register("descripcion")}
                />
                {errors.descripcion?.message && (
                  <p className="text-sm text-red-600">{errors.descripcion.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-gray-400" />
              Multimedia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Imagen Principal</span>
                <SingleImageUpload
                  value={mainImage || ""}
                  onChange={(url) => setValue("image", url, { shouldDirty: true })}
                  error={errors.image?.message as string}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Galería Adicional</span>
                <MultiImageUpload
                  values={galleryImages}
                  onChange={(urls) => setValue("gallery", urls, { shouldDirty: true })}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
              Precios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Precio"
                type="number"
                placeholder="0.00"
                prefix="$"
                step="0.01"
                error={errors.precio?.message}
                {...register("precio")}
              />
              <Input
                label="Precio de comparación"
                type="number"
                placeholder="0.00"
                prefix="$"
                step="0.01"
                helperText="Para mostrar un descuento"
                error={errors.precioOriginal?.message}
                {...register("precioOriginal")}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <input
                type="checkbox"
                id="tax"
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="tax" className="text-sm text-gray-600">Cobrar impuesto en la venta de este producto</label>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
              Inventario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SKU (Stock Keeping Unit)"
                placeholder="Ej: CAM-ALG-001"
                {...register("sku")}
              />
              <Input
                label="Código de barras (ISBN, UPC, GTIN)"
                placeholder="Ej: 1234567890123"
                {...register("barcode")}
              />
            </div>
            <div className="mt-4">
              <Input
                label="Cantidad disponible"
                type="number"
                placeholder="0"
                error={errors.stock?.message}
                {...register("stock")}
              />
            </div>
          </div>

        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1 space-y-6">

          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Estado del producto</h3>
            <div className="space-y-3">
              <select
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                value={isActive ? 'active' : 'draft'}
                onChange={(e) => setValue("isActive", e.target.value === 'active', { shouldDirty: true })}
              >
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="archived">Archivado</option>
              </select>
              <p className="text-xs text-gray-500">
                {isActive ? "Este producto está disponible en tu tienda." : "Este producto está oculto de tu tienda."}
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="featured"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    {...register("isFeatured")}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="featured" className="font-medium text-gray-700">Destacar producto</label>
                  <p className="text-gray-500">Mostrar en la página de inicio o banners.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-gray-400" />
              Organización
            </h3>
            <div className="space-y-4">
              {/* TODO: Add proper dropdown or Combobox for categories */}
              <Input
                label="Categoría"
                placeholder="Ej: Ropa"
                {...register("categoria")}
                error={errors.categoria?.message}
              />
              <Input
                label="Tipo de producto"
                placeholder="Ej: Camisas"
                {...register("categoria")} // Mapping visually to 'Product Type' but reusing category for now as schematic
              />
              <Input
                label="Vendedor"
                placeholder="Ej: Nike"
                {...register("vendor")}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Etiquetas</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  placeholder="Vintage, Algodón, Verano"
                  {...register("tags")}
                />
                <p className="text-xs text-gray-500">Separadas por coma</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverState?.message && (
        <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700 text-sm font-medium border border-red-200">
          {serverState.message}
        </div>
      )}
    </form>
  );
}
