"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/contexts/ProductContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { whatsappLink, cartInquiryMessage } from "@/utils/whatsapp";
import { useSiteCopy } from "@/hooks/useSiteCopy";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function CartPage() {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    total
  } = useCart();
  const { settings } = useStoreSettings();
  const { t } = useSiteCopy();
  const { products } = useProducts();

  /**
   * Stock real por producto.
   *
   * El botón de sumar del carrito no tenía tope, mientras que la tarjeta del
   * catálogo sí lo respetaba. Se podían acumular 36 unidades de un producto con
   * 2 disponibles, y el exceso recién se detectaba al pagar: ahí el pedido se
   * recortaba de golpe y el cliente veía desaparecer casi toda su compra.
   */
  const stockById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (typeof p.stock === "number") map.set(String(p.id), p.stock);
    }
    return map;
  }, [products]);

  // El umbral de envío gratis estaba escrito a mano ($30.000) e ignoraba lo
  // configurado en Admin → Envíos, así que la barra de progreso podía prometer
  // algo distinto de lo que el checkout cobraba.
  const freeShippingEnabled = settings?.shipping?.freeShippingEnabled ?? false;
  const freeShippingMinimum = Number(settings?.shipping?.freeShippingMinimum ?? 0);
  const showFreeShippingMeter = freeShippingEnabled && freeShippingMinimum > 0;
  const reachedFreeShipping = showFreeShippingMeter && subtotal >= freeShippingMinimum;
  const missingForFreeShipping = Math.max(0, freeShippingMinimum - subtotal);
  const progress = showFreeShippingMeter
    ? Math.min((subtotal / freeShippingMinimum) * 100, 100)
    : 0;

  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="o-container o-section">
        <div className="o-card mx-auto max-w-md px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-neutral-100">
            <ShoppingBagIcon className="size-7 text-neutral-400" />
          </div>
          <h1 className="o-h2 mb-2 text-neutral-900">{t("cart.empty.title")}</h1>
          <p className="o-body mx-auto mb-8 max-w-xs text-neutral-500">
            {t("cart.empty.body")}
          </p>
          <Link href="/productos">
            <Button size="lg" className="h-12 px-8">{t("cart.empty.cta")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="o-container o-section">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="o-h1 text-neutral-900">Tu carrito</h1>
          <p className="o-caption mt-1 text-neutral-500">
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
          </p>
        </div>
        <button
          onClick={clearCart}
          className="o-focus rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-red-600"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Líneas del carrito ── */}
        <div className="space-y-3 lg:col-span-2">
          {cartItems.map((item) => {
            const stock = stockById.get(String(item.id));
            const atStockLimit = typeof stock === "number" && item.quantity >= stock;
            return (
            <div key={item.id} className="o-card p-4">
              <div className="flex gap-4">
                <Link
                  href={`/productos/${item.slug}`}
                  className="o-focus size-20 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 sm:size-24"
                >
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/productos/${item.slug}`}
                        className="o-focus line-clamp-2 text-[15px] font-semibold leading-snug text-neutral-900 transition-colors hover:text-brand-700"
                      >
                        {item.name}
                      </Link>
                      <p className="tabular mt-1 text-sm text-neutral-500">{clp(item.price)} c/u</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="o-focus shrink-0 rounded-lg p-2 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-neutral-200">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label={`Quitar una unidad de ${item.name}`}
                        className="o-focus flex size-9 items-center justify-center rounded-l-xl text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30"
                      >
                        <MinusIcon className="size-4" />
                      </button>
                      <span className="tabular w-9 text-center text-sm font-semibold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={atStockLimit}
                        aria-label={`Agregar una unidad de ${item.name}`}
                        className="o-focus flex size-9 items-center justify-center rounded-r-xl text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                    <p className="tabular text-[15px] font-semibold text-neutral-900">
                      {clp(item.price * item.quantity)}
                    </p>
                  </div>

                  {atStockLimit && (
                    <p className="mt-2 text-xs text-amber-700">
                      Es todo el stock disponible de este producto.
                    </p>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          <Link
            href="/productos"
            className="o-focus inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <PlusIcon className="size-4" />
            Seguir comprando
          </Link>
        </div>

        {/* ── Resumen ── */}
        <div className="lg:col-span-1">
          <div className="o-card sticky top-24 p-6">
            {showFreeShippingMeter && (
              <div className="mb-6 rounded-xl bg-brand-50 p-4">
                {reachedFreeShipping ? (
                  <>
                    <p className="text-sm font-medium text-brand-800">
                      Alcanzaste el monto para envío gratis.
                    </p>
                    {/* En el carrito todavía no hay dirección, y el envío gratis
                        depende de que el despacho quede dentro de la zona de
                        reparto. Prometerlo sin condiciones acá deja al checkout
                        desdiciéndose solo. */}
                    <p className="mt-1 text-xs text-brand-700">
                      Se aplica al pagar si tu dirección está dentro de nuestra zona de reparto.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-brand-900">Envío gratis</span>
                      <span className="tabular text-sm text-brand-700">
                        te faltan {clp(missingForFreeShipping)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-brand-200"
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progreso hacia envío gratis"
                    >
                      <div
                        className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <h2 className="o-h3 mb-4 text-neutral-900">Resumen</h2>

            <dl className="space-y-3 border-b border-neutral-100 pb-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="o-body text-neutral-600">Subtotal</dt>
                <dd className="tabular text-[15px] font-medium text-neutral-900">{clp(subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="o-body text-neutral-600">Envío</dt>
                <dd className="o-caption text-neutral-500">Se calcula al pagar</dd>
              </div>
            </dl>

            <div className="flex items-baseline justify-between gap-3 py-5">
              <span className="text-[15px] font-semibold text-neutral-900">Total</span>
              <span className="tabular text-2xl font-bold text-neutral-900">{clp(total)}</span>
            </div>

            <Link href="/checkout" className="block">
              <Button fullWidth size="lg" className="h-13 text-base">
                {t("cart.checkoutCta")}
              </Button>
            </Link>

            <p className="o-caption mt-3 text-center text-neutral-400">
              {t("cart.shippingNote")}
            </p>

            {settings?.storePhone && (
              <a
                href={whatsappLink(settings.storePhone, cartInquiryMessage(cartItems, total))}
                target="_blank"
                rel="noopener noreferrer"
                className="o-focus mt-5 block rounded-xl border border-neutral-200 px-4 py-3 text-center text-sm font-medium text-neutral-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {t("cart.supportCta")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
