import { describe, expect, it } from "vitest";
import {
  MAINTENANCE_DEFAULT_MESSAGE,
  bloqueadaPorMantenimiento,
  paginaMantenimiento,
} from "@/lib/maintenance";

describe("modo mantenimiento", () => {
  it("baja la tienda pública", () => {
    for (const ruta of ["/", "/productos", "/productos/coca-cola", "/checkout", "/api/checkout/create-order", "/api/products"]) {
      expect(bloqueadaPorMantenimiento(ruta)).toBe(true);
    }
  });

  it("deja funcionando el panel, el acceso y operaciones", () => {
    for (const ruta of ["/admin", "/admin/configuracion", "/login", "/operaciones", "/api/admin/settings", "/api/auth/session", "/api/webhooks/mercadopago", "/api/cron/auto-close-shifts"]) {
      expect(bloqueadaPorMantenimiento(ruta)).toBe(false);
    }
  });

  it("no exime rutas que solo empiezan parecido", () => {
    expect(bloqueadaPorMantenimiento("/administracion")).toBe(true);
    expect(bloqueadaPorMantenimiento("/login-falso")).toBe(true);
  });

  it("usa el mensaje por defecto y escapa el configurado", () => {
    expect(paginaMantenimiento(null)).toContain(MAINTENANCE_DEFAULT_MESSAGE);
    const html = paginaMantenimiento('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
