"use client";

import React from "react";
import Link from "next/link";
import { DevicePhoneMobileIcon, BookOpenIcon } from "@heroicons/react/24/outline";

/**
 * El cierre del día se hace en el POS, desde el celular.
 *
 * Esta pestaña cerraba el turno cuadrando contra `sale_payments`, es decir
 * contra las ventas que habían pasado por el POS. Mientras el POS no registre
 * todas las ventas, ese cuadre da un descuadre falso del porte de la venta en
 * efectivo, deja el turno CLOSED e impide registrar después el cierre
 * declarado. Tener dos formas de cerrar, y que una corrompa el día, es peor
 * que tener una sola.
 *
 * El computador queda para lo que se pidió que hiciera: revisar, corregir e
 * imprimir el mes.
 */
export default function CloseMode() {
  return (
    <div className="mx-auto max-w-md px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/40">
        <DevicePhoneMobileIcon className="h-8 w-8" />
      </div>

      <h2 className="text-xl font-black text-white">El cierre se hace en el celular</h2>

      <p className="mt-3 text-sm leading-relaxed text-white/50">
        En el POS se cuenta el efectivo por denominación, se cargan las transferencias una por una y
        los vouchers de la máquina, se anotan los fiados y se imprime el comprobante de 58 mm.
      </p>

      <p className="mt-3 text-sm leading-relaxed text-white/35">
        Desde acá se revisan los cierres ya registrados, se corrigen si quedó algo mal y se descarga
        el consolidado del mes en hoja carta.
      </p>

      <Link
        href="/admin/cierres"
        className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-white/80"
      >
        <BookOpenIcon className="h-4 w-4" />
        Ir al libro de caja
      </Link>
    </div>
  );
}
