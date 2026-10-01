import { describe, expect, it } from "vitest";
import { calcularPreciosVenta, precioVigente } from "@/lib/pos/precios-venta";

const precios = new Map([
  ["a", { sale_price: 1000, offer_price: null }],
  ["b", { sale_price: 2000, offer_price: 1500 }],
  ["kg", { sale_price: 4990, offer_price: 0 }],
]);

describe("precioVigente", () => {
  it("usa la oferta sólo si es mayor que cero", () => {
    expect(precioVigente({ sale_price: 2000, offer_price: 1500 })).toBe(1500);
    expect(precioVigente({ sale_price: 2000, offer_price: 0 })).toBe(2000);
    expect(precioVigente({ sale_price: 2000, offer_price: null })).toBe(2000);
  });
});

describe("calcularPreciosVenta", () => {
  it("calcula con precios de la base", () => {
    const r = calcularPreciosVenta([{ barcode: "a", qty: 2 }, { barcode: "b", qty: 1 }], precios, { compraPersonal: false, totalCobrado: 3500 });
    expect(r).toMatchObject({ ok: true, subtotal: 3500, descuento: 0, total: 3500 });
  });

  it("acepta la diferencia de redondeo de un producto por peso", () => {
    const r = calcularPreciosVenta([{ barcode: "kg", qty: 0.337 }], precios, { compraPersonal: false, totalCobrado: 1681.63 });
    expect(r.ok).toBe(true);
  });

  it("aplica el 25% de personal con la tasa del servidor", () => {
    const r = calcularPreciosVenta([{ barcode: "a", qty: 4 }], precios, { compraPersonal: true, totalCobrado: 3000 });
    expect(r).toMatchObject({ ok: true, descuento: 1000, total: 3000 });
  });

  it("rechaza un total menor al vigente", () => {
    const r = calcularPreciosVenta([{ barcode: "b", qty: 1 }], precios, { compraPersonal: false, totalCobrado: 100 });
    expect(r.ok).toBe(false);
  });

  it("rechaza un descuento de personal en una venta normal", () => {
    const r = calcularPreciosVenta([{ barcode: "a", qty: 4 }], precios, { compraPersonal: false, totalCobrado: 3000 });
    expect(r.ok).toBe(false);
  });

  it("rechaza productos que no existen o cantidades inválidas", () => {
    expect(calcularPreciosVenta([{ barcode: "zz", qty: 1 }], precios, { compraPersonal: false, totalCobrado: 0 }).ok).toBe(false);
    expect(calcularPreciosVenta([{ barcode: "a", qty: 0 }], precios, { compraPersonal: false, totalCobrado: 0 }).ok).toBe(false);
  });
});
