"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GiftIcon } from "@heroicons/react/24/outline";
import { BIENVENIDA, BIENVENIDA_COPY } from "@/lib/bienvenida";
import type { CartItem } from "@/types";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/**
 * Cuánto le ahorra el cupón de bienvenida a este carrito.
 *
 * La decisión de comprar se toma en el carrito, no en el checkout: mostrar el
 * descuento recién en la pantalla de pago es mostrarlo después de que la
 * persona ya decidió si el precio le servía. Acá se ve antes.
 *
 * **El número lo calcula el servidor**, con la misma ruta que usa el checkout
 * (`/api/coupons/validate`) y por lo tanto con la misma regla: el cupón no se
 * acumula con las ofertas. Calcularlo acá con una fórmula propia sería una
 * segunda verdad, y la última vez que hubo dos verdades sobre un precio el
 * cliente vio un total y pagó otro.
 *
 * Tres estados:
 *  - Sin sesión → el gancho para registrarse, con el monto que se llevaría.
 *  - Con cupón y carrito por debajo del mínimo → cuánto le falta.
 *  - Con cupón aplicable → el ahorro, en pesos.
 */
export default function AhorroBienvenida({
  cartItems,
  subtotal,
}: {
  cartItems: CartItem[];
  subtotal: number;
}) {
  const { status } = useSession();
  const [descuento, setDescuento] = useState<number | null>(null);
  const [minimo, setMinimo] = useState<number>(BIENVENIDA.compraMinima);
  const [sinCupon, setSinCupon] = useState(false);

  const firma = cartItems.map((i) => `${i.id}:${i.quantity}`).join("|");

  useEffect(() => {
    if (status !== "authenticated" || cartItems.length === 0) return;

    let cancelado = false;
    (async () => {
      try {
        const r = await fetch("/api/coupons/mio");
        const { cupon } = await r.json();
        if (cancelado) return;
        if (!cupon?.code) {
          setSinCupon(true);
          return;
        }
        setMinimo(Number(cupon.minPurchase) || BIENVENIDA.compraMinima);

        const v = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: cupon.code,
            cartTotal: subtotal,
            items: cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
          }),
        });
        const data = await v.json();
        if (cancelado) return;
        setDescuento(data?.valid ? Number(data.discount) || 0 : 0);
      } catch {
        // Sin respuesta no se promete nada: prometer un ahorro que después no
        // aparece en el checkout es peor que no decir nada.
        if (!cancelado) setSinCupon(true);
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, firma]);

  if (cartItems.length === 0) return null;

  // Ya usó su cupón: no se le ofrece un descuento de bienvenida otra vez.
  if (status === "authenticated" && sinCupon) return null;

  const caja = "mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3.5";

  if (status !== "authenticated") {
    return (
      <div className={caja}>
        <p className="flex items-start gap-2.5 text-sm text-brand-900">
          <GiftIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{BIENVENIDA_COPY.titulo}.</span>{" "}
            <Link href="/registro" className="o-focus rounded underline underline-offset-2">
              Creá tu cuenta
            </Link>{" "}
            y se aplica solo al pagar.
          </span>
        </p>
      </div>
    );
  }

  if (descuento === null) return null; // todavía preguntando

  if (descuento > 0) {
    return (
      <div className={caja}>
        <p className="flex items-start gap-2.5 text-sm text-brand-900">
          <GiftIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>
            Con tu cupón de bienvenida ahorrás{" "}
            <span className="font-semibold">{clp(descuento)}</span>. Se aplica solo al pagar.
          </span>
        </p>
      </div>
    );
  }

  // Descuento en cero: o no llega al mínimo, o el carrito es todo oferta.
  const falta = Math.max(0, minimo - subtotal);

  return (
    <div className={caja}>
      <p className="flex items-start gap-2.5 text-sm text-brand-900">
        <GiftIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          {falta > 0 ? (
            <>
              Agregá <span className="font-semibold">{clp(falta)}</span> más y tu cupón de
              bienvenida te descuenta un {BIENVENIDA.porcentaje}%.
            </>
          ) : (
            <>
              Tenés tu cupón de {BIENVENIDA.porcentaje}% guardado. No se aplica acá porque tu
              carrito ya está todo en oferta.
            </>
          )}
        </span>
      </p>
    </div>
  );
}
