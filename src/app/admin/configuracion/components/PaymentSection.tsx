"use client";

import { CreditCardIcon } from "@heroicons/react/24/outline";
import MercadoPagoDiagnostics from "./MercadoPagoDiagnostics";

/**
 * Estado real de los pagos.
 *
 * Antes esta pantalla tenía seis casillas —tarjeta de crédito, débito,
 * transferencia, PayPal, MercadoPago, cripto— y un interruptor de "modo
 * prueba (sin cobros reales)". Ninguno de los siete estaba conectado a nada:
 * el checkout ofrece MercadoPago y solo MercadoPago, con una lista fija en el
 * código, y si el cobro es real o de prueba lo decide únicamente el token que
 * esté cargado en Vercel.
 *
 * Un interruptor que dice "no se procesarán cobros realmente" y no hace nada
 * es peligroso justo antes de abrir: alguien lo activa, prueba con su tarjeta
 * y se cobra de verdad. Por eso ahora la pantalla informa en vez de fingir que
 * configura, y el diagnóstico de abajo dice qué token está activo.
 */
export default function PaymentSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-amber-500" />
          Métodos de Pago
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Cómo cobra la tienda hoy
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm text-slate-700">
          El checkout ofrece <strong>MercadoPago</strong> como única forma de
          pago. Desde ahí el cliente puede pagar con tarjeta de crédito, débito
          o el saldo de su cuenta: eso lo resuelve MercadoPago, no esta tienda.
        </p>
        <p className="text-sm text-slate-700">
          Para aceptar transferencia bancaria u otro medio hay que agregarlo en
          el código del checkout. No alcanza con configurarlo aquí.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <strong>Cobros reales o de prueba</strong> lo decide la variable
          <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">
            MERCADOPAGO_ACCESS_TOKEN
          </code>
          en Vercel, no un interruptor de esta pantalla. Un token que empieza
          con <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">APP_USR-</code>{" "}
          cobra de verdad. El diagnóstico de abajo dice cuál está activo ahora.
        </p>
      </div>

      <MercadoPagoDiagnostics />
    </div>
  );
}
