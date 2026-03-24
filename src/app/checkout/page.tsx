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

  const shippingMethods = useMemo(() => {
    const list = [...baseShippingMethods];
    if (dynamicShipping) return [dynamicShipping, ...list];
    return list;
  }, [dynamicShipping]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = shippingMethods.find((method) => method.id === selectedShippingMethod)?.price || 0;
  const total = subtotal + shippingCost;

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

  // Autofill and trigger shipping calc
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setShippingInfo(prev => ({
        ...prev,
        fullName: session.user.name || prev.fullName,
        email: session.user.email || prev.email,
      }));

      const fetchLastAddress = async () => {
        try {
          const res = await fetch(`/api/user/last-order-address?email=${session.user?.email}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              const addr = data.address;
              setShippingInfo(prev => ({
                ...prev,
                address: addr.address || prev.address,
                city: addr.city || prev.city,
                state: addr.state || prev.state,
                zipCode: addr.zipCode || prev.zipCode,
                phone: addr.phone || prev.phone,
                country: addr.country || prev.country
              }));

              if (addr.lat && addr.lng) {
                // Call calc directly to avoid dependence on handleAddressSelect during mount
                triggerShippingCalculation(addr);
              }
            }
          }
        } catch (e) {
          console.warn("Could not fetch last address:", e);
        }
      };
      
      if (session.user.email) fetchLastAddress();
    }
  }, [session, status]);

  const triggerShippingCalculation = async (addr: any) => {
    const shipSettings = storeSettings?.shipping;
    if (shipSettings?.enableDynamicShipping && addr.lat) {
      if (!shipSettings.shippingOriginLat || !shipSettings.shippingOriginLng) return;

      setIsCalculatingDistance(true);
      try {
        const result = await calculateDistance(
          { lat: Number(shipSettings.shippingOriginLat), lng: Number(shipSettings.shippingOriginLng) },
          { lat: Number(addr.lat), lng: Number(addr.lng) }
        );

        if (result.success && !isNaN(result.distanceKm)) {
          const cost = calculateShippingCost(
            result.distanceKm,
            Number(shipSettings.shippingBaseFee || 0),
            Number(shipSettings.shippingPricePerKm || 0)
          );
          
          if (!isNaN(cost)) {
            setDynamicShipping({
              id: "dynamic",
              name: `Envío a domicilio (${result.distanceKm.toFixed(1)} km)`,
              price: Math.round(cost),
              days: "Despacho propio (Agendable)"
            });
            setSelectedShippingMethod("dynamic");
          }
        }
      } catch (err) { 
        console.error("Error calculating shipping:", err); 
      } finally { 
        setIsCalculatingDistance(false); 
      }
    }
  };

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
      triggerShippingCalculation(val);
    }
  };

  const handleFinalizeOrder = async () => {
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address) {
       alert("Por favor, completa tus datos de contacto y dirección.");
       return;
    }

    setLoading(true);
    try {
      const isCartValid = await validateCartWithServer();
      if (!isCartValid) {
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
          <div className="lg:col-span-8 space-y-8">
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

          <div className="lg:col-span-4 sticky top-10">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 p-8 border-2 border-emerald-600/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-50" />
              
              <OrderSummary
                cartItems={cartItems}
                subtotal={subtotal}
                shippingCost={shippingCost}
                total={total}
              />

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                <Button 
                   fullWidth 
                   onClick={handleFinalizeOrder} 
                   loading={loading}
                   className="h-16 rounded-2xl text-lg font-black bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-white"
                >
                  {loading ? "Procesando..." : `Pagar $${total.toLocaleString('es-CL')}`}
                </Button>
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                   <ShieldCheckIcon className="h-4 w-4" />
                   Garantía de Satisfacción OlivoMarket
                </p>
              </div>
            </div>

            <div className="mt-6 px-6 py-8 bg-emerald-950 rounded-[2.5rem] text-white shadow-xl shadow-emerald-900/10 border border-emerald-800">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Ayuda Inmediata</p>
               <p className="text-base font-bold opacity-90 mb-4 font-serif italic leading-snug">&quot;¿Tienes dudas con tu pedido? Estamos para apoyarte en lo que necesites.&quot;</p>
               <Link 
                  href={`https://wa.me/56912345678?text=Hola!%20Tengo%20una%20consulta%20sobre%20mi%20pedido`} 
                  target="_blank" 
                  className="inline-flex items-center font-black text-emerald-300 hover:text-white transition-all text-sm group"
               >
                  Chat WhatsApp 
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
               </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
