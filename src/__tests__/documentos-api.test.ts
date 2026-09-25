/**
 * Gestión documental: lo que no puede fallar en las rutas y en la emisión.
 *
 *  - Sólo el ADMIN entra: un vendedor no ve sueldos ni impuestos.
 *  - Un RUT mal escrito se rechaza antes de guardar, con un mensaje que dice
 *    qué corregir.
 *  - Sin proveedor de facturación, "emitir" deja un BORRADOR sin folio. Nunca
 *    un documento marcado como emitido con un número inventado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const estado: { rol: "ADMIN" | "SELLER"; inserts: any[] } = { rol: "ADMIN", inserts: [] };

vi.mock("@/lib/api-auth", () => ({
  requireApiAdmin: async () =>
    estado.rol === "ADMIN"
      ? { ok: true, userId: "admin-1", role: "ADMIN", session: { user: { email: "dueno@olivo.cl" } } }
      : { ok: false, response: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }) },
}));

vi.mock("@/server/audit.service", () => ({ auditLog: async () => {} }));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from(tabla: string) {
      let payload: any = null;
      const api: any = {
        select: () => api,
        eq: () => api,
        not: () => api,
        limit: () => api,
        order: () => api,
        insert: (p: any) => {
          payload = p;
          estado.inserts.push({ tabla, payload: p });
          return api;
        },
        single: async () => ({ data: { id: "doc-1", ...payload }, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (res: any) => res({ data: [], error: null }),
      };
      return api;
    },
  },
}));

const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  estado.rol = "ADMIN";
  estado.inserts = [];
  delete process.env.DTE_PROVIDER;
});

describe("acceso", () => {
  it("un vendedor no entra a la gestión documental", async () => {
    estado.rol = "SELLER";
    const { GET } = await import("@/app/api/admin/documentos/panel/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("registrar un documento", () => {
  it("rechaza un RUT con el dígito verificador equivocado", async () => {
    const { POST } = await import("@/app/api/admin/documentos/route");
    const res = await POST(
      post("/api/admin/documentos", {
        direccion: "recibido",
        tipo: "33",
        folio: 123,
        fecha: "2026-09-10",
        contraparte_rut: "77.198.288-4",
        total: 119000,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("dígito verificador");
    expect(estado.inserts).toHaveLength(0);
  });

  it("exige folio y RUT en una factura recibida", async () => {
    const { POST } = await import("@/app/api/admin/documentos/route");
    const res = await POST(post("/api/admin/documentos", { direccion: "recibido", tipo: "33", fecha: "2026-09-10", total: 1 }));
    const { error } = await res.json();
    expect(res.status).toBe(400);
    expect(error).toContain("RUT");
    expect(error).toContain("folio");
  });

  it("guarda el RUT normalizado y el período de la fecha", async () => {
    const { POST } = await import("@/app/api/admin/documentos/route");
    const res = await POST(
      post("/api/admin/documentos", {
        direccion: "recibido",
        tipo: "33",
        folio: 123,
        fecha: "2026-09-10",
        contraparte_rut: "77.198.288-3",
        neto: 100000,
        iva: 19000,
        total: 119000,
      }),
    );
    expect(res.status).toBe(201);
    const fila = estado.inserts.find((i) => i.tabla === "tax_documents")!.payload;
    expect(fila).toMatchObject({ contraparte_rut: "77198288-3", periodo: "2026-09", estado: "pendiente", estado_pago: "pendiente" });
  });

  it("no deja marcar como emitido un documento sin folio", async () => {
    const { POST } = await import("@/app/api/admin/documentos/route");
    const res = await POST(post("/api/admin/documentos", { direccion: "emitido", tipo: "39", fecha: "2026-09-10", total: 1000, estado: "emitido" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("folio");
  });
});

describe("emitir", () => {
  it("sin proveedor de facturación deja un borrador, sin folio", async () => {
    const { POST } = await import("@/app/api/admin/documentos/emitir/route");
    const res = await POST(
      post("/api/admin/documentos/emitir", {
        tipo: "39",
        fecha: "2026-09-25",
        lineas: [{ descripcion: "Harina P.A.N.", cantidad: 2, precio: 2990 }],
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.emitido).toBe(false);
    expect(body.mensaje).toContain("borrador");
    const fila = estado.inserts.find((i) => i.tabla === "tax_documents")!.payload;
    expect(fila).toMatchObject({ estado: "borrador", folio: null, total: 5980, neto: 5025, iva: 955 });
  });

  it("una factura exige los datos del cliente", async () => {
    const { POST } = await import("@/app/api/admin/documentos/emitir/route");
    const res = await POST(
      post("/api/admin/documentos/emitir", {
        tipo: "33",
        fecha: "2026-09-25",
        receptor: { rut: "76.086.428-5", nombre: "Oficina SpA" },
        lineas: [{ descripcion: "Café", cantidad: 1, precio: 10000 }],
      }),
    );
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toContain("giro");
    expect(error).toContain("dirección");
    expect(estado.inserts).toHaveLength(0);
  });
});
