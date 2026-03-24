"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePOS } from "@/contexts/POSContext";
import { ProductUI } from "@/types";
import OlivoButton from "@/components/OlivoButton";
import { 
  TrashIcon, MinusIcon, PlusIcon, MagnifyingGlassIcon,
  ShoppingBagIcon, XMarkIcon, CreditCardIcon, BanknotesIcon,
  CameraIcon, ArrowPathIcon, CheckCircleIcon, EnvelopeIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { createSaleAction } from "@/actions/sales";
import { useToast } from "@/contexts/ToastContext";
import POSScanner from "@/components/admin/POSScanner";

const PRODUCTS_PER_PAGE = 40;

export default function POSPage() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, total, isScanning, appliedCoupon, discount, finalTotal, setAppliedCoupon, applyDiscount } = usePOS();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState<ProductUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [showScanner, setShowScanner] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showCart, setShowCart] = useState(false); // Mobile toggle
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const change = useMemo(() => Math.max(0, cashReceived - finalTotal), [cashReceived, finalTotal]);

  // Filtered products based on search
  const products = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allProducts;
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [searchQuery, allProducts]);

  // Only show visibleCount products to prevent rendering thousands at once
  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);

  // Reset visible count when search changes
  useEffect(() => { setVisibleCount(PRODUCTS_PER_PAGE); }, [searchQuery]);

  // Load products once
  useEffect(() => {
    const load = async () => {
      try {
        const { searchProducts } = await import("@/services/products");
        const results = await searchProducts("");
        setAllProducts(results);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Load more on scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(prev => Math.min(prev + PRODUCTS_PER_PAGE, products.length));
    }
  }, [products.length]);

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    if (paymentMethod === "cash" && cashReceived < finalTotal) {
      showToast("El monto recibido es menor al total", "error");
      return;
    }
    setProcessing(true);
    try {
      const result = await createSaleAction({
        total: finalTotal, paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : finalTotal,
        changeGiven: paymentMethod === 'cash' ? change : 0,
        tax: 0,
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.offerPrice || item.price,
          total_price: (item.offerPrice || item.price) * item.quantity
        }))
      });
      if (result.ok) {
        // Send receipt email if customer provided email
        if (customerEmail && customerEmail.includes("@")) {
          setSendingReceipt(true);
          try {
            await fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "pos_receipt",
                to: customerEmail,
                saleId: result.saleId || Date.now(),
                total: finalTotal,
                paymentMethod,
                cashReceived: paymentMethod === "cash" ? cashReceived : undefined,
                changeGiven: paymentMethod === "cash" ? change : undefined,
                items: cart.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: (item.offerPrice || item.price) * item.quantity,
                })),
              }),
            });
            showToast(`📧 Boleta enviada a ${customerEmail}`, "success");
          } catch {
            showToast("Venta OK pero no se pudo enviar la boleta", "error");
          } finally {
            setSendingReceipt(false);
          }
        }
        clearCart();
        setCashReceived(0);
        setCustomerEmail("");
        setPaymentMethod("cash");
        showToast("✓ Venta registrada con éxito", "success");
      } else {
        showToast(result.toastMessage || "Error en la venta", "error");
      }
    } catch { showToast("Error crítico al procesar venta", "error"); }
    finally { setProcessing(false); }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-slate-950 text-white overflow-hidden">
      {/* ── Product Grid ── */}
      <div className={`flex-1 flex flex-col p-3 lg:p-4 ${showCart ? 'hidden lg:flex' : 'flex'}`}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-white focus:border-emerald-500 outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }} className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400"><XMarkIcon className="h-4 w-4" /></button>
            )}
            <button onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-500 rounded-lg" title="Escanear">
              <CameraIcon className="h-5 w-5" />
            </button>
          </div>
          {/* Mobile cart toggle */}
          <button onClick={() => setShowCart(true)} className="lg:hidden relative bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-600/20">
            <ShoppingBagIcon className="h-5 w-5" />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-emerald-600">{cart.length}</span>}
          </button>
        </div>

        {/* Results info */}
        {searchQuery && (
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
            {products.length} resultados para &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {/* Products grid with scroll loading */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-2 content-start pb-20 lg:pb-0" onScroll={handleScroll}>
          {loading ? Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-900/50 rounded-xl animate-pulse" />
          )) : visibleProducts.map((p) => (
            <button key={p.id} 
              disabled={p.stock <= 0}
              onClick={() => { 
                if (p.stock <= 0) {
                  showToast("Producto sin stock", "error");
                  return;
                }
                addToCart(p); 
                showToast(`+ ${p.name}`, "success"); 
              }}
              className={`group bg-slate-900 rounded-xl p-2 border transition-all active:scale-95 text-left flex flex-col h-full ${
                p.stock <= 0 ? 'opacity-50 grayscale border-slate-800 cursor-not-allowed' : 'border-slate-800 hover:border-emerald-500'
              }`}>
              <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-slate-800">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="20vw" />
                {p.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-[9px] font-bold text-red-400 uppercase">Sin Stock</span></div>}
              </div>
              <h3 className="text-[11px] font-bold truncate">{p.name}</h3>
              <p className="text-emerald-400 font-black text-sm">$ {(p.offerPrice || p.price).toLocaleString()}</p>
              <p className="text-[9px] text-slate-500 font-bold">{p.stock} disp.</p>
            </button>
          ))}
          {/* Load more indicator */}
          {visibleCount < products.length && (
            <div className="col-span-full py-4 text-center">
              <button onClick={() => setVisibleCount(prev => prev + PRODUCTS_PER_PAGE)}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl">
                Cargar más ({products.length - visibleCount} restantes)
              </button>
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-600">
              <MagnifyingGlassIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cart & Checkout ── */}
      <div className={`w-full lg:w-[380px] h-full flex flex-col bg-slate-900 border-l border-slate-800 ${showCart ? 'flex flex-1' : 'hidden lg:flex'}`}>
        {/* Mobile back button */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <button onClick={() => setShowCart(false)} className="lg:hidden text-slate-400 text-sm font-bold">← Productos</button>
          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-500">Carrito</h2>
          <button onClick={clearCart} className="text-slate-500 hover:text-red-400" title="Vaciar carrito"><TrashIcon className="h-5 w-5" /></button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <ShoppingBagIcon className="h-12 w-12 mb-3 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">Carrito vacío</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold truncate">{item.name}</h4>
                  <span className="text-[10px] text-emerald-400 font-bold">$ {(item.offerPrice || item.price).toLocaleString()} c/u</span>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400"><XMarkIcon className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-slate-400 active:scale-90"><MinusIcon className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 text-emerald-500 active:scale-90"><PlusIcon className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-black">$ {((item.offerPrice || item.price) * item.quantity).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Total & Descuentos */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase font-bold tracking-widest">Subtotal</span>
              <span className="text-sm font-bold">$ {total.toLocaleString()}</span>
            </div>
            
            {appliedCoupon && (
              <div className="flex justify-between items-center bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/20">
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-500 uppercase font-black tracking-widest">Cupón Aplicado</span>
                  <span className="text-xs font-bold text-white">{appliedCoupon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-400">- $ {discount.toLocaleString()}</span>
                  <button onClick={() => { setAppliedCoupon(null); applyDiscount(0); }} className="text-slate-500 hover:text-red-400">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-end mt-2">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Total a Pagar</span>
                <p className="text-3xl font-black text-white">$ {finalTotal.toLocaleString()}</p>
              </div>
              <span className="text-slate-500 font-bold text-xs">{cart.length} items</span>
            </div>
          </div>

          {/* Customer email (optional) */}
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="email"
              placeholder="Email del cliente (opcional)"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            {customerEmail && (
              <button onClick={() => setCustomerEmail("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'cash', icon: BanknotesIcon, label: 'Efectivo' },
              { id: 'card', icon: CreditCardIcon, label: 'Tarjeta' },
              { id: 'transfer', icon: ArrowPathIcon, label: 'Transf.' }
            ].map((m) => (
              <button key={m.id} onClick={() => { setPaymentMethod(m.id as any); if (m.id !== 'cash') setCashReceived(0); }}
                className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${paymentMethod === m.id ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <m.icon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px] font-black uppercase">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Cash received & change */}
          {paymentMethod === "cash" && cart.length > 0 && (
            <div className="space-y-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Efectivo recibido</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-emerald-500"
                  value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value))} placeholder="0" />
              </div>
              {cashReceived > 0 && (
                <div className={`flex justify-between items-center p-3 rounded-xl ${change >= 0 && cashReceived >= total ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-red-900/30 border border-red-800'}`}>
                  <span className="text-xs font-bold uppercase text-slate-400">Vuelto</span>
                  <span className={`text-xl font-black ${change >= 0 && cashReceived >= total ? 'text-emerald-400' : 'text-red-400'}`}>$ {change.toLocaleString()}</span>
                </div>
              )}
              {/* Quick cash buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[1000, 2000, 5000, 10000].map(v => (
                  <button key={v} onClick={() => setCashReceived(v)}
                    className={`text-[10px] font-bold py-2 rounded-lg transition-colors ${cashReceived === v ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                    ${(v/1000)}k
                  </button>
                ))}
              </div>
              {/* Exact amount button */}
              <button onClick={() => setCashReceived(finalTotal)}
                className="w-full text-[10px] font-bold py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                Monto exacto (${finalTotal.toLocaleString()})
              </button>
            </div>
          )}

          {/* Checkout button */}
          <OlivoButton fullWidth size="lg" disabled={cart.length === 0 || processing || (paymentMethod === 'cash' && cashReceived < finalTotal && cart.length > 0)}
            onClick={handleCheckout} className="h-14 text-sm uppercase tracking-widest">
            {processing ? "Procesando..." : (
              <>
                <CheckCircleIcon className="h-5 w-5 mr-2 inline" />
                {paymentMethod === 'cash' && cashReceived >= finalTotal
                  ? `Cobrar (Vuelto: $${change.toLocaleString()})`
                  : "Completar Venta"}
              </>
            )}
          </OlivoButton>
        </div>
      </div>
      
      {showScanner && (
        <POSScanner onScan={(barcode) => {
          const found = allProducts.find(p => p.id === barcode);
          if (found) { addToCart(found); showToast(`Añadido: ${found.name}`, "success"); }
          else showToast(`No encontrado: ${barcode}`, "error");
        }} onClose={() => setShowScanner(false)} />
      )}

      {isScanning && (
        <div className="fixed bottom-4 right-4 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30 animate-pulse z-50">
          <span className="text-xs font-bold uppercase tracking-widest">Escaneando...</span>
        </div>
      )}
    </div>
  );
}
