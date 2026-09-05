"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  UserIcon,
  ArrowLeftIcon,
  ClockIcon,
  MapIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "next-auth/react";
import ShippingForm, { ShippingInfo, ShippingMethod } from "./components/ShippingForm";
import PaymentForm, { PaymentMethod } from "./components/PaymentForm";
import OrderSummary from "./components/OrderSummary";
import CheckoutSteps from "./components/CheckoutSteps";
import { AddressResult } from "@/components/AddressAutocomplete";
import { calculateDistance, calculateShippingCost } from "@/utils/shipping-calculator";
import {
  quoteAgendado,
  RADIO_ZONA_PLANA_KM,
  TARIFA_ZONA_PLANA_CLP,
} from "@/lib/shipping-policy";
import {
  ventanaEconomicaPublicable,
  horarioDeAtencionPublicable,
} from "@/lib/delivery-slots";
import { armarOpcionesDeEnvio, avisoFlashNoDisponible } from "@/lib/shipping-methods";
import { quoteFlash, MINIMO_FLASH_CLP_DEFAULT } from "@/lib/flash-policy";

import { useStoreSettings } from "@/hooks/useStoreSettings";
import { PREVIEW_DEFAULT_MESSAGE } from "@/lib/store-status";
import { validateShippingInfo, type ShippingFieldErrors } from "@/schemas/checkout.schema";
import { whatsappLink, checkoutInquiryMessage } from "@/utils/whatsapp";

const clpFormat = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/**
 * Espera antes de pedirle una cotización a Uber.
 *
 * Es el tiempo que se deja pasar sin que el cliente escriba. Medio segundo
 * alcanza para no cotizar letra por letra y no se nota al terminar de tipear.
 */
const ESPERA_COTIZACION_MS = 500;

const paymentMethods: PaymentMethod[] = [
  { id: "mercadopago", name: "MercadoPago" },
];

const baseShippingMethods: ShippingMethod[] = [
  // La tienda está en Ñuñoa, no en Providencia. El retiro se confirma por
  // correo cuando el pedido queda listo, normalmente en menos de una hora.
  { id: "pickup", name: "Retirar en Tienda (Ñuñoa)", price: 0, days: "Te avisamos por correo, normalmente en menos de 1 hora (Gratis)" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cartItems, validateCartWithServer } = useCart();
  const { settings: storeSettings } = useStoreSettings();

  // Modo vitrina: la tienda se ve pero no vende. El servidor rechaza el
  // pedido igual; esto es para no dejar que alguien llene el carrito, escriba
  // su dirección y recién ahí se entere.
  const enVitrina = storeSettings?.previewMode === true;
  const mensajeVitrina =
    storeSettings?.previewMessage?.trim() || PREVIEW_DEFAULT_MESSAGE;
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<ShippingFieldErrors>({});
  const [dynamicShipping, setDynamicShipping] = useState<ShippingMethod | null>(null);
  // Distancia real al destino. El envío gratis se decide con esto, no con el
  // nombre de la comuna que devuelva el buscador de direcciones.
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  /**
   * Lo que contestó Uber para esta dirección.
   *
   * Se guarda el costo crudo y no el precio final porque el costo no depende
   * del carrito: sólo el envío gratis. Así una dirección se cotiza una vez y
   * cambiar el carrito no gasta otra llamada a Uber.
   */
  const [flashUber, setFlashUber] = useState<{
    disponible: boolean;
    costo: number | null;
    etaMin: number | null;
    quoteId: string | null;
    motivo: string | null;
    /** Sólo llega si quien mira es administrador. */
    diagnostico?: Record<string, unknown>;
  } | null>(null);

  /**
   * Por qué no se llegó ni a preguntarle a Uber.
   *
   * Sin esto, "falta la comuna en la dirección" y "faltan las credenciales" se
   * ven exactamente igual desde el checkout: no pasa nada. Distinguirlos a ojo
   * costó una tarde.
   */
  const [flashNoConsultado, setFlashNoConsultado] = useState<string | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("pickup");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("mercadopago");
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

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  /**
   * Despacho agendado: la ronda de reparto propia.
   *
   * Se cotiza siempre que la opción exista, no solo cuando está seleccionada:
   * el precio que se muestra en la tarjeta tiene que ser el mismo que entra al
   * total. Antes la tarjeta mostraba la tarifa cruda por distancia y el resumen
   * la ya ajustada, así que no coincidían.
   *
   * `dynamicShipping` sigue siendo la fuente de la tarifa por distancia, que es
   * lo que se cobra pasada la zona de tarifa plana. Ya no se ofrece como opción
   * suelta: es el mismo reparto, con dos tramos de precio.
   */
  const agendado = useMemo(() => {
    if (!dynamicShipping) return null;
    return quoteAgendado({
      rawPrice: dynamicShipping.price,
      subtotal,
      ciudad: shippingInfo.city,
      distanceKm,
      maxDistanceKm: storeSettings?.shipping?.shippingMaxDistanceKm ?? null,
      freeShippingMinimum:
        storeSettings?.shipping?.freeShippingEnabled
          ? Number(storeSettings.shipping.freeShippingMinimum ?? 0) || null
          : null,
    });
  }, [dynamicShipping, subtotal, shippingInfo.city, distanceKm, storeSettings]);

  /**
   * Precio del flash con el carrito actual.
   *
   * El servidor ya comprobó tienda abierta, cobertura y tope; acá sólo se
   * aplica el envío gratis, que es lo único que depende del carrito. El
   * servidor lo vuelve a calcular todo al crear el pedido: esto es para
   * mostrar.
   */
  const flash = useMemo(() => {
    if (!flashUber?.disponible || flashUber.costo === null) return null;
    return quoteFlash({
      costoUber: flashUber.costo,
      subtotal,
      freeShippingMinimum: storeSettings?.shipping?.freeShippingEnabled
        ? Number(storeSettings.shipping.freeShippingMinimumFlash ?? MINIMO_FLASH_CLP_DEFAULT) ||
          MINIMO_FLASH_CLP_DEFAULT
        : null,
      tiendaAbierta: true,
    });
  }, [flashUber, subtotal, storeSettings]);

  const shippingMethods = useMemo(
    () =>
      armarOpcionesDeEnvio(
        {
          agendado,
          flash,
          etaFlashMin: flashUber?.etaMin ?? null,
          // El texto sale de las ventanas reales, no se escribe a mano: si
          // mañana cambia la ronda, cambia solo.
          ventanaAgendado: ventanaEconomicaPublicable(),
        },
        baseShippingMethods
      ),
    [agendado, flash, flashUber]
  );

  const selectedMethod = shippingMethods.find((method) => method.id === selectedShippingMethod);

  /**
   * Si el método elegido ya no está en la lista —por ejemplo, el cálculo de
   * distancia falló y `dynamicShipping` quedó en null mientras seguía
   * seleccionado "dynamic"— la expresión anterior (`?.price || 0`) daba 0 y el
   * pedido pasaba con envío gratis sin que nadie lo notara. Ahora se distingue
   * "no hay método válido" de "el envío cuesta 0".
   */
  const hasValidShippingMethod = Boolean(selectedMethod);
  const rawShippingCost = selectedMethod?.price ?? 0;

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
            setDistanceKm(dist);
            setDynamicShipping({
              id: "agendado",
              name: `Envío a domicilio (${dist.toFixed(1)} km)`,
              price: Math.round(cost),
              days: "Despacho propio (Agendable)"
            });
            setSelectedShippingMethod("agendado");
          }
        } else {
          console.error("Distance calculation failed:", result.error);
          alert(`⚠️ No pudimos calcular el costo de envío: ${result.error || 'Verifica tu dirección'}. Por favor, selecciona una dirección sugerida por el buscador.`);
          setDistanceKm(null);
          setDynamicShipping(null);
        }
      } catch (err: any) { 
        console.error("Error calculating shipping:", err);
        alert("Error de conexión al calcular el envío.");
      } finally { 
        setIsCalculatingDistance(false); 
      }
    }
  }, [storeSettings]);

  /**
   * Cotiza el flash cuando cambia la dirección.
   *
   * Va con `subtotal: 0` a propósito: lo que se quiere de Uber es el costo, y
   * el envío gratis se resuelve abajo con el carrito actual. Si fuera el
   * subtotal real, cada producto que el cliente agrega gastaría otra
   * cotización.
   */
  useEffect(() => {
    const calle = shippingInfo.address?.trim();
    const comuna = shippingInfo.city?.trim();
    if (!calle || !comuna) {
      setFlashUber(null);
      setFlashNoConsultado(
        !calle
          ? "todavía no hay dirección"
          : "la dirección no trae comuna — elegí una sugerencia del buscador"
      );
      return;
    }
    setFlashNoConsultado(null);

    // Cada cotización es una llamada real a Uber. Sin esta espera, el efecto
    // corre por cada tecla que el cliente escribe en dirección, comuna o
    // teléfono: en los logs de producción hay 30 cotizaciones de un mismo
    // cliente en 10 segundos. El `cancelado` de abajo sólo evitaba pintar la
    // respuesta vieja, no impedía que la petición saliera.
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      try {
        const res = await fetch("/api/shipping/flash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calle,
            comuna,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            telefono: shippingInfo.phone || null,
            subtotal: 0,
          }),
        });
        if (!res.ok || cancelado) return;
        const d = await res.json();
        if (cancelado) return;
        if (!d.disponible) {
          console.info("[Envío Flash] No disponible en este momento:", d.motivo || "sin-motivo");
        } else {
          console.info("[Envío Flash] Cotizado exitosamente:", { costo: d.rawPrice, etaMin: d.etaMin, quoteId: d.quoteId });
        }
        setFlashUber({
          disponible: Boolean(d.disponible),
          costo: typeof d.rawPrice === "number" && d.rawPrice > 0 ? d.rawPrice : null,
          etaMin: typeof d.etaMin === "number" ? d.etaMin : null,
          quoteId: d.quoteId ?? null,
          motivo: d.motivo ?? null,
          diagnostico: d.diagnostico,
        });
      } catch (err) {
        console.warn("[Envío Flash] Error al consultar cotización:", err);
        if (!cancelado) setFlashUber(null);
      }
    }, ESPERA_COTIZACION_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [shippingInfo.address, shippingInfo.city, shippingInfo.phone, coords]);

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
          const res = await fetch(`/api/user/last-order-address`);
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
    const errors = validateShippingInfo(shippingInfo);
    if (errors) {
      setFieldErrors(errors);
      alert("Por favor completa tus datos y dirección de entrega.");
      return;
    }
    // Las dos modalidades a domicilio se agendan. El servidor rechaza el
    // pedido sin fecha y bloque, así que sin esto el cliente se enteraba
    // recién al apretar pagar.
    const requiereAgenda =
      selectedShippingMethod === "agendado";
    if (requiereAgenda && (!shippingInfo.deliveryDate || !shippingInfo.deliveryTimeSlot)) {
      alert("Elige la fecha y el bloque horario de tu entrega.");
      return;
    }
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(2);
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(1);
  };

  const handleFinalizeOrder = async () => {
    // El botón ya está deshabilitado en vitrina, pero un submit por teclado o
    // un doble evento no deberían llegar a llamar la ruta de cobro.
    if (enVitrina) {
      alert(mensajeVitrina);
      return;
    }

    setLoading(true);
    try {
      // Si el carrito cambió (stock o precio), no se sigue: el cliente tiene
      // que ver el pedido corregido —y el envío recalculado sobre el nuevo
      // subtotal— antes de pagar.
      const isCartValid = await validateCartWithServer();
      if (!isCartValid) {
        setLoading(false);
        return;
      }

      // Sin un método de envío válido no se puede cobrar: antes este caso
      // pasaba como envío $0.
      if (!hasValidShippingMethod) {
        alert('Selecciona un método de envío para continuar.');
        setLoading(false);
        return;
      }

      // Validación extra: MercadoPago no acepta total = 0
      if (selectedPaymentMethod === 'mercadopago' && total <= 0) {
        alert('❌ El total del pedido debe ser mayor a $0 para procesar el pago con MercadoPago.');
        setLoading(false);
        return;
      }
      
      // El servidor recalcula precios, envío, descuentos y total; aquí solo
      // se envían los datos mínimos (coords permite revalidar el envío dinámico).
      const payload = {
        items: cartItems,
        shippingInfo: { ...shippingInfo, coords: coords || undefined },
        shippingMethod: selectedShippingMethod,
        // Regla 1: el servidor recotiza el flash antes de cobrar y compara
        // contra esto. Si subió poco, se respeta lo que el cliente vio.
        flashPrecioMostrado:
          selectedShippingMethod === "flash" && flash ? flash.price : null,
        paymentMethod: selectedPaymentMethod,
        couponCode: appliedCoupon?.code,
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

      if (!response.ok) {
        // La tienda pasó a vitrina mientras el cliente completaba el checkout.
        if (data.previewMode) {
          alert(data.error || PREVIEW_DEFAULT_MESSAGE);
          setLoading(false);
          return;
        }
        // MP falló pero la orden fue creada en la DB
        if (data.orderId) {
          alert(`❌ Error en el pago:\n\n${data.error}\n\nTu pedido #${data.orderId} fue registrado pero NO está pagado. Contáctanos por WhatsApp.`);
        } else {
          throw new Error(data.error || `Error del servidor (${response.status})`);
        }
        setLoading(false);
        return;
      }

      // ── CASO MERCADOPAGO: DEBE existir initPoint ──
      if (selectedPaymentMethod === 'mercadopago') {
        if (!data.initPoint) {
          // NUNCA ir a confirmación si MP no generó el link de pago
          alert(
            '❌ Error de configuración: MercadoPago no generó el link de pago.\n\n' +
            'Verifica en Vercel que la variable MERCADOPAGO_ACCESS_TOKEN esté configurada.\n\n' +
            `Pedido #${data.orderId} creado pero NO pagado.`
          );
          setLoading(false);
          return;
        }
        // ✅ Redirigir al gateway real de MercadoPago
        console.log('[Checkout] Redirigiendo a MercadoPago:', data.initPoint);
        window.location.href = data.initPoint;
        return;
      }

      // Otros métodos de pago (si hubiera)
      router.push(`/checkout/confirmacion?orderId=${data.orderId}`);

    } catch (err: any) {
      console.error('[Checkout] Error fatal:', err);
      alert(`❌ Error al procesar pedido: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="o-container py-8 md:py-12">
        <Link
          href="/carrito"
          className="o-focus group mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Volver al carrito
        </Link>

        <h1 className="o-h1 mb-6 text-neutral-900">Finalizar pedido</h1>

        <CheckoutSteps currentStep={step} />

        {storeSettings?.shipping?.isHighDemand && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Alta demanda</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Estamos recibiendo muchos pedidos y algunos bloques horarios se agotan rápido.
                Te conviene reservar tu entrega cuanto antes.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          {/* ── Columna de formulario ── */}
          <div className="space-y-5 lg:col-span-8">
            {step === 1 ? (
              <>
                <section className="o-card p-5 sm:p-7">
                  <h2 className="o-h3 mb-5 flex items-center gap-2 text-neutral-900">
                    <UserIcon className="size-5 text-neutral-400" />
                    Tus datos
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Nombre completo
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleShippingInfoChange}
                        placeholder="Ej: Juan Pérez"
                        autoComplete="name"
                        className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        value={shippingInfo.email}
                        onChange={handleShippingInfoChange}
                        placeholder="tu@email.com"
                        autoComplete="email"
                        className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Teléfono
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        value={shippingInfo.phone}
                        onChange={handleShippingInfoChange}
                        placeholder="+56 9 1234 5678"
                        autoComplete="tel"
                        className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </section>

                <section className="o-card p-5 sm:p-7">
                  <h2 className="o-h3 mb-5 flex items-center gap-2 text-neutral-900">
                    <MapPinIcon className="size-5 text-neutral-400" />
                    Entrega
                  </h2>

                  {!coords && shippingInfo.address && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Falta precisar la ubicación</p>
                        <p className="mt-1 text-sm leading-relaxed text-amber-800">
                          Elige tu dirección de la lista que aparece al escribir, o usa el botón de GPS.
                          Sin eso no podemos calcular el costo de envío.
                        </p>
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
                    avisoFlash={avisoFlashNoDisponible(
                      flashUber?.disponible ? null : flashUber?.motivo,
                      horarioDeAtencionPublicable()
                    )}
                    diagnosticoFlash={
                      flashNoConsultado
                        ? { motivo: "no-consultado", detalle: flashNoConsultado }
                        : flashUber?.diagnostico
                          ? { motivo: flashUber.motivo, ...flashUber.diagnostico }
                          : null
                    }
                    fieldErrors={fieldErrors}
                  />

                  <div className="mt-6 flex justify-end border-t border-neutral-100 pt-6">
                    <Button size="lg" onClick={nextStep} className="h-12 px-7">
                      Continuar al pago
                    </Button>
                  </div>
                </section>
              </>
            ) : (
              <>
                <button
                  onClick={prevStep}
                  className="o-focus inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:text-brand-700"
                >
                  <ArrowLeftIcon className="size-4" />
                  Volver a los datos de entrega
                </button>

                <section className="o-card p-5 sm:p-7">
                  <h2 className="o-h3 mb-5 flex items-center gap-2 text-neutral-900">
                    <MapIcon className="size-5 text-neutral-400" />
                    Revisa tu entrega
                  </h2>

                  <div className="space-y-4">
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="mb-1 text-xs font-medium text-neutral-500">Dirección de entrega</p>
                      <p className="text-[15px] font-semibold leading-snug text-neutral-900">
                        {shippingInfo.address}
                      </p>
                      {(shippingInfo.apartment || shippingInfo.tower) && (
                        <p className="mt-1 text-sm text-neutral-600">
                          {shippingInfo.apartment && `Depto ${shippingInfo.apartment}`}
                          {shippingInfo.apartment && shippingInfo.tower && " · "}
                          {shippingInfo.tower && `Torre ${shippingInfo.tower}`}
                        </p>
                      )}
                    </div>

                    {/* Feedback de las reglas de despacho: sin esto el cliente
                        ve un precio distinto al calculado por distancia y no
                        entiende por qué. */}
                    {selectedShippingMethod === 'flash' && flash?.freeApplied && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                        <p className="text-sm font-semibold text-brand-900">Tu envío flash es gratis</p>
                        <p className="mt-1 text-sm text-brand-800">
                          Tu compra supera el mínimo, así que el repartidor lo ponemos nosotros.
                        </p>
                      </div>
                    )}

                    {selectedShippingMethod === 'agendado' && agendado?.freeApplied && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                        <p className="text-sm font-semibold text-brand-900">Tu envío es gratis</p>
                        <p className="mt-1 text-sm text-brand-800">
                          Tu compra supera el mínimo y tu dirección está dentro de nuestra zona de reparto.
                        </p>
                      </div>
                    )}

                    {/* Por qué el envío cuesta lo que cuesta. Con dos tramos
                        de precio, ver un número sin explicación deja al cliente
                        preguntándose si se equivocó de dirección. */}
                    {selectedShippingMethod === 'agendado' && !agendado?.freeApplied && agendado?.tarifaPlana && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                        <p className="text-sm font-semibold text-brand-900">Tarifa cercana</p>
                        <p className="tabular mt-1 text-sm text-brand-800">
                          Estás a menos de {RADIO_ZONA_PLANA_KM} km del local, así que el envío te sale
                          ${TARIFA_ZONA_PLANA_CLP.toLocaleString('es-CL')} plano.
                        </p>
                      </div>
                    )}

                    {selectedShippingMethod === 'agendado' && !agendado?.freeApplied && agendado && !agendado.tarifaPlana && (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-sm font-semibold text-neutral-900">Envío por distancia</p>
                        <p className="tabular mt-1 text-sm text-neutral-700">
                          Tu dirección queda a {agendado.distanceKm?.toFixed(1)} km del local, fuera de la zona
                          de tarifa plana, así que el envío se calcula por distancia. También puedes retirar en
                          tienda sin costo.
                        </p>
                      </div>
                    )}

                    {selectedShippingMethod === 'agendado' && (
                      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4">
                        <ClockIcon className="size-5 shrink-0 text-neutral-400" />
                        <div>
                          <p className="text-xs font-medium text-neutral-500">Horario de despacho</p>
                          <p className="text-[15px] font-semibold text-neutral-900">
                            {shippingInfo.deliveryDate || 'No especificado'}
                          </p>
                          {shippingInfo.deliveryTimeSlot && (
                            <p className="text-sm text-neutral-600">{shippingInfo.deliveryTimeSlot}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="o-card p-5 sm:p-7">
                  <PaymentForm
                    paymentMethods={paymentMethods}
                    selectedMethod={selectedPaymentMethod}
                    onMethodChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  />
                </section>
              </>
            )}
          </div>

          {/* ── Resumen ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-8">
            <div className="o-card p-5 sm:p-6">
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

              <div className="mt-5 border-t border-neutral-100 pt-5">
                {step === 1 ? (
                  <Button fullWidth onClick={nextStep} className="h-12 text-base">
                    Continuar al pago
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    onClick={handleFinalizeOrder}
                    loading={loading}
                    disabled={enVitrina}
                    className="h-13 text-base"
                  >
                    {loading
                      ? "Procesando…"
                      : enVitrina
                        ? "Todavía no aceptamos pedidos"
                        : `Pagar ${clpFormat(total)}`}
                  </Button>
                )}

                {enVitrina ? (
                  <p className="mt-3 text-center text-xs leading-relaxed text-amber-800">
                    {mensajeVitrina}
                  </p>
                ) : (
                  <>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                      <ShieldCheckIcon className="size-4 shrink-0" />
                      Compra protegida
                    </p>
                    <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-500">
                      Al pagar aceptas los{" "}
                      <Link href="/legal/terminos" className="underline underline-offset-2 hover:text-neutral-700">
                        términos y condiciones
                      </Link>{" "}
                      y la{" "}
                      <Link href="/legal/privacidad" className="underline underline-offset-2 hover:text-neutral-700">
                        política de privacidad
                      </Link>
                      .
                    </p>
                  </>
                )}
              </div>
            </div>

            {storeSettings?.storePhone && (
              <a
                href={whatsappLink(storeSettings.storePhone, checkoutInquiryMessage(cartItems, total))}
                target="_blank"
                rel="noopener noreferrer"
                className="o-focus mt-4 block rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-center text-sm font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                ¿Dudas con tu pedido? Escríbenos por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
