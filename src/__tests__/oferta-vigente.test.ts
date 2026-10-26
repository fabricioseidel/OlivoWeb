import { describe, it, expect } from "vitest";
import { ofertaVigente } from "@/lib/pricing";
import { precioVigente } from "@/lib/pos/precios-venta";
import { mapSupaToUI } from "@/services/products";
import type { SupaProduct } from "@/types";

const AHORA = Date.parse("2026-10-26T12:00:00-03:00");
const AYER = "2026-10-25T23:59:59-03:00";
const MANANA = "2099-10-27T23:59:59-03:00";

describe("ofertaVigente", () => {
  it("sin fecha de término la oferta vale siempre", () => {
    expect(ofertaVigente(900, null, AHORA)).toBe(900);
    expect(ofertaVigente(900, undefined, AHORA)).toBe(900);
    expect(ofertaVigente(900, "", AHORA)).toBe(900);
  });

  it("con fecha futura sigue vigente", () => {
    expect(ofertaVigente(900, "2026-10-26T23:59:59-03:00", AHORA)).toBe(900);
  });

  it("con fecha pasada se cae", () => {
    expect(ofertaVigente(900, AYER, AHORA)).toBeNull();
  });

  it("una fecha ilegible no borra la oferta", () => {
    expect(ofertaVigente(900, "no-es-fecha", AHORA)).toBe(900);
  });
});

describe("oferta vencida en la tienda y en la caja", () => {
  const base: SupaProduct = {
    barcode: "7800000000001",
    name: "Harina PAN",
    category: "Harinas",
    purchase_price: 800,
    sale_price: 1500,
    offer_price: 1200,
    expiry_date: null,
    stock: 10,
  };

  it("mapSupaToUI ignora una oferta vencida", () => {
    expect(mapSupaToUI({ ...base, offer_ends_at: AYER }).offerPrice).toBeUndefined();
    expect(mapSupaToUI({ ...base, offer_ends_at: MANANA }).offerPrice).toBe(1200);
    expect(mapSupaToUI({ ...base, offer_ends_at: null }).offerPrice).toBe(1200);
  });

  it("precioVigente cobra lista cuando la oferta venció", () => {
    expect(precioVigente({ sale_price: 1500, offer_price: 1200, offer_ends_at: AYER })).toBe(1500);
    expect(precioVigente({ sale_price: 1500, offer_price: 1200, offer_ends_at: MANANA })).toBe(1200);
    expect(precioVigente({ sale_price: 1500, offer_price: 1200 })).toBe(1200);
  });
});
