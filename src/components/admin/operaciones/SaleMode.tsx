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
  ShoppingBagIcon, CameraIcon, PlusCircleIcon,
} from "@heroicons/react/24/outline";

const PRODUCTS_PER_PAGE = 40;

type PaymentMethod = "CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "WALLET" | "OTHER";

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito",
  TRANSFER: "Transf.", WALLET: "Billetera", OTHER: "Otro",
};

const METHOD_ICONS: Record<PaymentMethod, typeof BanknotesIcon> = {
  CASH: BanknotesIcon, DEBIT: CreditCardIcon, CREDIT: CreditCardIcon,
  TRANSFER: ArrowPathIcon, WALLET: CreditCardIcon, OTHER: CreditCardIcon,
};

export default function SaleMode() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, total, discount, finalTotal, appliedCoupon, setAppliedCoupon, applyDiscount } = usePOS();
  const { currentBranch } = useBranch();
  const { showToast } = useToast();

  const [allProducts, setAllProducts] = useState<ProductUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([
    { id: "p1", method: "CASH", amount: 0 },
  ]);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [view, setView] = useState<"products" | "cart">("products");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  const paymentSum = useMemo(() => payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0), [payments]);
  const remaining = useMemo(() => Math.max(0, finalTotal - paymentSum), [finalTotal, paymentSum]);
  const cashPaid = useMemo(() => payments.filter(p => p.method === "CASH").reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);
  const change = useMemo(() => {
    // Vuelto solo aplica si hay sobrepago en efectivo
    const nonCash = paymentSum - cashPaid;
    const cashOwed = Math.max(0, finalTotal - nonCash);
    return Math.max(0, cashPaid - cashOwed);
  }, [paymentSum, cashPaid, finalTotal]);
  const paymentsOk = Math.abs(paymentSum - change - finalTotal) < 0.01 && paymentSum >= finalTotal;
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

  // Auto-rellenar el monto del primer pago cuando hay 1 sola fila y total cambia
  useEffect(() => {
    if (payments.length === 1 && finalTotal > 0 && payments[0].amount === 0) {
      setPayments([{ ...payments[0], amount: finalTotal }]);
    }
  }, [finalTotal, payments]);

  const setPaymentAt = (idx: number, patch: Partial<PaymentRow>) => {
    setPayments(p => p.map((row, i) => i === idx ? { ...row, ...patch } : row));
  };
  const addPaymentRow = () => {
    setPayments(p => [...p, { id: `p${Date.now()}`, method: "CASH", amount: remaining }]);
  };
  const removePaymentRow = (idx: number) => {
    setPayments(p => p.filter((_, i) => i !== idx));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    if (!paymentsOk) {
      showToast(remaining > 0 ? `Faltan $${remaining.toLocaleString()}` : "Pagos inválidos", "error");
      return;
    }
    setProcessing(true);
    try {
      // Si hay sobrepago (cambio), ajustar las filas CASH para que la suma exacta sea el total
      const nonCash = payments.filter(p => p.method !== "CASH").reduce((a, p) => a + p.amount, 0);
      const cashApplied = Math.max(0, finalTotal - nonCash);
      const cashRowIdx = payments.findIndex(p => p.method === "CASH");

      const payloadPayments: { method: PaymentMethod; amount: number; reference?: string }[] = payments
        .map((p, i): { method: PaymentMethod; amount: number; reference?: string } | null => {
          if (p.method !== "CASH") return { method: p.method, amount: p.amount, reference: p.reference };
          // Distribuye cashApplied al primer CASH; los demás CASH se descartan (raro pero por seguridad)
          if (i === cashRowIdx) return { method: "CASH", amount: cashApplied };
          return null;
        })
        .filter((p): p is { method: PaymentMethod; amount: number; reference?: string } => p !== null && p.amount > 0);

      const result = await createSaleAction({
        total: finalTotal,
        branchId: currentBranch?.id ?? null,
        cashReceived: payments.filter(p => p.method === "CASH").reduce((a, p) => a + p.amount, 0),
        changeGiven: change,
        tax: 0,
        payments: payloadPayments,
        items: cart.map(item => ({
          product_id: item.id, name: item.name, quantity: item.quantity,
          unit_price: item.offerPrice || item.price,
          total_price: (item.offerPrice || item.price) * item.quantity,
        })),
      });
      if (result.ok) {
        clearCart();
        setPayments([{ id: "p1", method: "CASH", amount: 0 }]);
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

              {/* Payment rows */}
              <div className="space-y-2">
                {payments.map((row, idx) => {
                  const Icon = METHOD_ICONS[row.method];
                  return (
                    <div key={row.id} className="flex gap-2 items-stretch">
                      <select value={row.method} onChange={e => setPaymentAt(idx, { method: e.target.value as PaymentMethod })}
                        className="bg-black border border-white/10 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-emerald-500 shrink-0">
                        {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map(m => (
                          <option key={m} value={m}>{METHOD_LABEL[m]}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <input type="number" inputMode="numeric" placeholder="0" value={row.amount || ""}
                          onChange={e => setPaymentAt(idx, { amount: Number(e.target.value) || 0 })}
                          className="w-full bg-black border border-white/10 rounded-xl pl-8 pr-3 py-2 text-base font-black text-white outline-none focus:border-emerald-500" />
                      </div>
                      {payments.length > 1 && (
                        <button onClick={() => removePaymentRow(idx)} className="px-3 text-red-400 hover:bg-red-500/10 rounded-xl border border-red-500/20">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-2 items-center">
                  <button onClick={addPaymentRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60">
                    <PlusCircleIcon className="h-3.5 w-3.5" /> Añadir pago
                  </button>
                  {payments.length === 1 && payments[0].method === "CASH" && (
                    <div className="flex gap-1 flex-1 justify-end">
                      {[1000, 2000, 5000, 10000].map(v => (
                        <button key={v} onClick={() => setPaymentAt(0, { amount: v })}
                          className="text-[9px] font-bold py-1.5 px-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10">
                          ${v / 1000}k
                        </button>
                      ))}
                      <button onClick={() => setPaymentAt(0, { amount: finalTotal })}
                        className="text-[9px] font-bold py-1.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                        Exacto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary: remaining or change */}
              <div className={`flex justify-between items-center p-3 rounded-xl border text-sm ${
                remaining > 0 ? "bg-red-500/10 border-red-500/30 text-red-400" :
                change > 0   ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                               "bg-white/5 border-white/10 text-white/40"
              }`}>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {remaining > 0 ? "Falta" : change > 0 ? "Vuelto" : "Cuadrado"}
                </span>
                <span className="text-lg font-black">$ {(remaining > 0 ? remaining : change).toLocaleString()}</span>
              </div>

              <button onClick={handleCheckout}
                disabled={cart.length === 0 || processing || !paymentsOk}
                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                  processing || !paymentsOk ? "bg-white/5 text-white/20" : "bg-emerald-500 text-black active:bg-emerald-600"
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
