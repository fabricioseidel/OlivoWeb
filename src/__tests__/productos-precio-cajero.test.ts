/**
 * El cajero puede crear un producto nuevo con su precio (creación rápida en
 * el POS), pero no cambiar el precio de uno que ya existe. Y cada guardado
 * deja registro de los cambios de precio.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const estado: { rol: "ADMIN" | "SELLER"; upserts: any[][]; auditorias: any[] } = { rol: "SELLER", upserts: [], auditorias: [] };

vi.mock("@/lib/api-auth", () => ({
  requireApiAdminOrSeller: async () => ({ ok: true, role: estado.rol, userId: "u1", session: { user: { email: "x@olivo.cl" } } }),
  requireApiAdmin: async () =>
    estado.rol === "ADMIN"
      ? { ok: true, role: "ADMIN", userId: "u1", session: { user: { email: "x@olivo.cl" } } }
      : { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) },
}));
vi.mock("@/server/audit.service", () => ({ auditLog: async (e: any) => estado.auditorias.push(e) }));
vi.mock("@/server/inventory.service", () => ({ STOCK_REASON: { MANUAL_ADJUSTMENT: "m" }, setStockLevels: async () => ({ ok: true }) }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({ in: async () => ({ data: [{ barcode: "1", sale_price: 1000, offer_price: null, purchase_price: 600 }] }) }),
      upsert: async (rows: any[]) => (estado.upserts.push(rows), { error: null }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

const post = (items: unknown[]) => new Request("http://localhost/api/products", { method: "POST", body: JSON.stringify({ items }) });

beforeEach(() => {
  estado.upserts = [];
  estado.auditorias = [];
});

describe("/api/products", () => {
  it("el cajero no cambia el precio de un producto existente, pero sí crea uno nuevo con precio", async () => {
    estado.rol = "SELLER";
    const { POST } = await import("@/app/api/products/route");
    await POST(post([
      { barcode: "1", name: "Pan", sale_price: 1, purchase_price: 1 },
      { barcode: "2", name: "Nuevo", sale_price: 1500 },
    ]));
    const [existente, nuevo] = estado.upserts[0];
    expect(existente).not.toHaveProperty("sale_price");
    expect(existente).not.toHaveProperty("purchase_price");
    expect(existente.name).toBe("Pan");
    expect(nuevo.sale_price).toBe(1500);
  });

  it("el admin cambia precios y queda registrado quién y cuánto", async () => {
    estado.rol = "ADMIN";
    const { POST } = await import("@/app/api/products/route");
    await POST(post([{ barcode: "1", sale_price: 1200 }]));
    expect(estado.upserts[0][0].sale_price).toBe(1200);
    const reg = estado.auditorias.find((a) => a.action === "products.save");
    expect(reg.actor).toBe("x@olivo.cl");
    expect(reg.details.cambiosDePrecio).toEqual([{ barcode: "1", campo: "sale_price", antes: 1000, despues: 1200 }]);
  });

  it("sólo el admin borra productos", async () => {
    estado.rol = "SELLER";
    const { DELETE } = await import("@/app/api/products/route");
    const res = await DELETE(new Request("http://localhost/api/products?id=1", { method: "DELETE" }));
    expect(res.status).toBe(403);
  });
});
