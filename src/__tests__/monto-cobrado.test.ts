/**
 * El monto que MercadoPago dice haber cobrado.
 *
 * De esto depende que un pedido se acredite. La comparación equivocada dejó
 * **toda la historia de la tienda** sin un solo pedido con envío marcado como
 * pagado: el cobro salía bien, el cliente pagaba, y el webhook lo descartaba.
 */
import { describe, it, expect } from "vitest";
import { montoCobrado } from "@/lib/mercadopago-monto";

describe("cuánto cobró MercadoPago de verdad", () => {
  it("suma el envío, que viaja aparte de los ítems", () => {
    // El caso real del 2026-09-05: productos $640 + envío flash $3.384. La
    // orden decía $4.024 y el webhook comparaba contra los $640 de
    // `transaction_amount`, así que nunca cuadraba.
    expect(montoCobrado({ transaction_amount: 640, shipping_amount: 3384 })).toBe(4024);
  });

  it("funciona igual cuando no hay envío", () => {
    // Retiro en tienda: es el único caso que funcionaba antes, y por eso el
    // error pasó desapercibido.
    expect(montoCobrado({ transaction_amount: 500, shipping_amount: 0 })).toBe(500);
    expect(montoCobrado({ transaction_amount: 500 })).toBe(500);
  });

  it("tolera los campos ausentes o nulos", () => {
    expect(montoCobrado({})).toBe(0);
    expect(montoCobrado({ transaction_amount: null, shipping_amount: null })).toBe(0);
  });

  it("no cuenta los intereses de las cuotas", () => {
    // Por eso no se usa `transaction_details.total_paid_amount`: incluye lo
    // que el cliente paga de más por financiar, y la comparación fallaría en
    // el sentido contrario. Acá sólo entra lo que corresponde a la orden.
    expect(montoCobrado({ transaction_amount: 4024, shipping_amount: 0 })).toBe(4024);
  });
});
