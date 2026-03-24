"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  CreditCardIcon, 
  UserIcon,
  ShoppingBagIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "next-auth/react";
import ShippingForm, { ShippingInfo, ShippingMethod } from "./components/ShippingForm";
import PaymentForm, { PaymentMethod } from "./components/PaymentForm";
import OrderSummary from "./components/OrderSummary";
import { AddressResult } from "@/components/AddressAutocomplete";
import { calculateDistance, calculateShippingCost } from "@/utils/shipping-calculator";
import { StoreSettings } from "@/app/api/admin/settings/route";

const paymentMethods: PaymentMethod[] = [
  { id: "transbank", name: "Transbank" },
  { id: "mercadopago", name: "MercadoPago" },
];

const baseShippingMethods: ShippingMethod[] = [
  { id: "pickup", name: "Retirar en Tienda (Providencia)", price: 0, days: "Listo en 1 hora (Gratis)" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cartItems, clearCart, validateCartWithServer } = useCart();
  const [loading, setLoading] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [dynamicShipping, setDynamicShipping] = useState<ShippingMethod | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("pickup");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("transbank");
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (status !== "loading" && cartItems.length === 0) {
      router.push("/carrito");
    }
  }, [cartItems.length, router, status]);

  const shippingMethods = useMemo(() => {
    const list = [...baseShippingMethods];
    if (dynamicShipping) return [dynamicShipping, ...list];
    return list;
  }, [dynamicShipping]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = shippingMethods.find((method) => method.id === selectedShippingMethod)?.price || 0;
  const total = subtotal + shippingCost;

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Chile",
  });

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) setStoreSettings(await res.json());
      } catch (e) { console.error(e); }
    };
    loadSettings();
  }, []);

  // Autofill from session and last order
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setShippingInfo(prev => ({
        ...prev,
        fullName: session.user.name || prev.fullName,
        email: session.user.email || prev.email,
      }));

      // Try to fetch last shipping address from previous orders
      const fetchLastAddress = async () => {
        try {
          const res = await fetch(`/api/user/last-order-address?email=${session.user?.email}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              setShippingInfo(prev => ({
                ...prev,
                address: data.address.address || prev.address,
                city: data.address.city || prev.city,
                state: data.address.state || prev.state,
                zipCode: data.address.zipCode || prev.zipCode,
                phone: data.address.phone || prev.phone,
              }));
            }
          }
        } catch (e) {
          console.warn("Could not fetch last address:", e);
        }
      };
      
      if (session.user.email) fetchLastAddress();
    } else {
        // Fallback to localStorage for guest users
        try {
          const profileRaw = localStorage.getItem('profile');
          if (profileRaw) {
            const { nombre, apellidos, email } = JSON.parse(profileRaw);
            setShippingInfo(prev => ({
              ...prev,
              fullName: `${nombre || ''} ${apellidos || ''}`.trim() || prev.fullName,
              email: email || prev.email,
            }));
          }
        } catch { }
    }
  }, [session, status]);

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = async (val: AddressResult | string) => {
    if (typeof val === 'string') {
      setShippingInfo(prev => ({ ...prev, address: val }));
      setDynamicShipping(null);
    } else {
      setShippingInfo(prev => ({
        ...prev,
        address: val.formattedAddress,
        city: val.city || prev.city,
        state: val.state || prev.state,
        zipCode: val.postalCode || prev.zipCode,
        country: val.country || prev.country
      }));

      const shipSettings = storeSettings?.shipping;
      if (shipSettings?.enableDynamicShipping && (val as any).lat) {
        // VALIDATION: Ensure we have origin coordinates
        if (!shipSettings.shippingOriginLat || !shipSettings.shippingOriginLng) {
          console.warn("Shipping origin not configured in admin settings.");
          return;
        }

        setIsCalculatingDistance(true);
        try {
          const result = await calculateDistance(
            { lat: Number(shipSettings.shippingOriginLat), lng: Number(shipSettings.shippingOriginLng) },
            { lat: Number((val as any).lat), lng: Number((val as any).lng) }
          );

          if (result.success && !isNaN(result.distanceKm)) {
            const cost = calculateShippingCost(
              result.distanceKm,
              Number(shipSettings.shippingBaseFee || 0),
              Number(shipSettings.shippingPricePerKm || 0)
            );
            
            if (!isNaN(cost)) {
              const dynamicMethod: ShippingMethod = {
                id: "dynamic",
                name: `Envío a domicilio (${result.distanceKm.toFixed(1)} km)`,
                price: Math.round(cost),
                days: "Despacho propio (Agendable)"
              };
              setDynamicShipping(dynamicMethod);
              setSelectedShippingMethod("dynamic");
            }
          }
        } catch (err) { 
          console.error("Error calculating shipping:", err); 
        } finally { 
          setIsCalculatingDistance(false); 
        }
      }
    }
  };

  const handleFinalizeOrder = async () => {
    // Validaciones básicas
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address) {
       alert("Por favor, completa tus datos de contacto y dirección.");
       return;
    }

    setLoading(true);
    try {
      // 1. Validación Inteligente de Stock y Precios
      const isCartValid = await validateCartWithServer();
      
      if (!isCartValid) {
        // El carrito se actualizará automáticamente y mostrará toasts de alerta
        setLoading(false);
        return;
      }
      
      const payload = {
        items: cartItems,
        shippingInfo,
        shippingMethod: selectedShippingMethod,
        paymentMethod: selectedPaymentMethod,
        total,
        subtotal,
        shippingCost
      };

      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al procesar el pedido');
      
      router.push(`/checkout/confirmacion?orderId=${data.orderId}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Link href="/carrito" className="group inline-flex items-center text-sm font-bold text-gray-400 hover:text-emerald-600 transition-colors mb-4 uppercase tracking-widest">
              <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Editar Carrito
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
              Finalizar <span className="text-emerald-600">Pedido</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheckIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Compra Segura</p>
              <p className="text-sm font-bold text-gray-900">Encriptación SSL 256-bit</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Formulario Unificado */}
          <div className="lg:col-span-8 space-y-8">
            {/* Bloque 1: Datos Personales */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                 <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center font-black">1</div>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                   <UserIcon className="h-6 w-6 text-gray-400" />
                   Tus Datos
                 </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                   <input 
                     name="fullName" 
                     value={shippingInfo.fullName} 
                     onChange={handleShippingInfoChange}
                     placeholder="Ej: Juan Pérez"
                     className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 focus:bg-white transition-all outline-none font-bold" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                   <input 
                     name="email" 
                     value={shippingInfo.email} 
                     onChange={handleShippingInfoChange}
                     placeholder="tu@email.com"
                     className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 focus:bg-white transition-all outline-none font-bold" 
                   />
                 </div>
                 <div className="space-y-2 md:col-span-2">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                   <input 
                     name="phone" 
                     value={shippingInfo.phone} 
                     onChange={handleShippingInfoChange}
                     placeholder="+56 9 1234 5678"
                     className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 focus:bg-white transition-all outline-none font-bold" 
                   />
                 </div>
              </div>
            </section>

            {/* Bloque 2: Despacho */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
               <div className="flex items-center gap-4 mb-8">
                 <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center font-black">2</div>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                   <MapPinIcon className="h-6 w-6 text-gray-400" />
                   Despacho
                 </h2>
              </div>
              <ShippingForm
                shippingInfo={shippingInfo}
                onChange={handleShippingInfoChange}
                onAddressSelect={handleAddressSelect}
                shippingMethods={shippingMethods}
                selectedMethod={selectedShippingMethod}
                onMethodChange={(e) => setSelectedShippingMethod(e.target.value)}
                isCalculating={isCalculatingDistance}
              />
            </section>

            {/* Bloque 3: Pago */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
               <div className="flex items-center gap-4 mb-8">
                 <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center font-black">3</div>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                   <CreditCardIcon className="h-6 w-6 text-gray-400" />
                   Método de Pago
                 </h2>
              </div>
              <PaymentForm
                paymentMethods={paymentMethods}
                selectedMethod={selectedPaymentMethod}
                onMethodChange={(e) => setSelectedPaymentMethod(e.target.value)}
              />
            </section>
          </div>

          {/* Resumen Lateral Sticky */}
          <div className="lg:col-span-4 sticky top-10">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 p-8 border-2 border-emerald-600/5 overflow-hidden relative">
              {/* Decoración Fondo */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-50" />
              
              <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                <ShoppingBagIcon className="h-5 w-5 text-emerald-600" />
                Resumen del Pedido
              </h3>

              <OrderSummary
                cartItems={cartItems}
                subtotal={subtotal}
                shippingCost={shippingCost}
                total={total}
              />

              {/* UpsellingSection removed */}

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                <Button 
                   fullWidth 
                   onClick={handleFinalizeOrder} 
                   loading={loading}
                   className="h-16 rounded-2xl text-lg font-black bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {loading ? "Procesando..." : `Pagar $${total.toLocaleString('es-CL')}`}
                </Button>
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                   <ShieldCheckIcon className="h-4 w-4" />
                   Garantía de Satisfacción OlivoMarket
                </p>
              </div>
            </div>

            <div className="mt-6 px-4 py-6 bg-emerald-900 rounded-[2rem] text-white">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Ayuda Inmediata</p>
               <p className="text-sm font-bold opacity-90 mb-4 font-serif italic">&quot;¿Tienes dudas con tu pedido? Estamos para apoyarte.&quot;</p>
               <Link href={`https://wa.me/56912345678`} target="_blank" className="inline-flex items-center font-black text-emerald-300 hover:text-white transition-colors">
                  Chat de Consultas WhatsApp →
               </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
