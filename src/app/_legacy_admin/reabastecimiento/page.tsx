"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

type SupplierSummary = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type ProductSupplier = {
  id: string;
  supplierId: string;
  productId: string;
  priority: number;
  supplierSku?: string | null;
  defaultReorderQty?: number | null;
  reorderThreshold?: number | null;
  deficit: number;
  suggestedQty: number;
  supplier: SupplierSummary;
};

type ReplenishmentProduct = {
  productId: string;
  name: string;
  stock: number;
  threshold: number;
  deficit: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  suppliers: ProductSupplier[];
};

type ReplenishmentResponse = {
  generatedAt: string;
  totalProducts: number;
  lowStockCount: number;
  items: ReplenishmentProduct[];
};

type SupplierGroupItem = {
  product: ReplenishmentProduct;
  assignment: ProductSupplier;
};

type SupplierGroup = {
  supplier: SupplierSummary;
  lowProducts: SupplierGroupItem[];
};

function buildSupplierGroups(items: ReplenishmentProduct[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();

  items.forEach((product) => {
    product.suppliers.forEach((assignment) => {
      const supplierId = assignment.supplier.id;
      if (!map.has(supplierId)) {
        map.set(supplierId, {
          supplier: assignment.supplier,
          lowProducts: [],
        });
      }
      map.get(supplierId)!.lowProducts.push({
        product,
        assignment,
      });
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.supplier.name.localeCompare(b.supplier.name),
  );
}

export default function ReplenishmentPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lowData, setLowData] = useState<ReplenishmentResponse | null>(null);

  const loadLowData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/replenishment");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "No se pudo cargar la información de reposición",
        );
      }
      const response = (await res.json()) as ReplenishmentResponse;
      setLowData(response);
    } catch (error: any) {
      console.error("[Replenishment] load error:", error);
      showToast(error.message || "Error cargando reposición", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadLowData();
  }, [loadLowData]);

  const supplierGroups = useMemo(
    () => buildSupplierGroups(lowData?.items ?? []),
    [lowData],
  );

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reposición con proveedores
          </h1>
          <p className="text-sm text-gray-500">
            Gestiona rápidamente los pedidos a proveedores sin perder de vista los
            productos con stock bajo.
          </p>
          {lowData?.generatedAt ? (
            <p className="text-xs text-gray-400 mt-1">
              Actualizado: {new Date(lowData.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={loadLowData} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar datos"}
        </Button>
      </div>

      <section className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Productos bajos de stock por proveedor
            </h2>
            <p className="text-sm text-gray-500">
              Cada tarjeta muestra los productos críticos asignados a ese proveedor.
              Desde aquí puedes iniciar un nuevo pedido en pocos pasos.
            </p>
          </div>
          {lowData ? (
            <div className="text-sm text-gray-500">
              Total productos monitoreados:{" "}
              <span className="font-semibold text-gray-700">
                {lowData.totalProducts}
              </span>{" "}
              · Con alerta de stock:{" "}
              <span className="font-semibold text-red-600">
                {lowData.lowStockCount}
              </span>
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Cargando información...</p>
          </div>
        ) : supplierGroups.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No hay productos con stock por debajo del umbral configurado.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {supplierGroups.map((group) => (
              <SupplierCard
                key={group.supplier.id}
                group={group}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SupplierCard({
  group,
}: {
  group: SupplierGroup;
}) {
  const lowProducts = group.lowProducts.sort(
    (a, b) => b.assignment.deficit - a.assignment.deficit,
  );
  const topProducts = lowProducts.slice(0, 3);
  const remaining = lowProducts.length - topProducts.length;

  return (
    <div className="border border-gray-200 rounded-lg p-5 flex flex-col gap-4 shadow-sm hover:shadow transition">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {group.supplier.name}
          </h3>
          <p className="text-xs text-gray-500">
            {group.supplier.contact_name
              ? `Contacto: ${group.supplier.contact_name}`
              : "Sin contacto asignado"}
            {group.supplier.whatsapp
              ? ` • WhatsApp: ${group.supplier.whatsapp}`
              : group.supplier.phone
              ? ` • Tel: ${group.supplier.phone}`
              : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-3 py-1 rounded-full">
          {group.lowProducts.length} productos críticos
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {topProducts.map(({ product, assignment }) => (
          <span
            key={product.productId}
            className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
          >
            <span className="font-medium">{product.name}</span>
            <span className="text-red-600">
              Stock {product.stock}/{assignment.reorderThreshold ?? product.threshold}
            </span>
          </span>
        ))}
        {remaining > 0 ? (
          <span className="text-xs text-gray-500">
            +{remaining} producto(s) adicional(es)
          </span>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link href={`/admin/pedidos-proveedor/nuevo?supplierId=${group.supplier.id}`}>
          <Button>
            Crear Pedido
          </Button>
        </Link>
      </div>
    </div>
  );
}
