import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const estado = { rol: "SELLER" as string | null };

vi.mock("@/lib/api-auth", () => ({
  requireApiAdminOrSeller: async () =>
    estado.rol
      ? { ok: true, role: estado.rol, session: {} }
      : { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) },
}));
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    storage: {
      from: () => ({ createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://s.supabase.co/firmada/${path}` }, error: null }) }),
    },
  },
}));

import { esPathPermitido, pathDeRutaInterna, rutaInterna } from "@/server/archivos-privados";

describe("rutas de comprobantes privados", () => {
  it("ida y vuelta entre path y ruta interna", () => {
    const url = rutaInterna("ventas/12/comprobante-1.jpg");
    expect(url).toBe("/api/admin/archivos?path=ventas%2F12%2Fcomprobante-1.jpg");
    expect(pathDeRutaInterna(url)).toBe("ventas/12/comprobante-1.jpg");
    expect(pathDeRutaInterna("https://x.supabase.co/storage/v1/object/public/uploads/a.jpg")).toBeNull();
  });

  it("sólo sirve las carpetas de comprobantes", () => {
    expect(esPathPermitido("pedidos-proveedor/abc/factura-1.pdf")).toBe(true);
    expect(esPathPermitido("documentos/abc/1.pdf")).toBe(false);
    expect(esPathPermitido("ventas/../documentos/x.pdf")).toBe(false);
  });

  it("sin sesión no entrega nada; con sesión redirige a una URL firmada", async () => {
    const { GET } = await import("@/app/api/admin/archivos/route");
    const req = () => new NextRequest("http://localhost/api/admin/archivos?path=ventas%2F1%2Fa.jpg");
    estado.rol = null;
    expect((await GET(req())).status).toBe(401);
    estado.rol = "SELLER";
    const res = await GET(req());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/firmada/ventas/1/a.jpg");
  });
});
