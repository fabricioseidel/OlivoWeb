import { describe, it, expect } from "vitest";
import {
  barcodeSuffixKey,
  buildMergePlan,
  findDuplicateGroups,
  getPublishPriority,
  isRecentlyCounted,
  normalizeDuplicateKey,
} from "@/app/admin/productos/edicion-masiva/lib";

const AYER = "2026-09-12T00:59:23.909Z";
const AHORA = new Date("2026-09-12T18:00:00.000Z").getTime();
const HACE_UN_MES = "2026-08-08T15:34:02.671Z";

function producto(p: Partial<any> & { id: string }) {
  return {
    name: "Producto",
    barcode: p.id,
    price: 0,
    offerPrice: null,
    stock: 0,
    categories: [],
    image: "/file.svg",
    purchasePrice: 0,
    isActive: true,
    verifiedAt: null,
    ...p,
  };
}

describe("Edición masiva: prioridad por stock real (lo contado)", () => {
  it("pone primero lo contado con stock, y último lo que no se contó ni tiene stock", () => {
    const contadoConStock = producto({ id: "1", stock: 5, verifiedAt: AYER });
    const stockSinContar = producto({ id: "2", stock: 5 });
    const contadoEnCero = producto({ id: "3", stock: 0, verifiedAt: AYER });
    const nada = producto({ id: "4", stock: 0 });

    expect(getPublishPriority(contadoConStock)).toBe(0);
    expect(getPublishPriority(stockSinContar)).toBe(1);
    expect(getPublishPriority(contadoEnCero)).toBe(2);
    expect(getPublishPriority(nada)).toBe(3);
  });

  it("un stock editado a mano ya cuenta para la prioridad, sin esperar el guardado", () => {
    const p = producto({ id: "1", stock: 0, verifiedAt: AYER });
    expect(getPublishPriority(p)).toBe(2);
    expect(getPublishPriority(p, { stock: 7 })).toBe(0);
  });

  it("distingue el conteo reciente (el de ayer) de uno viejo", () => {
    expect(isRecentlyCounted(producto({ id: "1", verifiedAt: AYER }), AHORA)).toBe(true);
    expect(isRecentlyCounted(producto({ id: "2", verifiedAt: HACE_UN_MES }), AHORA)).toBe(false);
    expect(isRecentlyCounted(producto({ id: "3" }), AHORA)).toBe(false);
  });
});

describe("Edición masiva: detección de duplicados", () => {
  it("empareja el mismo producto escrito distinto, con unidades y marcas de unificación", () => {
    expect(normalizeDuplicateKey("Agua cachantun con gas 1.5 [duplicado, unificado 27/08/2026]")).toBe(
      normalizeDuplicateKey("Agua cachantun con gas 1.5 lt")
    );
    expect(normalizeDuplicateKey("Chocolate Kit Kat 41,5 Gr")).toBe(
      normalizeDuplicateKey("Chocolate kitkat 41.5 g")
    );
    expect(normalizeDuplicateKey("Jugo watts piña 200 ml")).toBe(
      normalizeDuplicateKey("Jugo Watts Piña 200 Ml")
    );
  });

  it("no confunde dos tamaños distintos del mismo producto", () => {
    expect(normalizeDuplicateKey("Agua Benedictino Sin Gas 500 Ml")).not.toBe(
      normalizeDuplicateKey("Agua Benedictino Sin Gas 2 Lt")
    );
  });

  it("empareja dos códigos que comparten el final (el del envase y el interno)", () => {
    expect(barcodeSuffixKey("7801620009342")).toBe(barcodeSuffixKey("2848620009342"));
    expect(barcodeSuffixKey("123")).toBeNull();
  });

  it("agrupa por nombre y por código, y deja como titular el escaneado más reciente", () => {
    const escaneado = producto({
      id: "7801620009342",
      name: "Pepsi Zero 600 ml",
      stock: 2,
      verifiedAt: AYER,
    });
    const viejo = producto({
      id: "2848620009342",
      name: "Pepsi Zero 600 Ml [duplicado, unificado 27/08/2026]",
      stock: 0,
      price: 1200,
      purchasePrice: 689,
    });
    const otro = producto({ id: "7801610001196", name: "Coca-Cola Lata 350 Ml", stock: 17 });

    const grupos = findDuplicateGroups([escaneado, viejo, otro]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].keeper.id).toBe("7801620009342");
    expect(grupos[0].others.map((p: any) => p.id)).toEqual(["2848620009342"]);
    expect(grupos[0].reasons.sort()).toEqual(["codigo", "nombre"]);
  });

  it("no vuelve a proponer una corrección ya hecha (fila archivada como duplicado)", () => {
    const titular = producto({ id: "7801610000335", name: "Coca-Cola Zero 250 ML", stock: 4, verifiedAt: AYER });
    const archivado = producto({
      id: "640002090335",
      name: "Coca-Cola Zero 250 Ml [duplicado de 7801610000335]",
      stock: 0,
      isActive: false,
    });

    expect(findDuplicateGroups([titular, archivado])).toEqual([]);
  });

  it("una fila marcada como duplicado pero con stock sigue pendiente: hay unidades en juego", () => {
    const titular = producto({ id: "7802820678161", name: "Powerade Naranja 850 Ml", stock: 6, verifiedAt: AYER });
    const marcado = producto({
      id: "7802820678062",
      name: "Powerade Naranja 850 Ml [duplicado, unificado 27/08/2026]",
      stock: 3,
      isActive: true,
      verifiedAt: AYER,
    });

    const grupos = findDuplicateGroups([titular, marcado]);
    expect(grupos).toHaveLength(1);
    expect(buildMergePlan(grupos[0]).stockFinal).toBe(9);
  });

  it("un catálogo sin repetidos no genera grupos", () => {
    const grupos = findDuplicateGroups([
      producto({ id: "7801620009342", name: "Pepsi Zero 600 Ml" }),
      producto({ id: "7801610001196", name: "Coca-Cola Lata Original 350 Ml" }),
    ]);
    expect(grupos).toEqual([]);
  });
});

describe("Edición masiva: corrección de duplicados", () => {
  it("conserva el código escaneado ayer y le rescata los datos que quedaron en la fila vieja", () => {
    const escaneado = producto({
      id: "7801620009342",
      name: "Pepsi Zero 600 ml",
      stock: 2,
      price: 0,
      purchasePrice: 0,
      verifiedAt: AYER,
    });
    const viejo = producto({
      id: "2848620009342",
      name: "Pepsi Zero 600 Ml",
      stock: 0,
      price: 1200,
      purchasePrice: 689,
      image: "https://cdn/pepsi.jpg",
      categories: ["Bebidas"],
    });

    const [grupo] = findDuplicateGroups([escaneado, viejo]);
    const plan = buildMergePlan(grupo);

    expect(grupo.keeper.id).toBe("7801620009342");
    expect(plan.changes["7801620009342"]).toMatchObject({
      price: 1200,
      purchasePrice: 689,
      image: "https://cdn/pepsi.jpg",
      categories: ["Bebidas"],
    });
    // El stock de la fila vieja no se suma: no pasó por el conteo, es un número viejo.
    expect(plan.stockSumado).toBe(false);
    expect(plan.stockFinal).toBe(2);
    expect(plan.changes["7801620009342"].stock).toBeUndefined();

    // La fila repetida queda oculta y en cero — nunca borrada: tiene historial.
    expect(plan.changes["2848620009342"]).toMatchObject({ isActive: false });
    expect(plan.changes["2848620009342"].stock).toBeUndefined();
    expect(plan.changes["2848620009342"].name).toContain("[duplicado de 7801620009342]");
  });

  it("suma el stock cuando los dos códigos se contaron en el mismo recorrido", () => {
    // Caso real: las mismas unidades estaban en la góndola bajo dos códigos y
    // el conteo escaneó los dos. Son unidades distintas, no un doble conteo.
    const a = producto({
      id: "7613039257333",
      name: "Galleta Mckay limón 120 gr",
      stock: 3,
      price: 1200,
      verifiedAt: AYER,
    });
    const b = producto({
      id: "643439257333",
      name: "Galleta Mckay limón 120g",
      stock: 1,
      price: 1200,
      verifiedAt: AYER,
    });

    const [grupo] = findDuplicateGroups([a, b]);
    const plan = buildMergePlan(grupo);

    expect(plan.stockSumado).toBe(true);
    expect(plan.stockFinal).toBe(4);
    expect(plan.changes[grupo.keeper.id].stock).toBe(4);
    expect(plan.changes[grupo.others[0].id].stock).toBe(0);
  });

  it("reactiva el titular si tiene stock pero estaba oculto", () => {
    const escaneado = producto({
      id: "7801620009342",
      name: "Pepsi Zero 600 ml",
      stock: 2,
      isActive: false,
      verifiedAt: AYER,
    });
    const viejo = producto({ id: "2848620009342", name: "Pepsi Zero 600 Ml", price: 1200 });

    const [grupo] = findDuplicateGroups([escaneado, viejo]);
    const plan = buildMergePlan(grupo);

    expect(plan.changes["7801620009342"].isActive).toBe(true);
  });

  it("no pisa un dato que la persona ya estaba editando a mano", () => {
    const escaneado = producto({ id: "7801620009342", name: "Pepsi Zero 600 ml", verifiedAt: AYER });
    const viejo = producto({ id: "2848620009342", name: "Pepsi Zero 600 Ml", price: 1200 });

    const [grupo] = findDuplicateGroups([escaneado, viejo]);
    const plan = buildMergePlan(grupo, { "7801620009342": { price: 1500 } });

    expect(plan.changes["7801620009342"]?.price).toBeUndefined();
  });

  it("si ninguno fue contado, manda el que tiene stock", () => {
    const conStock = producto({ id: "7801620006860", name: "Pepsi Zero 1.5 Lt", stock: 4 });
    const sinStock = producto({ id: "2848620006860", name: "Pepsi Zero 1.5", stock: 0, price: 2200 });

    const [grupo] = findDuplicateGroups([sinStock, conStock]);
    expect(grupo.keeper.id).toBe("7801620006860");
  });
});
