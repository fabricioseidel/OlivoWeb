"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { ProductUI } from "@/types";
import { RUTA_FIESTAS_PATRIAS } from "@/lib/fiestas-patrias";
import GuirnaldaChilena from "./GuirnaldaChilena";
import BanderaChile from "./BanderaChile";

/**
 * Grilla de productos dieciocheros, con el mismo `ProductCard` del resto del
 * sitio para que el carrito, los precios y los estados de stock se comporten
 * igual acá que en el catálogo. Lo único distinto es el vestido: fondo crema,
 * guirnalda y encabezado con bandera.
 *
 * Cuando todavía no hay nada cargado, en vez de esconder la sección se
 * muestra el aviso de que el catálogo se está armando y se ofrece WhatsApp:
 * una sección vacía en septiembre es una venta perdida, no un bug de UI.
 */
export default function VitrinaDieciochera({
  titulo,
  descripcion,
  productos,
  cargando,
  mostrarEnlace = true,
  conFondo = true,
}: {
  titulo: string;
  descripcion?: string;
  productos: ProductUI[];
  cargando?: boolean;
  mostrarEnlace?: boolean;
  conFondo?: boolean;
}) {
  return (
    <section className={conFondo ? "fp-fondo" : ""}>
      {conFondo && <GuirnaldaChilena />}
      <div className="o-container py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <BanderaChile className="h-5 w-auto rounded-sm shadow-sm" />
              <span className="o-eyebrow text-fp-rojo">Fiestas Patrias</span>
            </div>
            <h2 className="o-h1 text-neutral-900">{titulo}</h2>
            {descripcion && (
              <p className="o-body mt-2 max-w-xl text-neutral-600">{descripcion}</p>
            )}
          </div>
          {mostrarEnlace && (
            <Link
              href={RUTA_FIESTAS_PATRIAS}
              className="o-focus inline-flex items-center gap-1 rounded text-sm font-semibold text-fp-rojo hover:text-fp-azul"
            >
              Ver la sección completa <ChevronRight className="size-4" />
            </Link>
          )}
        </div>

        {cargando ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/70" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fp-rojo/30 bg-white/70 px-6 py-12 text-center">
            <p className="o-h3 mb-2 text-neutral-900">
              Estamos preparando la vitrina dieciochera
            </p>
            <p className="o-body mx-auto max-w-md text-neutral-600">
              Los productos para el 18 se están cargando. Mientras tanto, puedes
              encargar tus empanadas directamente por WhatsApp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {productos.map(producto => (
              <ProductCard
                key={producto.id}
                product={{
                  ...producto,
                  slug: producto.slug || producto.id,
                  categories: producto.categories || [],
                }}
              />
            ))}
          </div>
        )}
      </div>
      {conFondo && <div className="fp-tricolor" />}
    </section>
  );
}
