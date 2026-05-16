"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { usePOS } from "@/contexts/POSContext";
import { useBranch } from "@/contexts/BranchContext";
import { ProductUI } from "@/types";
import { createSaleAction } from "@/actions/sales";
import { useToast } from "@/contexts/ToastContext";
import UnifiedScanner from "@/components/admin/scanner/UnifiedScanner";
import {
  MagnifyingGlassIcon, XMarkIcon, TrashIcon, MinusIcon, PlusIcon,
  BanknotesIcon, CreditCardIcon, ArrowPathIcon, CheckCircleIcon,
  ShoppingBagIcon, CameraIcon,
} from "@heroicons/react/24/outline";

const PRODUCTS_PER_PAGE = 40;

export default function SaleMode() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, total, discount, finalTotal, appliedCoupon, setAppliedCoupon, applyDiscount } = usePOS();
  const { currentBranch } = useBranch();
  const { showToast } = useToast();

  const [allProducts, setAllProducts] = useState<ProductUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [view, setView] = useState<"products" | "cart">("products");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  const change = useMemo(() => Math.max(0, cashReceived - finalTotal), [cashReceived, finalTotal]);
  const products = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return q ? allProducts.filter(p => p.name.toLowerCase().includes(q) || p.id.includes(q)) : allProducts;
  }, [searchQuery, allProducts]);
  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);

  useEffect(() => { setVisibleCount(PRODUCTS_PER_PAGE); }, [searchQuery]);

  useEffect(() => {
    import("@/services/products").then(({ searchProducts }) =>
      searchProducts("").then(setAllProducts).catch(console.error).finally(() => setLoading(false))
    );
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount(p => Math.min(p + PRODUCTS_PER_PAGE, products.length));
    }
  }, [products.length]);

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    if (paymentMethod === "cash" && cashReceived < finalTotal) {
      showToast("El efectivo recibido es menor al total", "error"); return;
    }
    setProcessing(true);
    try {
      const result = await createSaleAction({
        total: finalTotal, paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceived : finalTotal,
        changeGiven: paymentMethod === "cash" ? change : 0,
        tax: 0,
        items: cart.map(item => ({
          product_id: item.id, name: item.name, quantity: item.quantity,
          unit_price: item.offerPrice || item.price,
          total_price: (item.offerPrice || item.price) * item.quantity,
        })),
      });
      if (result.ok) {
        clearCart(); setCashReceived(0); setPaymentMethod("cash");
        setView("products");
        showToast("✓ Venta registrada", "success");
      } else {
        showToast(result.toastMessage || "Error en la venta", "error");
      }
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? "desconocido"}`, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Products view */}
      <div className={view === "products" ? "block" : "hidden"}>
        <div className="p-3 flex gap-2 items-center border-b border-white/5 sticky top-[53px] md:top-0 bg-[#0a0a0a] z-20">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input ref={searchRef} type="text" placeholder="Buscar producto..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-9 text-white text-sm outline-none focus:border-emerald-500"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setShowScanner(true)} className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <CameraIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setView("cart")} className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70">
            <ShoppingBagIcon className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3 pb-24 content-start"
          onScroll={handleScroll} style={{ maxHeight: "calc(100vh - 10rem)", overflowY: "auto" }}>
          {loading && Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />
          ))}
          {!loading && visibleProducts.map(p => (
            <button key={p.id} disabled={p.stock <= 0}
              onClick={() => { addToCart(p); showToast(`+ ${p.name}`, "success", 1200); }}
              className={`bg-white/5 rounded-xl p-2 border text-left transition-all active:scale-95 flex flex-col ${
                p.stock <= 0 ? "opacity-40 cursor-not-allowed border-white/5" : "border-white/10 hover:border-emerald-500"
              }`}>
              <div className="relative aspect-square rounded-lg overflow-hidden mb-1 bg-white/5">
                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="20vw" />
                {p.stock <= 0 && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><span className="text-[8px] font-black text-red-400 uppercase">Sin stock</span></div>}
              </div>
              <p className="text-[10px] font-bold truncate text-white/80">{p.name}</p>
              <p className="text-emerald-400 font-black text-xs">$ {(p.offerPrice || p.price).toLocaleString()}</p>
            </button>
          ))}
          {!loading && visibleCount < products.length && (
            <div className="col-span-full py-3 text-center">
              <button onClick={() => setVisibleCount(p => p + PRODUCTS_PER_PAGE)}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                + {products.length - visibleCount} más
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cart / Checkout view */}
      <div className={view === "cart" ? "block" : "hidden"}>
        <div className="p-3 flex items-center gap-3 border-b border-white/5 sticky top-[53px] md:top-0 bg-[#0a0a0a] z-20">
          <button onClick={() => setView("products")} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">
            ← Productos
          </button>
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 text-center">Carrito</span>
          <button onClick={clearCart} className="text-white/30 hover:text-red-400 transition-colors">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 space-y-2 pb-6">
          {cart.length === 0 ? (
            <div className="py-16 flex flex-col items-center opacity-30">
              <ShoppingBagIcon className="h-12 w-12 mb-3" />
              <p className="text-xs font-black uppercase tracking-widest">Carrito vacío</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">$ {(item.offerPrice || item.price).toLocaleString()} c/u</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-white/20 hover:text-red-400 transition-colors">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-white/50 active:scale-90"><MinusIcon className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 text-emerald-400 active:scale-90"><PlusIcon className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-black">$ {((item.offerPrice || item.price) * item.quantity).toLocaleString()}</span>
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4 mt-4">
              {appliedCoupon && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{appliedCoupon}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black">- $ {discount.toLocaleString()}</span>
                    <button onClick={() => { setAppliedCoupon(null); applyDiscount(0); }} className="text-white/30 hover:text-red-400"><XMarkIcon className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total</span>
                <span className="text-3xl font-black">$ {finalTotal.toLocaleString()}</span>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-2">
                {[{ id: "cash", icon: BanknotesIcon, label: "Efectivo" },
                  { id: "card", icon: CreditCardIcon, label: "Tarjeta" },
                  { id: "transfer", icon: ArrowPathIcon, label: "Transf." }
                ].map(m => (
                  <button key={m.id} onClick={() => { setPaymentMethod(m.id as any); if (m.id !== "cash") setCashReceived(0); }}
                    className={`flex flex-col items-center p-2.5 rounded-xl border transition-all text-[9px] font-black uppercase ${
                      paymentMethod === m.id ? "bg-emerald-500 border-emerald-400 text-black" : "bg-white/5 border-white/10 text-white/50"
                    }`}>
                    <m.icon className="h-4 w-4 mb-0.5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <input type="number" placeholder="Efectivo recibido" value={cashReceived || ""}
                    onChange={e => setCashReceived(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-emerald-500" />
                  <div className="grid grid-cols-4 gap-1">
                    {[1000, 2000, 5000, 10000].map(v => (
                      <button key={v} onClick={() => setCashReceived(v)}
                        className={`text-[10px] font-bold py-2 rounded-lg transition-colors ${cashReceived === v ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50"}`}>
                        ${v / 1000}k
                      </button>
                    ))}
                  </div>
                  {cashReceived > 0 && (
                    <div className={`flex justify-between p-3 rounded-xl ${change >= 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Vuelto</span>
                      <span className={`text-lg font-black ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>$ {change.toLocaleString()}</span>
                    </div>
                  )}
                  <button onClick={() => setCashReceived(finalTotal)} className="w-full text-[10px] font-bold py-2 rounded-lg bg-white/5 text-white/50">
                    Monto exacto
                  </button>
                </div>
              )}

              <button onClick={handleCheckout}
                disabled={cart.length === 0 || processing || (paymentMethod === "cash" && cashReceived < finalTotal)}
                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                  processing || (paymentMethod === "cash" && cashReceived < finalTotal)
                    ? "bg-white/5 text-white/20"
                    : "bg-emerald-500 text-black active:bg-emerald-600"
                }`}>
                {processing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : (
                  <><CheckCircleIcon className="h-5 w-5" /> Confirmar Venta</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scanner overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md relative">
            <button onClick={() => setShowScanner(false)}
              className="absolute -top-12 right-0 p-2 bg-white/10 rounded-xl text-white hover:bg-red-500 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <UnifiedScanner initialMode="CAMERA"
              onDetected={(barcode) => {
                const found = allProducts.find(p => p.id === barcode || p.barcode === barcode);
                if (found) { addToCart(found); showToast(`+ ${found.name}`, "success"); setShowScanner(false); }
                else showToast(`No encontrado: ${barcode}`, "error");
              }} />
          </div>
        </div>
      )}
    </div>
  );
}
