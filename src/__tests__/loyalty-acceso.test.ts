/**
 * Los puntos son plata del cliente. Nadie más que él (o el personal) puede
 * ver su saldo ni gastarlos.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const estado: { session: unknown; canjes: unknown[] } = { session: null, canjes: [] };

vi.mock("next-auth", () => ({ getServerSession: async () => estado.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/server/loyalty.service", () => ({
  getLoyaltyConfig: async () => ({ enabled: true }),
  updateLoyaltyConfig: async () => {},
  getCustomerLoyalty: async (email: string) => ({ email, points: 500 }),
  getTransactionHistory: async () => [],
  earnPoints: async () => ({}),
  redeemPoints: async (x: unknown) => (estado.canjes.push(x), { newBalance: 0 }),
  addBonusPoints: async () => 0,
}));

const get = (qs: string) => new NextRequest(`http://localhost/api/loyalty?${qs}`);
const post = (body: unknown) => new NextRequest("http://localhost/api/loyalty", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  estado.session = null;
  estado.canjes = [];
});

describe("/api/loyalty", () => {
  it("la configuración es pública (el checkout la necesita)", async () => {
    const { GET } = await import("@/app/api/loyalty/route");
    expect((await GET(get("action=config"))).status).toBe(200);
  });

  it("sin sesión no se ve el saldo de nadie", async () => {
    const { GET } = await import("@/app/api/loyalty/route");
    expect((await GET(get("email=vecina@x.cl"))).status).toBe(401);
  });

  it("un cliente ve el suyo y no el de otro", async () => {
    estado.session = { user: { email: "Ana@X.cl", role: "USER" } };
    const { GET } = await import("@/app/api/loyalty/route");
    expect((await GET(get("email=ana@x.cl"))).status).toBe(200);
    expect((await GET(get("email=vecina@x.cl"))).status).toBe(403);
  });

  it("el personal puede consultar a cualquier cliente", async () => {
    estado.session = { user: { email: "caja@olivo.cl", role: "SELLER" } };
    const { GET } = await import("@/app/api/loyalty/route");
    expect((await GET(get("email=vecina@x.cl"))).status).toBe(200);
  });

  it("nadie fuera del personal puede canjear puntos por esta ruta", async () => {
    const { POST } = await import("@/app/api/loyalty/route");
    expect((await POST(post({ action: "redeem", customerEmail: "vecina@x.cl", points: 500 }))).status).toBe(401);
    estado.session = { user: { email: "ana@x.cl", role: "USER" } };
    expect((await POST(post({ action: "redeem", customerEmail: "vecina@x.cl", points: 500 }))).status).toBe(401);
    expect(estado.canjes).toEqual([]);
  });
});
