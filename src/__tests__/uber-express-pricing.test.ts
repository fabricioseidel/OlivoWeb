import { describe, expect, it } from "vitest";
import {
  EXPRESS_MIN_SUBTOTAL,
  EXPRESS_SUBSIDY_MAX_FEE,
  EXPRESS_SUBSIDY_MIN_SUBTOTAL,
  alcanzaMinimoExpress,
  quoteExpress,
} from "@/lib/uber-direct/pricing";

describe("alcanzaMinimoExpress", () => {
  it("no ofrece envío inmediato bajo el mínimo", () => {
    expect(alcanzaMinimoExpress(EXPRESS_MIN_SUBTOTAL - 1)).toBe(false);
  });

  it("lo ofrece justo en el mínimo", () => {
    expect(alcanzaMinimoExpress(EXPRESS_MIN_SUBTOTAL)).toBe(true);
  });
});

describe("quoteExpress", () => {
  it("la tienda paga sobre el mínimo de subsidio con tarifa baja", () => {
    const r = quoteExpress({ uberFee: 3200, subtotal: 40000 });
    expect(r.price).toBe(0);
    expect(r.paidByStore).toBe(true);
    expect(r.uberFee).toBe(3200);
  });

  it("el cliente paga si la tarifa llega al tope, aunque el pedido sea grande", () => {
    const r = quoteExpress({ uberFee: EXPRESS_SUBSIDY_MAX_FEE, subtotal: 80000 });
    expect(r.price).toBe(EXPRESS_SUBSIDY_MAX_FEE);
    expect(r.paidByStore).toBe(false);
  });

  it("el cliente paga si el pedido no llega al mínimo de subsidio", () => {
    const r = quoteExpress({ uberFee: 2500, subtotal: EXPRESS_SUBSIDY_MIN_SUBTOTAL - 1 });
    expect(r.price).toBe(2500);
    expect(r.paidByStore).toBe(false);
  });

  it("el subsidio aplica justo en el mínimo de subtotal", () => {
    const r = quoteExpress({ uberFee: 4999, subtotal: EXPRESS_SUBSIDY_MIN_SUBTOTAL });
    expect(r.price).toBe(0);
    expect(r.paidByStore).toBe(true);
  });

  it("el cliente paga la tarifa completa cuando no hay subsidio", () => {
    const r = quoteExpress({ uberFee: 7300, subtotal: 50000 });
    expect(r.price).toBe(7300);
    expect(r.paidByStore).toBe(false);
  });

  it("redondea la tarifa y nunca devuelve negativos", () => {
    expect(quoteExpress({ uberFee: 2500.6, subtotal: 1000 }).price).toBe(2501);
    expect(quoteExpress({ uberFee: -50, subtotal: 1000 }).price).toBe(0);
  });
});
