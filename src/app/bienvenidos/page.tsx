"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  QrCodeIcon,
  GiftIcon,
  StarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

/** Debe coincidir con el cupón que emite /api/auth/register para
 *  source = "tienda_fisica". Si allí cambia, cámbialo también aquí. */
const WELCOME_DISCOUNT_PERCENT = 15;
const WELCOME_MIN_PURCHASE = 20000;
const WELCOME_BONUS_POINTS = 200;

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

export default function BienvenidosPage() {
  const { data: session } = useSession();

  // Marca que el registro viene del QR de la tienda física. /registro lo lee
  // para emitir el cupón y los puntos de bienvenida.
  useEffect(() => {
    if (typeof window !== "undefined" && !session) {
      sessionStorage.setItem("registration_source", "tienda_fisica");
    }
  }, [session]);

  const benefits = [
    {
      icon: GiftIcon,
      title: `Cupón de ${WELCOME_DISCOUNT_PERCENT}% de descuento`,
      // El cupón se emite con min_purchase = 20000. Antes la página prometía el
      // descuento "en tu primera compra" sin decirlo, y el cliente se enteraba
      // recién al intentar aplicarlo en el checkout.
      detail: `Válido por 30 días en compras sobre ${clp(WELCOME_MIN_PURCHASE)}.`,
    },
    {
      icon: StarIcon,
      title: `${WELCOME_BONUS_POINTS} puntos de regalo`,
      detail: "Para empezar tu programa de fidelidad con saldo a favor.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="o-container py-12 md:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* ── Beneficios ── */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
              <QrCodeIcon className="size-4" />
              Beneficio de tienda física
            </span>

            <h1 className="o-display mb-3 mt-4 text-neutral-900">
              Qué bueno verte por aquí
            </h1>

            <p className="o-body mb-8 max-w-md text-neutral-600">
              Activaste tu regalo por visitarnos. Crea tu cuenta y recibe estos beneficios
              en tu primera compra online.
            </p>

            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b.title} className="o-card flex items-start gap-3.5 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <b.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-neutral-900">{b.title}</span>
                    <span className="block text-sm text-neutral-500">{b.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Acción ── */}
          <div className="o-card p-6 text-center sm:p-8">
            {session ? (
              <>
                <h2 className="o-h2 mb-2 text-neutral-900">Ya tienes cuenta</h2>
                <p className="o-body mb-7 text-neutral-600">
                  Ya iniciaste sesión{session.user?.name ? `, ${session.user.name}` : ""}.
                  Revisa tus puntos y beneficios en tu cuenta.
                </p>
                <Link href="/mi-cuenta/puntos" className="block">
                  <Button fullWidth className="group h-12 text-base">
                    Ver mis puntos
                    <ArrowRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h2 className="o-h2 mb-2 text-neutral-900">Crea tu cuenta gratis</h2>
                <p className="o-body mb-7 text-neutral-600">
                  Toma menos de un minuto.
                </p>

                {/* El botón principal apuntaba a /login?mode=register, pero
                    /login no interpreta ese parámetro: quien escaneaba el QR
                    terminaba en el formulario de inicio de sesión. */}
                <Link href="/registro" className="block">
                  <Button fullWidth className="group h-12 text-base">
                    Registrarme
                    <ArrowRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>

                <div className="relative py-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-neutral-500">o si ya tienes cuenta</span>
                  </div>
                </div>

                <Link href="/login" className="block">
                  <Button variant="outline" fullWidth className="h-12 text-base">
                    Iniciar sesión
                  </Button>
                </Link>

                <p className="mt-6 text-xs leading-relaxed text-neutral-500">
                  Al registrarte te unes a nuestro programa de fidelidad y aceptas recibir
                  novedades y beneficios de OlivoMarket.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-6">
          <p className="text-sm text-neutral-500">OlivoMarket · Ñuñoa</p>
          {/* El enlace a /nosotros apuntaba a una ruta que no existe. */}
          <Link
            href="/productos"
            className="o-focus rounded text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Explorar catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
