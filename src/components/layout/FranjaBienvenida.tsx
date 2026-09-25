"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GiftIcon } from "@heroicons/react/24/outline";
import { BIENVENIDA_COPY } from "@/lib/bienvenida";

/**
 * La franja que le cuenta al visitante que existe el descuento de bienvenida.
 *
 * El tráfico llega de Google Maps y de Instagram, o sea gente que no conoce la
 * tienda y que aterriza en la portada o en una ficha de producto. El cupón se
 * emite al registrarse y el checkout lo aplica solo, pero nada de eso sirve si
 * el visitante nunca se entera de que existe: se iba sin crear la cuenta.
 *
 * Tiene tres estados y ninguno es decorativo:
 *
 *  - **Sin sesión** → el gancho, con el enlace a registrarse.
 *  - **Con sesión y cupón sin usar** → el recordatorio de que ya lo tiene y de
 *    que no hay que tipear ningún código. Quien sabe que tiene plata a favor
 *    vuelve a comprar.
 *  - **Con sesión y sin cupón** → no se muestra nada. Ofrecerle un descuento de
 *    bienvenida a quien ya lo usó es ruido, y encima molesto.
 *
 * Quien la cierra no la vuelve a ver en esa sesión del navegador. Una franja
 * que no se puede cerrar es una franja que tapa el sitio.
 */

const CERRADA_KEY = "olivo-franja-bienvenida-cerrada";

export default function FranjaBienvenida() {
  const { status } = useSession();
  const [cerrada, setCerrada] = useState(true); // cerrada hasta saber: no parpadea
  const [tieneCupon, setTieneCupon] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setCerrada(sessionStorage.getItem(CERRADA_KEY) === "1");
    } catch {
      // Navegador con el almacenamiento bloqueado: se muestra igual.
      setCerrada(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setTieneCupon(null);
      return;
    }
    let cancelado = false;
    fetch("/api/coupons/mio")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelado) setTieneCupon(Boolean(d?.cupon?.code));
      })
      .catch(() => {
        // Sin respuesta no se promete nada: es peor prometer un descuento que
        // después no aparece en el checkout.
        if (!cancelado) setTieneCupon(false);
      });
    return () => {
      cancelado = true;
    };
  }, [status]);

  const cerrar = () => {
    setCerrada(true);
    try {
      sessionStorage.setItem(CERRADA_KEY, "1");
    } catch {
      /* que no se pueda recordar no impide cerrarla ahora */
    }
  };

  if (cerrada || status === "loading") return null;
  // Con sesión sólo se muestra si de verdad tiene un cupón esperando.
  if (status === "authenticated" && tieneCupon !== true) return null;

  const conCuenta = status === "authenticated";

  return (
    <div className="relative bg-brand-600 text-white print:hidden">
      <div className="o-container flex items-center justify-center gap-3 py-2 pr-8 text-center">
        <GiftIcon className="hidden size-5 shrink-0 sm:block" aria-hidden="true" />
        <p className="text-sm leading-snug">
          {conCuenta ? (
            <span className="font-semibold">{BIENVENIDA_COPY.barraConCupon}</span>
          ) : (
            <>
              <span className="font-semibold">{BIENVENIDA_COPY.barraSinCuenta}</span>{" "}
              <Link
                href="/registro"
                className="o-focus rounded underline underline-offset-4 hover:no-underline"
              >
                Creá tu cuenta
              </Link>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar el aviso del descuento de bienvenida"
        className="o-focus absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
