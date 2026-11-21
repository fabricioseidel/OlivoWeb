import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  process.env.NEXT_PUBLIC_VITRINA_FORZADA = "0";
  vi.resetModules();
});

describe("vitrina forzada desde el código", () => {
  it("con la vitrina forzada no se aceptan pedidos aunque settings diga que la tienda está abierta", async () => {
    process.env.NEXT_PUBLIC_VITRINA_FORZADA = "1";
    vi.resetModules();
    vi.doMock("@/lib/supabase-server", () => ({
      supabaseServer: {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { preview_mode: false }, error: null }) }),
          }),
        }),
      },
    }));
    const { getStoreStatus } = await import("@/server/store-status.service");
    expect((await getStoreStatus()).previewMode).toBe(true);
    const { mapSettingsRow } = await import("@/lib/settings-shared");
    expect(mapSettingsRow({ preview_mode: false }).previewMode).toBe(true);
  });

  it("con NEXT_PUBLIC_VITRINA_FORZADA=0 manda la configuración", async () => {
    process.env.NEXT_PUBLIC_VITRINA_FORZADA = "0";
    vi.resetModules();
    const { mapSettingsRow } = await import("@/lib/settings-shared");
    expect(mapSettingsRow({ preview_mode: false }).previewMode).toBe(false);
  });
});
