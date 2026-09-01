"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  ShoppingBasket,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { useProducts } from "@/contexts/ProductContext";
import { isProductVisible } from "@/services/products";
import { BUSINESS, whatsappLink } from "@/lib/seo/business";
import {
  diasParaElDieciocho,
  enTemporadaDieciochera,
  esProductoDieciochero,
  ordenarDieciocheros,
  textoCuentaRegresiva,
} from "@/lib/fiestas-patrias";
import BanderaChile from "@/components/fiestas/BanderaChile";
import GuirnaldaChilena from "@/components/fiestas/GuirnaldaChilena";
import VitrinaDieciochera from "@/components/fiestas/VitrinaDieciochera";

const MENSAJE_WHATSAPP =
  "¡Hola Olivo Market! Quiero encargar productos para Fiestas Patrias 🇨🇱";

const PASOS = [
  {
    icon: ShoppingBasket,
    titulo: "Elige tus productos",
    detalle:
      "Arma tu pedido con las empanadas y lo que necesites para la mesa del 18.",
  },
  {
    icon: CalendarCheck,
    titulo: "Anticipa la fecha",
    detalle:
      "Dinos para qué día lo quieres. Entre el 16 y el 18 la demanda se dispara.",
  },
  {
    icon: Truck,
    titulo: "Retira o recibe",
    detalle: `Retiro en ${BUSINESS.addressFull} o despacho a domicilio en Ñuñoa y comunas vecinas.`,
  },
];

const RESPALDOS = [
  { icon: CalendarCheck, titulo: "Anticipa tu pedido", detalle: "Sin filas el 18" },
  { icon: UtensilsCrossed, titulo: "Ingredientes de calidad", detalle: "Hechas como en casa" },
  { icon: Heart, titulo: "Sabor que nos une", detalle: "De nuestro barrio a tu mesa" },
];

export default function FiestasPatriasClient() {
  const { products, loading } = useProducts();

  const dieciocheros = useMemo(
    () =>
      ordenarDieciocheros(
        products.filter(
          p => p.isActive && isProductVisible(p) && esProductoDieciochero(p)
        )
      ),
    [products]
  );

  const enTemporada = enTemporadaDieciochera();
  const faltan = diasParaElDieciocho();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Encabezado de ramada ── */}
      <section className="fp-hero relative overflow-hidden">
        <GuirnaldaChilena className="absolute inset-x-0 top-0" />
        <div className="o-container py-14 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <BanderaChile className="fp-ondea h-8 w-auto rounded shadow-lg" />
                {enTemporada && (
                  <span className="fp-chip bg-fp-rojo text-white">
                    <Clock className="size-3.5" />
                    {textoCuentaRegresiva()}
                  </span>
                )}
              </div>

              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-fp-rojo-claro">
                Olivo Market · Ñuñoa
              </p>

              <h1 className="o-display mb-4 text-white">
                ¡Anticipa tu pedido para estas Fiestas Patrias!
              </h1>

              <p className="o-body mb-7 max-w-xl text-white/75">
                Todo para tu 18 en un solo lugar: nuestras empanadas de pino,
                los abarrotes del asado y lo que falte para la mesa. Encarga con
                tiempo y retíralo el día que lo necesitas.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href={whatsappLink(MENSAJE_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="o-focus inline-flex h-12 items-center gap-2 rounded-xl bg-fp-rojo px-6 text-sm font-semibold text-white transition-colors hover:bg-fp-rojo-claro"
                >
                  <MessageCircle className="size-4" />
                  Haz tu pedido por WhatsApp
                </a>
                <a
                  href="#vitrina"
                  className="o-focus inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Ver productos <ChevronRight className="size-4" />
                </a>
              </div>

              {/* NAP visible: en septiembre la búsqueda es "empanadas cerca
                  de mí" y el dato que cierra la venta es la dirección. */}
              <div className="mt-7 space-y-2 border-t border-white/10 pt-6 text-sm text-white/75">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-fp-rojo-claro" />
                  {BUSINESS.addressFull}
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-fp-rojo-claro" />
                  {BUSINESS.openingHoursDisplay
                    .map(h => `${h.label}: ${h.value}`)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {RESPALDOS.map(({ icon: Icon, titulo, detalle }) => (
                <li
                  key={titulo}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25">
                    <Icon className="size-5 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{titulo}</p>
                    <p className="text-xs text-white/65">{detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="fp-tricolor absolute inset-x-0 bottom-0" />
      </section>

      {/* ── Vitrina ── */}
      <div id="vitrina" className="scroll-mt-24">
        <VitrinaDieciochera
          titulo="Productos para tu 18"
          descripcion={
            dieciocheros.length > 0
              ? "Lo que ya está disponible para encargar. Seguimos sumando productos durante todo septiembre."
              : undefined
          }
          productos={dieciocheros}
          cargando={loading}
          mostrarEnlace={false}
        />
      </div>

      {/* ── Cómo encargar ── */}
      <section className="o-container o-section">
        <h2 className="o-h1 mb-2 text-neutral-900">Cómo encargar</h2>
        <p className="o-body mb-8 max-w-xl text-neutral-600">
          Tres pasos. Mientras antes avises, más fácil es asegurar la cantidad
          que necesitas para el 18.
        </p>
        <ol className="grid gap-4 md:grid-cols-3">
          {PASOS.map(({ icon: Icon, titulo, detalle }, indice) => (
            <li key={titulo} className="o-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-fp-crema text-fp-rojo">
                  <Icon className="size-5" />
                </span>
                <span className="text-2xl font-bold tabular text-neutral-200">
                  {indice + 1}
                </span>
              </div>
              <p className="o-h3 mb-1 text-neutral-900">{titulo}</p>
              <p className="o-body text-neutral-600">{detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Cierre ── */}
      <section className="fp-fondo">
        <GuirnaldaChilena variante="azul" />
        <div className="o-container py-12 text-center md:py-16">
          <h2 className="o-h1 mb-3 text-neutral-900">
            {faltan > 0 && enTemporada
              ? `Quedan ${faltan} ${faltan === 1 ? "día" : "días"} para el 18`
              : "Que lo pasen bonito estas Fiestas Patrias"}
          </h2>
          <p className="o-body mx-auto mb-7 max-w-lg text-neutral-600">
            Escríbenos y dejamos tu pedido anotado. También puedes armar el
            carrito aquí mismo y pagar en línea.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink(MENSAJE_WHATSAPP)}
              target="_blank"
              rel="noopener noreferrer"
              className="o-focus inline-flex h-12 items-center gap-2 rounded-xl bg-fp-rojo px-6 text-sm font-semibold text-white transition-colors hover:bg-fp-rojo-claro"
            >
              <MessageCircle className="size-4" />
              Pedir por WhatsApp
            </a>
            <Link
              href="/productos"
              className="o-focus inline-flex h-12 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-400"
            >
              Ver catálogo completo <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="fp-tricolor" />
      </section>
    </div>
  );
}
