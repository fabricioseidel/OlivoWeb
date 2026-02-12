"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Package, Save, Send } from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
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
  product_id: number; // Cambiado de string a number
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

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<number, OrderItem>>(new Map());
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (supplierId) {
        try {
          setLoading(true);
          
          // Cargar proveedor
          const supplierRes = await fetch(`/api/admin/suppliers/${supplierId}`);
          if (supplierRes.ok) {
            const supplierData = await supplierRes.json();
            setSupplier(supplierData);
          }

          // Cargar productos del proveedor
          const productsRes = await fetch(`/api/admin/suppliers/${supplierId}/products`);
          if (productsRes.ok) {
            const productsData = await productsRes.json();
            setProducts(productsData);
          }
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [supplierId]);

  const toggleProduct = (product: Product) => {
    const newItems = new Map(selectedItems);
    
    if (newItems.has(product.id)) {
      newItems.delete(product.id);
    } else {
      const minStock = product.reorder_threshold || 10;
      const deficit = Math.max(minStock - product.stock, 0);
      // Usar default_reorder_qty si está definido, sino usar el déficit o mínimo 1
      const suggestedQty = product.default_reorder_qty || Math.max(deficit, 1);
      
      newItems.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.barcode,
        supplier_sku: product.supplier_sku || product.barcode,
        quantity: suggestedQty,
        unit_cost: product.purchase_price,
        subtotal: suggestedQty * product.purchase_price,
      });
    }
    
    setSelectedItems(newItems);
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const newItems = new Map(selectedItems);
    const item = newItems.get(productId);
    
    if (item && quantity > 0) {
      item.quantity = quantity;
      item.subtotal = quantity * item.unit_cost;
      newItems.set(productId, item);
      setSelectedItems(newItems);
    }
  };

  const updateUnitCost = (productId: number, unitCost: number) => {
    const newItems = new Map(selectedItems);
    const item = newItems.get(productId);
    
    if (item && unitCost >= 0) {
      item.unit_cost = unitCost;
      item.subtotal = item.quantity * unitCost;
      newItems.set(productId, item);
      setSelectedItems(newItems);
    }
  };

  const calculateTotal = () => {
    return Array.from(selectedItems.values()).reduce(
      (sum, item) => sum + item.subtotal,
      0
    );
  };

  const generateWhatsAppMessage = () => {
    if (!supplier || selectedItems.size === 0) return '';

    const items = Array.from(selectedItems.values());
    const total = calculateTotal();
    
    let message = `🛒 *Pedido para ${supplier.name}*\n\n`;
    message += `📅 Fecha esperada: ${expectedDate || 'Por definir'}\n\n`;
    message += `*Productos:*\n`;
    
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.product_name}\n`;
      message += `   • Código: ${item.supplier_sku}\n`;
      message += `   • Cantidad: ${item.quantity}\n`;
      message += `   • Precio unit.: $${item.unit_cost.toFixed(2)} (aprox.)\n`;
      message += `   • Subtotal: $${item.subtotal.toFixed(2)}\n\n`;
    });
    
    message += `💰 *Total aproximado: $${total.toFixed(2)}*\n`;
    
    if (notes) {
      message += `\n📝 Notas:\n${notes}`;
    }
    
    return message;
  };

  const sendWhatsApp = () => {
    if (!supplier?.whatsapp && !supplier?.phone) {
      alert('Este proveedor no tiene WhatsApp configurado');
      return;
    }

    const message = generateWhatsAppMessage();
    const phone = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.size === 0) {
      alert("Debes seleccionar al menos un producto");
      return;
    }

    if (!expectedDate) {
      alert("Debes indicar una fecha esperada de entrega");
      return;
    }

    try {
      setSaving(true);
      
      const orderData = {
        supplier_id: supplierId,
        expected_date: expectedDate,
        notes: notes,
        items: Array.from(selectedItems.values()),
        total: calculateTotal(),
      };

      const response = await fetch("/api/admin/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        await response.json();
        alert("Pedido creado exitosamente");
        router.push(`/admin/pedidos-proveedor`);
      } else {
        throw new Error("Error al crear el pedido");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error al crear el pedido");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Proveedor no encontrado</p>
          <Link
            href="/admin/proveedores"
            className="text-red-600 hover:text-red-700 underline mt-2 inline-block"
          >
            Volver a proveedores
          </Link>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/reabastecimiento"
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Nuevo Pedido a Proveedor
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-lg text-gray-700">
                <span className="font-semibold">{supplier.name}</span>
              </p>
              {supplier.contact_name && (
                <p className="text-sm text-gray-600">
                  Contacto: {supplier.contact_name}
                </p>
              )}
              {supplier.phone && (
                <p className="text-sm text-gray-600">
                  Tel: {supplier.phone}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total aproximado del pedido</p>
            <p className="text-2xl font-bold text-blue-600">
              ${total.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedItems.size} productos seleccionados
            </p>
            <p className="text-xs text-amber-600 mt-1">
              * Precios pueden variar
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del pedido */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Información del Pedido</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Esperada de Entrega *
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Información adicional sobre el pedido..."
              />
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Catálogo de Productos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona los productos que deseas incluir en el pedido
            </p>
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No hay productos asociados a este proveedor
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Seleccionar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Precio Unit. (aprox.)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => {
                    const isSelected = selectedItems.has(product.id);
                    const item = selectedItems.get(product.id);
                    const minStock = product.reorder_threshold || 10;
                    const isLowStock = product.stock < minStock;

                    return (
                      <tr
                        key={product.id}
                        className={`${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        } ${isLowStock ? "border-l-4 border-l-yellow-400" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProduct(product)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            {isLowStock && (
                              <span className="text-xs text-yellow-600">
                                ⚠️ Stock bajo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {product.barcode}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={
                              isLowStock
                                ? "text-yellow-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {product.stock} / {minStock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isSelected && item ? (
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(product.id, parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isSelected && item ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) =>
                                updateUnitCost(product.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-600">
                              ${product.purchase_price.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {isSelected && item ? (
                            <span className="text-blue-600">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen y acciones */}
        <div className="flex items-center justify-between bg-white border rounded-lg p-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {selectedItems.size} productos seleccionados
            </p>
            <p className="text-2xl font-bold text-gray-900">
              Total aproximado: ${total.toFixed(2)}
            </p>
            <p className="text-xs text-amber-600">
              * Los precios pueden variar según el proveedor
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/reabastecimiento"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </Link>
            
            {/* Botón de WhatsApp */}
            {(supplier?.whatsapp || supplier?.phone) && (
              <button
                type="button"
                onClick={sendWhatsApp}
                disabled={selectedItems.size === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar por WhatsApp
              </button>
            )}
            
            <button
              type="submit"
              disabled={saving || selectedItems.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Crear Pedido"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
