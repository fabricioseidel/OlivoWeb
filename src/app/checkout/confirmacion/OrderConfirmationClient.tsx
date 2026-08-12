"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckIcon,
  ShoppingBagIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { whatsappLink } from "@/utils/whatsapp";

/**
 * Estado real del pedido, derivado de la BD y no del query param.
 *
 * `?payment=` viene de las back_urls de MercadoPago y es manipulable por el
 * usuario, así que solo sirve como pista inicial mientras llega el webhook.
 * La fuente de verdad es `payment_status` en la orden.
 */
type PaymentState = "paid" | "pending" | "failed" | "loading";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 8; // ~20s: el webhook de MP suele acreditar en pocos segundos

export default function OrderConfirmationClient() {
  const { clearCart } = useCart();
  const { settings } = useStoreSettings();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const paymentHint = searchParams.get("payment"); // 'success' | 'failure' | 'pending'

  const [order, setOrder] = useState<any | null>(null);
  const [state, setState] = useState<PaymentState>("loading");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const pollsRef = useRef(0);

  // El carrito solo se vacía cuando el pedido quedó efectivamente pagado o en
  // proceso de acreditación. Si el pago falló, el cliente conserva su carrito.
  useEffect(() => {
    if (orderId && paymentHint !== "failure") clearCart();
  }, [orderId, paymentHint, clearCart]);

  const readState = useCallback((data: any): PaymentState => {
    const ps = String(data?.payment_status || "").toLowerCase();
    const st = String(data?.status || "").toLowerCase();
    if (ps === "paid" || ps === "approved" || ps === "authorized") return "paid";
    if (["rejected", "cancelled", "refunded"].includes(ps) || ["cancelled", "refunded"].includes(st)) {
      return "failed";
    }
    return "pending";
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("no-order");
        const data = await res.json();
        if (cancelled) return;
        setOrder(data);
        const next = readState(data);
        setState(next);

        // El webhook de MercadoPago es asíncrono: si volvimos con
        // `payment=success` pero la orden todavía figura pendiente, reintentamos
        // unas cuantas veces antes de darla por no acreditada.
        if (next === "pending" && paymentHint === "success" && pollsRef.current < MAX_POLLS) {
          pollsRef.current += 1;
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        // Si no podemos leer la orden (por ejemplo, compra sin sesión iniciada),
        // caemos a la pista del query param en vez de afirmar que está pagada.
        setState(paymentHint === "success" ? "pending" : paymentHint === "failure" ? "failed" : "pending");
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, paymentHint, readState]);

  const handleRetry = async () => {
    if (!orderId) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/retry-payment`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.initPoint) {
        throw new Error(data.error || "No pudimos generar el link de pago.");
      }
      window.location.href = data.initPoint;
    } catch (err: any) {
      setRetryError(err.message || "No pudimos generar el link de pago.");
      setRetrying(false);
    }
  };

  if (!orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-neutral-900">No encontramos tu pedido</h2>
        <p className="mb-8 text-neutral-500">Si crees que esto es un error, por favor contáctanos.</p>
        <Link href="/">
          <Button className="h-12 rounded-xl bg-emerald-600 px-8 font-semibold hover:bg-emerald-700">
            Volver a la tienda
          </Button>
        </Link>
      </div>
    );
  }

  const shortId = String(orderId).slice(0, 8).toUpperCase();
  const supportPhone = settings?.storePhone;

  // ── Presentación por estado ──
  const copy = {
    loading: {
      badge: "Verificando",
      title: "Verificando tu pago",
      body: "Estamos confirmando el estado de tu pedido con MercadoPago. Esto toma unos segundos.",
      tone: "neutral" as const,
    },
    paid: {
      badge: "Pago acreditado",
      title: "¡Listo! Tu pedido está confirmado",
      body: `Recibimos tu pago del pedido #${shortId}. Te enviamos un email con el detalle de la compra.`,
      tone: "success" as const,
    },
    pending: {
      badge: "Pago pendiente",
      title: "Tu pago aún no se acredita",
      body: `El pedido #${shortId} quedó registrado, pero todavía no recibimos la confirmación de pago. Si ya pagaste, se acreditará en unos minutos. Si no alcanzaste a completarlo, puedes retomarlo aquí.`,
      tone: "warning" as const,
    },
    failed: {
      badge: "Pago no completado",
      title: "No pudimos procesar tu pago",
      body: `El pedido #${shortId} quedó registrado pero sin pagar. Puedes reintentar el pago con otro medio o escribirnos y lo resolvemos contigo.`,
      tone: "danger" as const,
    },
  }[state];

  const tone = {
    neutral: { ring: "bg-neutral-100 text-neutral-500", chip: "bg-neutral-100 text-neutral-600", bar: "from-neutral-200 to-neutral-300" },
    success: { ring: "bg-emerald-600 text-white", chip: "bg-emerald-50 text-emerald-700", bar: "from-emerald-400 to-emerald-600" },
    warning: { ring: "bg-amber-500 text-white", chip: "bg-amber-50 text-amber-700", bar: "from-amber-300 to-amber-500" },
    danger: { ring: "bg-red-500 text-white", chip: "bg-red-50 text-red-700", bar: "from-red-300 to-red-500" },
  }[copy.tone];

  const canRetry = state === "pending" || state === "failed";
  const steps = [
    { label: "Pedido recibido", icon: CheckIcon, done: true },
    { label: "Pago acreditado", icon: state === "paid" ? CheckIcon : ClockIcon, done: state === "paid" },
    { label: "En camino", icon: TruckIcon, done: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm">
          <div className={`h-1 bg-gradient-to-r ${tone.bar}`} />

          <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
            <div
              className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${tone.ring}`}
            >
              {state === "paid" ? (
                <CheckIcon className="h-8 w-8 stroke-[2.5]" />
              ) : state === "loading" ? (
                <ArrowPathIcon className="h-8 w-8 animate-spin" />
              ) : (
                <ExclamationTriangleIcon className="h-8 w-8" />
              )}
            </div>

            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.chip}`}
            >
              {copy.badge}
            </span>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-600">
              {copy.body}
            </p>

            {order?.total > 0 && (
              <p className="mt-4 text-sm text-neutral-500">
                Total del pedido:{" "}
                <strong className="font-semibold text-neutral-900">
                  ${Number(order.total).toLocaleString("es-CL")}
                </strong>
              </p>
            )}

            {/* Reintento de pago — sin esto un pedido pendiente no tiene salida */}
            {canRetry && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {retrying ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Generando link…
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4" />
                      Reintentar el pago
                    </>
                  )}
                </button>
                {retryError && <p className="mt-3 text-sm text-red-600">{retryError}</p>}
                <p className="mt-3 text-xs text-neutral-400">
                  Se reutiliza este mismo pedido, no se genera uno nuevo.
                </p>
              </div>
            )}

            {/* Progreso */}
            <div className="mt-12">
              <div className="relative grid grid-cols-3 gap-2">
                <div className="absolute left-[16%] right-[16%] top-5 -z-10 h-px bg-neutral-200" />
                {steps.map((s) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white ${
                        s.done ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <s.icon className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <p
                      className={`mt-3 text-xs font-medium ${
                        s.done ? "text-emerald-700" : "text-neutral-400"
                      }`}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/mi-cuenta/pedidos"
                className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-900 font-semibold text-white transition hover:bg-neutral-800"
              >
                Ver mis pedidos
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/productos"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-200 font-semibold text-neutral-800 transition hover:border-emerald-500 hover:text-emerald-700"
              >
                <ShoppingBagIcon className="h-4 w-4" />
                Seguir comprando
              </Link>
            </div>
          </div>

          {/* Soporte */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 bg-neutral-50/80 px-6 py-6 sm:flex-row sm:px-12">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">¿Necesitas ayuda con tu pedido?</p>
                <p className="text-xs text-neutral-500">Te respondemos por WhatsApp en horario de tienda.</p>
              </div>
            </div>
            {supportPhone && (
              <a
                href={whatsappLink(supportPhone, `Hola! Tengo una consulta sobre mi pedido #${shortId}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 shrink-0 items-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Escribir por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
