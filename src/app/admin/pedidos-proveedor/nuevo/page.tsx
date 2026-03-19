"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PaperAirplaneIcon, CheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  whatsapp?: string;
}

interface Product {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  purchase_price: number;
  reorder_threshold: number | null;
  supplier_id: string;
  supplier_sku?: string;
  default_reorder_qty?: number;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  supplier_sku: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export default function NuevoPedidoProveedorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplierId");
  const { showToast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<number, OrderItem>>(new Map());
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!supplierId) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [supRes, prodsRes] = await Promise.all([
          fetch(`/api/admin/suppliers/${supplierId}`),
          fetch(`/api/admin/suppliers/${supplierId}/products`),
        ]);

        if (supRes.ok) setSupplier(await supRes.json());
        if (prodsRes.ok) {
          const prodsData = await prodsRes.json();
          setProducts(prodsData);

          // AUTO-SELECT: Products below reorder threshold
          const autoMap = new Map<number, OrderItem>();
          prodsData.forEach((p: Product) => {
            const threshold = p.reorder_threshold || 5;
            if (p.stock <= threshold) {
              const qty = p.default_reorder_qty || Math.max(threshold - p.stock, 1);
              autoMap.set(p.id, {
                product_id: p.id,
                product_name: p.name,
                product_sku: p.barcode,
                supplier_sku: p.supplier_sku || p.barcode,
                quantity: qty,
                unit_cost: p.purchase_price,
                subtotal: qty * p.purchase_price,
              });
            }
          });
          if (autoMap.size > 0) setSelectedItems(autoMap);
        }

        // Auto-set expected date to 3 days from now
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setExpectedDate(d.toISOString().split("T")[0]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [supplierId]);

  const toggleProduct = (product: Product) => {
    const next = new Map(selectedItems);
    if (next.has(product.id)) {
      next.delete(product.id);
    } else {
      const threshold = product.reorder_threshold || 5;
      const qty = product.default_reorder_qty || Math.max(threshold - product.stock, 1);
      next.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.barcode,
        supplier_sku: product.supplier_sku || product.barcode,
        quantity: qty,
        unit_cost: product.purchase_price,
        subtotal: qty * product.purchase_price,
      });
    }
    setSelectedItems(next);
  };

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) return;
    const next = new Map(selectedItems);
    const item = next.get(id);
    if (item) {
      item.quantity = qty;
      item.subtotal = qty * item.unit_cost;
      next.set(id, { ...item });
      setSelectedItems(next);
    }
  };

  const total = useMemo(
    () => Array.from(selectedItems.values()).reduce((s, i) => s + i.subtotal, 0),
    [selectedItems]
  );

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q)
    );
  }, [products, searchTerm]);

  const generateWhatsAppMessage = () => {
    if (!supplier || selectedItems.size === 0) return "";
    const items = Array.from(selectedItems.values());
    let msg = `🛒 *Pedido para ${supplier.name}*\n\n`;
    msg += `📅 Entrega esperada: ${expectedDate || "Por definir"}\n\n`;
    msg += `*Productos:*\n`;
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.product_name} — ${item.quantity} uds x $${item.unit_cost.toFixed(0)} = $${item.subtotal.toFixed(0)}\n`;
    });
    msg += `\n💰 *Total aprox: $${total.toFixed(0)}*`;
    if (notes) msg += `\n\n📝 ${notes}`;
    return msg;
  };

  const sendWhatsApp = () => {
    const phone = (supplier?.whatsapp || supplier?.phone || "").replace(/\D/g, "");
    if (!phone) { showToast("Sin WhatsApp configurado", "warning"); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generateWhatsAppMessage())}`, "_blank");
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) { showToast("Selecciona al menos un producto", "warning"); return; }
    if (!expectedDate) { showToast("Indica fecha de entrega", "warning"); return; }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          expected_date: expectedDate,
          notes,
          items: Array.from(selectedItems.values()),
          total,
        }),
      });

      if (res.ok) {
        showToast("¡Pedido creado!", "success");
        router.push("/admin/reabastecimiento?tab=pedidos");
      } else {
        throw new Error("Error al crear pedido");
      }
    } catch (error: any) {
      showToast(error.message || "Error creando pedido", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-semibold">Proveedor no encontrado</p>
          <Link href="/admin/reabastecimiento" className="text-red-600 underline text-sm mt-2 inline-block">
            Volver a Compras
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-3 px-1 border-b">
        <div className="flex items-center gap-3">
          <Link href="/admin/reabastecimiento" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">Pedido a {supplier.name}</h1>
            <p className="text-[10px] text-gray-500">
              {selectedItems.size} sel. · Total: ${total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Date + Notes */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Entrega esperada
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Notas
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Pedir factura"
            />
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Product Cards */}
      <div className="px-4 space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No hay productos para este proveedor
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isSelected = selectedItems.has(product.id);
            const item = selectedItems.get(product.id);
            const threshold = product.reorder_threshold || 5;
            const isLow = product.stock <= threshold;
            const isZero = product.stock === 0;

            return (
              <div
                key={product.id}
                className={`rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-300 shadow-sm"
                    : isZero
                    ? "bg-red-50/50 border-red-200"
                    : isLow
                    ? "bg-yellow-50/50 border-yellow-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Row 1: Name + toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-[10px] text-gray-400">{product.barcode}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-black ${
                      isZero ? "text-red-600" : isLow ? "text-yellow-600" : "text-gray-600"
                    }`}>
                      Stock: {product.stock}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      ${product.purchase_price > 0 ? product.purchase_price.toFixed(0) : "—"}/u
                    </div>
                  </div>
                </div>

                {/* Row 2: Quantity controls (if selected) */}
                {isSelected && item && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold flex items-center justify-center active:bg-gray-100"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQty(product.id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center py-1 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        min={1}
                      />
                      <button
                        onClick={() => updateQty(product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-600 font-bold flex items-center justify-center active:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-700">
                        ${item.subtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Footer */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t shadow-lg p-4 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-lg font-black text-gray-900">${total.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">{selectedItems.size} productos</div>
            </div>

            {(supplier?.whatsapp || supplier?.phone) && (
              <button
                type="button"
                onClick={sendWhatsApp}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition"
                title="Enviar por WhatsApp"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 transition font-bold text-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear Pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
