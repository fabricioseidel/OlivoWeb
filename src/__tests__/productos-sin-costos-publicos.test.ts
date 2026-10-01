/**
 * La clave pública no puede leer costos: la tienda pide sólo columnas
 * públicas y decide qué publicar con `costo_cargado`. Y guardar un producto
 * sin su costo en memoria no puede borrarlo.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const pedidos: string[] = [];
const enviados: any[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      const q: any = {
        select: (cols: string) => (pedidos.push(cols), q),
        order: () => q,
        limit: async () => ({ data: [], error: null }),
        eq: () => q,
        single: async () => ({ data: { barcode: "1", name: "Pan", costo_cargado: true }, error: null }),
      };
      return q;
    },
  },
}));

import {
  COLUMNAS_PANEL,
  COLUMNAS_PUBLICAS,
  fetchAllProducts,
  fetchProductDetails,
  isProductVisible,
  saveProduct,
  terminoSeguro,
} from "@/services/products";

beforeEach(() => {
  pedidos.length = 0;
  enviados.length = 0;
  vi.stubGlobal("fetch", async (_url: string, init: any) => {
    enviados.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
});

describe("tienda pública sin costos", () => {
  it("las columnas públicas no incluyen costos ni márgenes", () => {
    for (const col of ["purchase_price", "suggested_price", "margin_override", "reorder_threshold"]) {
      expect(COLUMNAS_PUBLICAS).not.toMatch(new RegExp(`\\b${col}\\b`));
      expect(COLUMNAS_PANEL).toMatch(new RegExp(`\\b${col}\\b`));
    }
    expect(COLUMNAS_PUBLICAS).toMatch(/\bcosto_cargado\b/);
  });

  it("el catálogo y la ficha se piden con columnas públicas, nunca con *", async () => {
    await fetchAllProducts();
    await fetchProductDetails("1");
    expect(pedidos.length).toBeGreaterThan(0);
    for (const cols of pedidos) {
      expect(cols).not.toBe("*");
      expect(cols).not.toMatch(/purchase_price/);
    }
  });

  it("un producto con costo cargado se publica aunque no traiga el costo", () => {
    const base = { id: "1", name: "Pan", price: 1000, image: "https://x/pan.jpg", categories: ["Panadería"] } as any;
    expect(isProductVisible({ ...base, costoCargado: true })).toBe(true);
    expect(isProductVisible({ ...base, costoCargado: false })).toBe(false);
    expect(isProductVisible({ ...base, purchasePrice: 500 })).toBe(true);
  });
});

describe("guardar sin costo no lo borra", () => {
  it("sin purchase_price no se manda la columna", async () => {
    await saveProduct({ barcode: "1", name: "Pan", sale_price: 1000 } as any);
    expect(enviados[0]).not.toHaveProperty("purchase_price");
    expect(enviados[0]).not.toHaveProperty("suggested_price");
  });

  it("con purchase_price explícito sí se manda", async () => {
    await saveProduct({ barcode: "1", purchase_price: 700 } as any);
    expect(enviados[0].purchase_price).toBe(700);
  });
});

describe("búsqueda", () => {
  it("un término no puede alterar el filtro de PostgREST", () => {
    expect(terminoSeguro("limón,name.eq.x)")).toBe("limón name.eq.x");
    expect(terminoSeguro("  café  ")).toBe("café");
  });
});
