"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  CreditCardIcon, 
  UserIcon,
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  MapIcon
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
import { StarIcon } from "@heroicons/react/24/solid";

import { useStoreSettings } from "@/hooks/useStoreSettings";

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
  const { cartItems, validateCartWithServer } = useCart();
  const { settings: storeSettings, loading: settingsLoading } = useStoreSettings();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [dynamicShipping, setDynamicShipping] = useState<ShippingMethod | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("pickup");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("transbank");
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    freeShipping?: boolean;
    couponId?: number;
  } | null>(null);

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

  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);

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
  
  const rawShippingCost = shippingMethods.find((method) => method.id === selectedShippingMethod)?.price || 0;
  const shippingCost = appliedCoupon?.freeShipping ? 0 : rawShippingCost;
  
  const couponDiscount = appliedCoupon?.discount || 0;
  const pointsDiscount = redeemedPoints * (loyaltyConfig?.redemption_value || 0);

  const total = Math.max(0, subtotal + shippingCost - couponDiscount - pointsDiscount);


  const triggerShippingCalculation = useCallback(async (c: { lat: number, lng: number }) => {
    const shipSettings = storeSettings?.shipping;
    if (shipSettings?.enableDynamicShipping && c.lat && c.lng) {
      if (!shipSettings.shippingOriginLat || !shipSettings.shippingOriginLng) {
        console.warn("Shipping calculation skipped: Origin coordinates missing in settings.");
        return;
      }

      setIsCalculatingDistance(true);
      try {
        console.log(`Calculating shipping from (${shipSettings.shippingOriginLat}, ${shipSettings.shippingOriginLng}) to (${c.lat}, ${c.lng})`);
        const result = await calculateDistance(
          { lat: Number(shipSettings.shippingOriginLat), lng: Number(shipSettings.shippingOriginLng) },
          { lat: Number(c.lat), lng: Number(c.lng) }
        );

        if (result.success && typeof result.distanceKm === 'number' && !isNaN(result.distanceKm)) {
          const dist = result.distanceKm;
          const cost = calculateShippingCost(
            dist,
            Number(shipSettings.shippingBaseFee || 0),
            Number(shipSettings.shippingPricePerKm || 0)
          );
          
          if (!isNaN(cost)) {
            setDynamicShipping({
              id: "dynamic",
              name: `Envío a domicilio (${dist.toFixed(1)} km)`,
              price: Math.round(cost),
              days: "Despacho propio (Agendable)"
            });
            setSelectedShippingMethod("dynamic");
          }
        } else {
          console.error("Distance calculation failed or returned invalid data:", result);
          // Set a dummy dynamic shipping to prevent infinite retries
          setDynamicShipping({ 
            id: "error", 
            name: "Error al calcular envío", 
            price: 0, 
            days: "Contactar soporte" 
          });
        }
      } catch (err) { 
        console.error("Error calculating shipping:", err); 
      } finally { 
        setIsCalculatingDistance(false); 
      }
    }
  }, [storeSettings]);

  // Effect to trigger calculation when settings or coordinates are available
  useEffect(() => {
    if (coords && storeSettings?.shipping?.enableDynamicShipping && !dynamicShipping && !isCalculatingDistance) {
      triggerShippingCalculation(coords);
    }
  }, [coords, storeSettings, dynamicShipping, isCalculatingDistance, triggerShippingCalculation]);

  useEffect(() => {
    const loadLoyalty = async () => {
      try {
        const loyaltyRes = await fetch('/api/loyalty?action=config');
        if (loyaltyRes.ok) setLoyaltyConfig(await loyaltyRes.json());
      } catch (e) { console.error(e); }
    };
    loadLoyalty();
  }, []);

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
                const c = { lat: Number(addr.lat), lng: Number(addr.lng) };
                setCoords(c);
                triggerShippingCalculation(c);
              }
            }
          }
        } catch (e) {
          console.warn("Could not fetch last address:", e);
        }
      };
      
      if (session.user.email) {
        fetchLastAddress();
        
        // Fetch loyalty info
        fetch(`/api/loyalty?email=${session.user.email}`)
          .then(r => r.json())
          .then(data => setLoyaltyInfo(data))
          .catch(e => console.warn("Could not fetch loyalty info:", e));
      }
    }
  }, [session, status, triggerShippingCalculation]);

  const handleApplyCoupon = async (code: string) => {
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cartTotal: subtotal,
          customerEmail: shippingInfo.email
        }),
      });
      const data = await response.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discount: data.discount,
          freeShipping: data.coupon.discount_type === 'free_shipping',
          couponId: data.coupon.id
        });
        return { valid: true, message: data.message, discount: data.discount };
      } else {
        return { valid: false, message: data.message, discount: 0 };
      }
    } catch (err) {
       console.error(err);
       return { valid: false, message: "Error de servidor al validar", discount: 0 };
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = async (val: AddressResult | string) => {
    if (typeof val === 'string') {
      setShippingInfo(prev => ({ ...prev, address: val }));
      setDynamicShipping(null);
      setCoords(null);
    } else {
      setShippingInfo(prev => ({
        ...prev,
        address: val.formattedAddress,
        city: val.city || prev.city,
        state: val.state || prev.state,
        zipCode: val.postalCode || prev.zipCode,
        country: val.country || prev.country
      }));
      if (val.lat && val.lng) {
        const c = { lat: Number(val.lat), lng: Number(val.lng) };
        setCoords(c);
        triggerShippingCalculation(c);
      }
    }
  };

  const nextStep = () => {
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.address) {
       alert("Por favor completa tus datos y dirección de entrega.");
       return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(2);
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(1);
  };

  const handleFinalizeOrder = async () => {
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
        shippingCost,
        couponCode: appliedCoupon?.code,
        discountApplied: (subtotal + shippingCost) - total,
        loyaltyRedeemed: redeemedPoints > 0 ? {
           points: redeemedPoints,
           discount: pointsDiscount
        } : null
      };

      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al procesar el pedido');
      
      if (data.initPoint) {
        // Redirigir a MercadoPago
        window.location.href = data.initPoint;
      } else {
        router.push(`/checkout/confirmacion?orderId=${data.orderId}`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const originCoords = useMemo(() => {
    if (!storeSettings?.shipping?.shippingOriginLat) return null;
    return { 
      lat: storeSettings.shipping.shippingOriginLat, 
      lng: storeSettings.shipping.shippingOriginLng 
    };
  }, [storeSettings]);

  const mapEmbedUrl = useMemo(() => {
    if (!coords) return null;
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;
  }, [coords]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
          <div className="flex-1">
            <Link href="/carrito" className="group inline-flex items-center text-sm font-bold text-gray-400 hover:text-emerald-600 transition-colors mb-4 uppercase tracking-widest">
              <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Volver al Carrito
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
              Finalizar <span className="text-emerald-600">Pedido</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm self-start">
             <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 1 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400'}`}>1. Entrega</div>
             <div className="h-0.5 w-6 bg-gray-100 rounded-full" />
             <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${step === 2 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400'}`}>2. Pago</div>
          </div>
        </div>

        {storeSettings?.shipping?.isHighDemand && (
          <div className="mb-8 p-4 rounded-3xl bg-amber-50 border-2 border-amber-200 shadow-lg shadow-amber-900/5 flex items-start gap-4">
            <div className="h-10 w-10 flex-shrink-0 bg-amber-100/80 rounded-2xl flex items-center justify-center border border-amber-200 mt-1">
               <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <div>
              <h3 className="text-amber-900 font-black text-lg tracking-tight">Alta demanda activa</h3>
              <p className="text-amber-700/80 text-sm font-medium leading-relaxed mt-1">
                Actualmente estamos experimentando gran volumen de pedidos. Algunas franjas horarias 
                podrían agotar sus cupos rápidamente. Te sugerimos reservar tu entrega pronto y seleccionar
                horarios de despachos en los días siguientes.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {step === 1 ? (
              <div className="space-y-8">
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
                  {!coords && shippingInfo.address && (
                     <div className="mb-6 p-4 bg-amber-50 rounded-2xl border-2 border-amber-100 flex gap-4 items-start">
                        <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 shrink-0 flex items-center justify-center">⚠️</div>
                        <div>
                           <p className="text-sm font-black text-amber-900">Ubicación exacta requerida</p>
                           <p className="text-xs font-bold text-amber-700/80 leading-relaxed">Por favor, selecciona tu dirección de la lista desplegable o usa el botón de GPS para calcular el costo de envío.</p>
                        </div>
                     </div>
                  )}
                  <ShippingForm
                    shippingInfo={shippingInfo}
                    onChange={handleShippingInfoChange}
                    onAddressSelect={handleAddressSelect}
                    shippingMethods={shippingMethods}
                    selectedMethod={selectedShippingMethod}
                    onMethodChange={(e) => setSelectedShippingMethod(e.target.value)}
                    isCalculating={isCalculatingDistance}
                  />

                  <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
                     <Button 
                        size="lg" 
                        onClick={nextStep}
                        className="rounded-2xl h-16 px-10 font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-white bg-emerald-600 hover:bg-emerald-500"
                     >
                        Continuar a Fecha y Pago →
                     </Button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                <button 
                  onClick={prevStep} 
                  className="inline-flex items-center text-xs font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest pl-2"
                >
                  ← Volver a Datos de Entrega
                </button>

                <section className="bg-white rounded-[2.5rem] p-1 shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                   <div className="p-8 md:p-10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black">3</div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                          <MapIcon className="h-6 w-6 text-gray-400" />
                          Confirmar Ruta
                        </h2>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                           <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dirección de Entrega</p>
                              <p className="text-lg font-black text-gray-900 leading-tight">{shippingInfo.address}</p>
                              {(shippingInfo.apartment || shippingInfo.tower) && (
                                 <p className="text-sm font-bold text-gray-500 mt-2">
                                    {shippingInfo.apartment && `Depto: ${shippingInfo.apartment} `}
                                    {shippingInfo.tower && `| Torre: ${shippingInfo.tower}`}
                                 </p>
                              )}
                           </div>
                           
                           {selectedShippingMethod === 'dynamic' && (
                              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                                 <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ClockIcon className="h-3 w-3" />
                                    Despacho Programado
                                 </p>
                                 <div className="w-full p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                                      <ClockIcon className="h-5 w-5" />
                                   </div>
                                   <div>
                                     <p className="text-gray-900 font-bold mb-0.5">{shippingInfo.deliveryDate || 'No especificado'}</p>
                                     <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{shippingInfo.deliveryTimeSlot || ''}</p>
                                   </div>
                                 </div>
                              </div>
                           )}
                        </div>
                        
                        {mapEmbedUrl && (
                          <div className="md:w-1/2 relative bg-gray-100 rounded-[2rem] overflow-hidden border border-gray-200 aspect-video md:aspect-square">
                            <iframe 
                               src={mapEmbedUrl} 
                               title="Mapa de entrega" 
                               className="w-full h-full grayscale hover:grayscale-0 transition-all duration-700" 
                               style={{ border: 0 }}
                               loading="lazy"
                               referrerPolicy="no-referrer-when-downgrade"
                            />
                            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-gray-100/50 pointer-events-none">
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Precisión de ubicación garantizada por Google Maps</p>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                </section>

                <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center font-black">4</div>
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
                  
                  <div className="mt-10 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                     <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-1">
                           <CheckBadgeIcon className="h-4 w-4" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">Confirmación Final</p>
                           <p className="text-xs font-bold text-gray-500 leading-relaxed">Al procesar el pago, serás redirigido de forma segura a la pasarela de pago seleccionada. Tu pedido será procesado de inmediato.</p>
                        </div>
                     </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 sticky top-10">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 p-8 border-2 border-emerald-600/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-50" />
              
              <OrderSummary
                cartItems={cartItems}
                subtotal={subtotal}
                shippingCost={shippingCost}
                total={total}
                onApplyCoupon={handleApplyCoupon}
                appliedCoupon={appliedCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                loyaltyPoints={loyaltyInfo?.points || 0}
                redeemedPoints={redeemedPoints}
                onRedeemPoints={setRedeemedPoints}
                redemptionValue={loyaltyConfig?.redemption_value || 0}
                minRedeem={loyaltyConfig?.min_points_redeem || 50}
              />

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                {step === 1 ? (
                   <Button 
                    fullWidth 
                    onClick={nextStep} 
                    className="h-16 rounded-2xl text-lg font-black bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-white border-none"
                  >
                    Resumen y Pago →
                  </Button>
                ) : (
                  <Button 
                    fullWidth 
                    onClick={handleFinalizeOrder} 
                    loading={loading}
                    className="h-20 rounded-[1.5rem] text-xl font-black bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-emerald-600/40 active:scale-95 transition-all text-white relative overflow-hidden group border-none"
                  >
                    <span className="relative z-10">{loading ? "Procesando..." : `Finalizar por $${total.toLocaleString('es-CL')}`}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </Button>
                )}
                
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                   <ShieldCheckIcon className="h-4 w-4" />
                   Garantía OlivoMarket Premium
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
