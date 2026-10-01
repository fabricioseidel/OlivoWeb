import { describe, expect, it, vi } from "vitest";

const enviar = async (body: string) => {
  const { POST } = await import("@/app/api/csp-report/route");
  return POST(new Request("http://localhost/api/csp-report", { method: "POST", body }));
};

describe("/api/csp-report", () => {
  it("registra el formato clásico y el de Reporting API, y responde 204", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r1 = await enviar(JSON.stringify({ "csp-report": { "violated-directive": "img-src", "blocked-uri": "https://x.com/a.png", "document-uri": "https://olivomarket.cl/" } }));
    const r2 = await enviar(JSON.stringify([{ body: { effectiveDirective: "script-src", blockedURL: "https://evil.com/s.js", documentURL: "https://olivomarket.cl/p" } }]));
    expect(r1.status).toBe(204);
    expect(r2.status).toBe(204);
    expect(warn.mock.calls.map((c) => c[1]).join()).toContain("img-src");
    expect(warn.mock.calls.map((c) => c[1]).join()).toContain("evil.com");
    warn.mockRestore();
  });

  it("ignora cuerpos mal formados", async () => {
    expect((await enviar("no es json")).status).toBe(204);
  });
});
