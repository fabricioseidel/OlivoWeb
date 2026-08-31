/**
 * Guardado del taller de precios.
 *
 * Lo que se fija acá es lo que puede corromper datos de verdad:
 *
 *  - Que el costo se guarde POR UNIDAD y no el del bulto. Es el error que hoy
 *    tiene el catálogo —una marraqueta de $300 con "costo" $1.690, que es el
 *    precio del kilo— y la razón de que 6 productos figuren a pérdida.
 *  - Que una fila mala no arrastre a las buenas: quien cargó treinta productos
 *    no debería perder veintinueve por un error en uno.
 *  - Que un costo sin proveedor no se guarde a medias.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

type Escritura = { tabla: string; payload: any; filtro?: any };

const estado: { escrituras: Escritura[]; errorEn: string | null } = {
  escrituras: [],
  errorEn: null,
};

vi.mock("@/lib/api-auth", () => ({
  requireApiAdmin: async () => ({ ok: true, userId: "admin-1", role: "ADMIN", session: {} }),
}));

vi.mock("@/server/pricing.service", () => ({ CATEGORIA_POR_DEFECTO: "__default__" }));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from(tabla: string) {
      const api: any = {
        select: () => api,
        eq: (col: string, val: unknown) => {
          const ultima = estado.escrituras[estado.escrituras.length - 1];
          if (ultima && ultima.tabla === tabla) ultima.filtro = { [col]: val };
          return api;
        },
        update(payload: any) {
          estado.escrituras.push({ tabla, payload });
          return api;
        },
        upsert(payload: any) {
          estado.escrituras.push({ tabla, payload });
          return Promise.resolve({
            error: estado.errorEn === tabla ? { message: "boom" } : null,
          });
        },
        then(resolve: any) {
          return Promise.resolve({
            error: estado.errorEn === tabla ? { message: "boom" } : null,
            data: [],
          }).then(resolve);
        },
      };
      return api;
    },
  },
}));

const pedir = async (filas: unknown[]) => {
  const { POST } = await import("@/app/api/admin/taller-precios/route");
  const res = await POST(
    new Request("http://localhost/api/admin/taller-precios", {
      method: "POST",
      body: JSON.stringify({ filas }),
    })
  );
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  estado.escrituras = [];
  estado.errorEn = null;
  vi.resetModules();
});

describe("guardado de costos", () => {
  it("guarda el costo POR UNIDAD, no el del bulto", async () => {
    // El caso real: Pomarola a $1.563 el pack de 24 sachets.
    await pedir([
      { barcode: "779", costoBulto: 1563, unidadesPorBulto: 24, proveedorId: "prov-1" },
    ]);

    const w = estado.escrituras.find((e) => e.tabla === "product_suppliers");
    expect(w).toBeDefined();
    expect(w!.payload.unit_cost).toBeCloseTo(65.125, 3);
    // Y deja anotado de dónde salió, para que se pueda auditar después.
    expect(w!.payload.pack_size).toBe(24);
  });

  it("sin bulto guarda el costo tal cual", async () => {
    await pedir([{ barcode: "779", costoBulto: 500, unidadesPorBulto: 1, proveedorId: "p" }]);
    const w = estado.escrituras.find((e) => e.tabla === "product_suppliers");
    expect(w!.payload.unit_cost).toBe(500);
    expect(w!.payload.pack_size).toBeNull();
  });

  it("un costo sin proveedor no se guarda a medias", async () => {
    const { body } = await pedir([{ barcode: "779", costoBulto: 1000 }]);
    expect(body.guardadas).toBe(0);
    expect(body.fallidas[0].error).toMatch(/proveedor/i);
    expect(estado.escrituras.filter((e) => e.tabla === "product_suppliers")).toHaveLength(0);
  });

  it("un bulto de cero se rechaza en vez de guardar un costo absurdo", async () => {
    const { body } = await pedir([
      { barcode: "779", costoBulto: 1000, unidadesPorBulto: 0, proveedorId: "p" },
    ]);
    expect(body.guardadas).toBe(0);
    expect(estado.escrituras.filter((e) => e.tabla === "product_suppliers")).toHaveLength(0);
  });
});

describe("guardado de precios", () => {
  it("marca el precio como revisado, porque ponerlo ES revisarlo", async () => {
    await pedir([{ barcode: "779", precioVenta: 1990 }]);
    const w = estado.escrituras.find((e) => e.tabla === "products");
    expect(w!.payload.sale_price).toBe(1990);
    expect(w!.payload.price_reviewed_at).toBeTruthy();
    expect(w!.payload.price_reviewed_by).toBe("admin-1");
  });

  it("no marca como revisado un precio en cero", async () => {
    // Dejar un producto en $0 no es una decisión de precio revisada.
    await pedir([{ barcode: "779", precioVenta: 0 }]);
    const w = estado.escrituras.find((e) => e.tabla === "products");
    expect(w!.payload.price_reviewed_at).toBeUndefined();
  });

  it("una fila sin precio no toca el precio", async () => {
    // `null` significa "no lo toques", no "ponelo en cero".
    await pedir([{ barcode: "779", proveedorId: "p", costoBulto: 100 }]);
    expect(estado.escrituras.filter((e) => e.tabla === "products")).toHaveLength(0);
  });
});

describe("el lote aguanta filas malas", () => {
  it("guarda las buenas aunque una falle", async () => {
    const { body } = await pedir([
      { barcode: "aaa", precioVenta: 1000 },
      { barcode: "bbb", costoBulto: 500 }, // sin proveedor: falla
      { barcode: "ccc", precioVenta: 2000 },
    ]);
    expect(body.guardadas).toBe(2);
    expect(body.fallidas).toHaveLength(1);
    expect(body.fallidas[0].barcode).toBe("bbb");
  });

  it("rechaza un lote gigante en vez de morir a medias", async () => {
    const filas = Array.from({ length: 201 }, (_, i) => ({ barcode: `b${i}`, precioVenta: 100 }));
    const { status, body } = await pedir(filas);
    expect(status).toBe(400);
    expect(body.error).toMatch(/200/);
  });

  it("un lote vacío no pasa por guardado", async () => {
    const { status } = await pedir([]);
    expect(status).toBe(400);
  });
});
