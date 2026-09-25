"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RUTA_FIESTAS_PATRIAS,
  enTemporadaDieciochera,
  textoCuentaRegresiva,
} from "@/lib/fiestas-patrias";
import BanderaChile from "./BanderaChile";
import GuirnaldaChilena from "./GuirnaldaChilena";

/**
 * Cinta dieciochera que corona el sitio durante septiembre.
 *
 * Cumple dos funciones a la vez: viste la página (la guirnalda es lo primero
 * que se ve al entrar) y empuja a la sección con el único argumento que
 * importa en esta campaña, que es el calendario — "faltan N días" convierte
 * mucho mejor que "ver productos".
 *
 * Se apaga sola el 1 de octubre: `enTemporadaDieciochera` mira el mes en hora
 * de Chile, así que nadie tiene que acordarse de bajarla.
 */
export default function FranjaDieciochera() {
  const pathname = usePathname();

  // En la propia sección la cinta sería redundante: ya estás ahí.
  if (pathname?.startsWith(RUTA_FIESTAS_PATRIAS)) return null;
  if (!enTemporadaDieciochera()) return null;

  return (
    <div className="relative">
      <Link
        href={RUTA_FIESTAS_PATRIAS}
        className="o-focus block bg-fp-rojo text-white transition-colors hover:bg-fp-rojo-claro"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center sm:gap-3">
          <BanderaChile className="fp-ondea h-4 w-auto shrink-0 rounded-sm shadow-sm" />
          <p className="text-xs font-semibold sm:text-sm">
            <span className="hidden sm:inline">Fiestas Patrias en Olivo Market · </span>
            Anticipa tu pedido de empanadas
            <span className="mx-1.5 hidden text-white/60 sm:inline">|</span>
            <span className="ml-1.5 whitespace-nowrap rounded-full bg-white/20 px-2 py-0.5 sm:ml-0">
              {textoCuentaRegresiva()}
            </span>
          </p>
        </div>
      </Link>
      <GuirnaldaChilena variante="azul" />
    </div>
  );
}
