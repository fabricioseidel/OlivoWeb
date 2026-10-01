/**
 * Anular una venta: sólo el ADMIN, siempre con motivo, y queda auditado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const estado: { rol: "ADMIN" | "SELLER"; rpc: any[]; auditorias: any[]; error: { message: string } | null } = {
  rol: "SELLER", rpc: [], auditorias: [], error: null,
};

vi.mock("@/lib/api-auth", () => ({
  requireApiAdmin: async () =>
    estado.rol === "ADMIN"
      ? { ok: true, role: "ADMIN", userId: "u1", session: { user: { email: "admin@olivo.cl" } } }
      : { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) },
}));
vi.mock("@/server/audit.service", () => ({ auditLog: async (e: any) => estado.auditorias.push(e) }));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: { rpc: async (fn: string, args: any) => (estado.rpc.push({ fn, args }), { error: estado.error }) },
}));

const anular = async (id: string, body: unknown) => {
  const { POST } = await import("@/app/api/sales/[id]/anular/route");
  const req = new Request(`http://localhost/api/sales/${id}/anular`, { method: "POST", body: JSON.stringify(body) });
  return POST(req as any, { params: Promise.resolve({ id }) });
};

beforeEach(() => {
  estado.rpc = [];
  estado.auditorias = [];
  estado.error = null;
});

describe("POST /api/sales/:id/anular", () => {
  it("el cajero no puede anular", async () => {
    estado.rol = "SELLER";
    const r = await anular("7", { motivo: "cobro doble" });
    expect(r.status).toBe(403);
    expect(estado.rpc).toHaveLength(0);
  });

  it("exige motivo e id válido", async () => {
    estado.rol = "ADMIN";
    expect((await anular("7", { motivo: " " })).status).toBe(400);
    expect((await anular("abc", { motivo: "cobro doble" })).status).toBe(400);
    expect(estado.rpc).toHaveLength(0);
  });

  it("el admin anula con motivo y queda auditado", async () => {
    estado.rol = "ADMIN";
    const r = await anular("7", { motivo: "cobro doble" });
    expect(r.status).toBe(200);
    expect(estado.rpc[0]).toEqual({ fn: "anular_venta", args: { p_sale_id: 7, p_motivo: "cobro doble", p_actor: "admin@olivo.cl" } });
    expect(estado.auditorias[0]).toMatchObject({ action: "SALE_VOIDED", entityId: 7 });
  });

  it("una venta ya anulada responde 409 y no se audita", async () => {
    estado.rol = "ADMIN";
    estado.error = { message: "La venta 7 ya está anulada" };
    const r = await anular("7", { motivo: "cobro doble" });
    expect(r.status).toBe(409);
    expect(estado.auditorias).toHaveLength(0);
  });
});
