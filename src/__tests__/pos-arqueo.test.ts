import { describe, expect, it } from "vitest";
import { esperadoPorMetodo, metodoLegacy } from "@/lib/pos/arqueo";

describe("esperadoPorMetodo", () => {
  it("reparte un pago mixto entre sus métodos", () => {
    const r = esperadoPorMetodo(10000, [
      { total: 5000, payment_method: "cash", sale_payments: [{ method: "CASH", amount: 2000 }, { method: "CARD", amount: 3000 }] },
    ], []);
    expect(r).toEqual({ CASH: 12000, CARD: 3000 });
  });

  it("ignora ventas anuladas", () => {
    const r = esperadoPorMetodo(0, [
      { total: 5000, voided: true, sale_payments: [{ method: "CASH", amount: 5000 }] },
      { total: 1000, sale_payments: [{ method: "CASH", amount: "1000" }] },
    ], []);
    expect(r.CASH).toBe(1000);
  });

  it("suma movimientos en su método y usa efectivo si no lo dicen", () => {
    const r = esperadoPorMetodo(5000, [], [
      { amount: 1000, type: "OUT" },
      { amount: 2000, type: "IN", method: "TRANSFER" },
    ]);
    expect(r).toEqual({ CASH: 4000, TRANSFER: 2000 });
  });

  it("ventas antiguas sin pagos usan el método único", () => {
    expect(esperadoPorMetodo(0, [{ total: 700, payment_method: "efectivo" }], [])).toEqual({ CASH: 700 });
    expect(metodoLegacy("tarjeta débito")).toBe("CARD");
    expect(metodoLegacy(null)).toBe("OTHER");
  });
});
