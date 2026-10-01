/**
 * Las server actions son endpoints POST públicos: se pueden invocar desde
 * cualquier página del sitio, no sólo desde /admin, así que el middleware no
 * las protege. Cada una debe revisar sesión y rol por su cuenta.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const estado: { session: unknown } = { session: null };
const llamadas: string[] = [];

vi.mock("next-auth", () => ({ getServerSession: async () => estado.session }));
vi.mock("@/config/auth.config", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/server/shifts.service", () => ({
  openShift: async () => llamadas.push("openShift"),
  closeShift: async () => (llamadas.push("closeShift"), { breakdown: {} }),
  getCurrentShift: async () => (llamadas.push("getCurrentShift"), { id: "t1" }),
  addCashMovement: async () => llamadas.push("addCashMovement"),
}));
const ventas: any[] = [];
vi.mock("@/server/sales.service", () => ({ createSale: async (v: any) => (llamadas.push("createSale"), ventas.push(v), { id: 1 }) }));
vi.mock("@/server/reception.service", () => ({ createReception: async () => (llamadas.push("createReception"), { ok: true, count: 1 }) }));
vi.mock("@/server/branches.service", () => ({ getBranches: async () => (llamadas.push("getBranches"), [{ id: "b1" }]) }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: () => {
      const q: any = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        maybeSingle: async () => ({ data: { id: "t1" } }),
        in: async () => ({ data: [{ barcode: "1", sale_price: 1000, offer_price: null }], error: null }),
      };
      return q;
    },
  },
}));

const cliente = { user: { email: "cliente@x.cl", role: "USER" } };
const cajero = { user: { email: "caja@olivo.cl", name: "Caja", role: "SELLER", id: "u1" } };

beforeEach(() => {
  estado.session = null;
  llamadas.length = 0;
});

async function todas() {
  const shifts = await import("@/actions/shifts");
  const sales = await import("@/actions/sales");
  const reception = await import("@/actions/reception");
  const branches = await import("@/actions/branches");
  return [
    await shifts.openShiftAction(1000),
    await shifts.closeShiftAction("t1", 1000),
    await shifts.addCashMovementAction("t1", 100, "OUT", "x"),
    await shifts.getCurrentShift(),
    await sales.createSaleAction({ total: 1000, paymentMethod: "cash", items: [{ product_id: "1", quantity: 1, unit_price: 1000, total_price: 1000 }] }),
    await reception.createReceptionAction({ items: [], branchId: null } as never),
    await branches.getBranchesAction(),
  ];
}

describe("server actions", () => {
  it("sin sesión no tocan la base", async () => {
    const r = await todas();
    expect(llamadas).toEqual([]);
    expect(r[3]).toBeNull();
    expect(r[6]).toEqual([]);
    expect((r[4] as { ok: boolean }).ok).toBe(false);
  });

  it("un cliente con sesión tampoco", async () => {
    estado.session = cliente;
    await todas();
    expect(llamadas).toEqual([]);
  });

  it("el cajero sí puede operar la caja y vender", async () => {
    estado.session = cajero;
    await todas();
    expect(llamadas).toEqual([
      "openShift", "closeShift", "addCashMovement", "getCurrentShift", "createSale", "createReception", "getBranches",
    ]);
  });
});

describe("venta idempotente", () => {
  it("el mismo ID de la pantalla llega a apply_sale; uno inválido se descarta", async () => {
    estado.session = cajero;
    ventas.length = 0;
    const sales = await import("@/actions/sales");
    const base = { total: 1000, paymentMethod: "cash", items: [{ product_id: "1", quantity: 1, unit_price: 1000, total_price: 1000 }] };
    await sales.createSaleAction({ ...base, clientSaleId: "0b6f1c1e-6b1f-4c3a-9f1e-2a7c1d9e0f11" });
    await sales.createSaleAction({ ...base, clientSaleId: "x'; drop" });
    expect(ventas[0].clientSaleId).toBe("pos-0b6f1c1e-6b1f-4c3a-9f1e-2a7c1d9e0f11");
    expect(ventas[1].clientSaleId).toBeUndefined();
  });
});

describe("precios de la venta", () => {
  it("usa el precio de la base aunque la pantalla mande otro unitario", async () => {
    estado.session = cajero;
    ventas.length = 0;
    const sales = await import("@/actions/sales");
    const r = await sales.createSaleAction({ total: 1000, paymentMethod: "cash", items: [{ product_id: "1", quantity: 1, unit_price: 1, total_price: 1 }] });
    expect(r.ok).toBe(true);
    expect(ventas[0].items[0]).toMatchObject({ unit_price: 1000, subtotal: 1000 });
  });

  it("rechaza un total que no calza con los precios vigentes", async () => {
    estado.session = cajero;
    ventas.length = 0;
    const sales = await import("@/actions/sales");
    const r = await sales.createSaleAction({ total: 10, paymentMethod: "cash", items: [{ product_id: "1", quantity: 1, unit_price: 10, total_price: 10 }] });
    expect(r.ok).toBe(false);
    expect(ventas).toHaveLength(0);
  });
});
