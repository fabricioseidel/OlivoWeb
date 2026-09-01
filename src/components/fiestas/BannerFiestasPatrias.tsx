"use client";

import Link from "next/link";
import { CalendarCheck, ChevronRight, Heart, UtensilsCrossed } from "lucide-react";
import {
  RUTA_FIESTAS_PATRIAS,
  textoCuentaRegresiva,
} from "@/lib/fiestas-patrias";
import { whatsappLink } from "@/lib/seo/business";
import BanderaChile from "./BanderaChile";
import GuirnaldaChilena from "./GuirnaldaChilena";

/**
 * Banner dieciochero de la portada.
 *
 * Traduce el afiche impreso de la tienda a la web: el mismo mensaje
 * ("anticipa tu pedido"), los mismos tres respaldos y la misma salida por
 * WhatsApp, que es por donde la tienda toma los encargos grandes.
 *
 * El botón principal lleva a la sección y no directo a WhatsApp: quien recién
 * llega necesita ver qué hay y a qué precio antes de escribir. WhatsApp queda
 * de secundario, para el cliente que ya sabe lo que quiere encargar.
 */

const MENSAJE_WHATSAPP =
  "¡Hola Olivo Market! Quiero anticipar mi pedido para Fiestas Patrias 🇨🇱";

const RESPALDOS = [
  {
    icon: CalendarCheck,
    titulo: "Anticipa tu pedido",
    detalle: "Encarga hoy y retíralo cuando lo necesites",
  },
  {
    icon: UtensilsCrossed,
    titulo: "Ingredientes de calidad",
    detalle: "Empanadas de pino hechas como en casa",
  },
  {
    icon: Heart,
    titulo: "Sabor que nos une",
    detalle: "Todo para tu mesa dieciochera en Ñuñoa",
  },
];

export default function BannerFiestasPatrias({
  title,
  description,
  buttonText,
  buttonLink,
}: {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}) {
  return (
    <section className="px-4 py-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl shadow-floating">
        <GuirnaldaChilena />
        <div className="fp-hero relative px-6 py-9 md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <BanderaChile className="fp-ondea h-6 w-auto rounded-sm shadow" />
                <span className="fp-chip bg-white/15 text-white">
                  {textoCuentaRegresiva()}
                </span>
              </div>

              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-fp-rojo-claro">
                {buttonText ? "Fiestas Patrias" : "Septiembre en Olivo Market"}
              </p>

              <h2 className="o-display mb-3 text-white">
                {title || "¡Anticipa tu pedido para estas Fiestas Patrias!"}
              </h2>

              <p className="o-body mb-6 max-w-lg text-white/75">
                {description ||
                  "Disfruten con nuestras ricas empanadas de pino y todo lo que necesitan para la mesa dieciochera. Encarga con tiempo: el 18 se agota."}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={buttonLink || RUTA_FIESTAS_PATRIAS}
                  className="o-focus inline-flex h-12 items-center gap-2 rounded-xl bg-fp-rojo px-6 text-sm font-semibold text-white transition-colors hover:bg-fp-rojo-claro"
                >
                  {buttonText || "Ver productos dieciocheros"}
                  <ChevronRight className="size-4" />
                </Link>
                <a
                  href={whatsappLink(MENSAJE_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="o-focus inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Encargar por WhatsApp
                </a>
              </div>
            </div>

            {/* Los tres respaldos del afiche. En móvil se apilan como lista
                para no obligar a leer texto blanco en columnas angostas. */}
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {RESPALDOS.map(({ icon: Icon, titulo, detalle }) => (
                <li
                  key={titulo}
                  className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/25">
                    <Icon className="size-5 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{titulo}</p>
                    <p className="text-xs leading-snug text-white/65">{detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="fp-tricolor" />
      </div>
    </section>
  );
}
