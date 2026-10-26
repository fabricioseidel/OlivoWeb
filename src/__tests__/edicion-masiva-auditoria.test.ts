import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  applyPatch,
  buildImportPlan,
  createBackup,
  diffSnapshot,
  findConflicts,
  getPriceWarnings,
  getProductDiagnostics,
  loadBackups,
  mapWithConcurrency,
  parseBooleanCell,
  parseLocaleNumber,
  saveBackups,
  summarizeChanges,
  BACKUP_KEY,
  type ProductChanges,
} from "@/app/admin/productos/edicion-masiva/lib";

function producto(p: Partial<any> & { id: string }) {
  return {
    name: "Producto",
    barcode: p.id,
    price: 1000,
    offerPrice: null,
    stock: 0,
    minStock: 5,
    optimumStock: 20,
    categories: ["Despensa"],
    description: "",
    image: "https://res.cloudinary.com/x/a.jpg",
    purchasePrice: 600,
    isActive: true,
    ...p,
  };
}

describe("parseLocaleNumber: números como los escribe una persona en Chile", () => {
  it("lee los miles con punto como miles, no como decimales", () => {
    expect(parseLocaleNumber("1.500")).toBe(1500);
    expect(parseLocaleNumber("$ 12.990")).toBe(12990);
    expect(parseLocaleNumber("1.234.567")).toBe(1234567);
  });

  it("lee la coma como decimal y el formato en inglés", () => {
    expect(parseLocaleNumber("2,5")).toBe(2.5);
    expect(parseLocaleNumber("1.500,75")).toBe(1500.75);
    expect(parseLocaleNumber("1,500.75")).toBe(1500.75);
    expect(parseLocaleNumber("277.31")).toBe(277.31);
  });

  it("deja pasar los números y rechaza lo que no es número", () => {
    expect(parseLocaleNumber(990)).toBe(990);
    expect(parseLocaleNumber("abc")).toBeNull();
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber(null)).toBeNull();
    expect(parseLocaleNumber("12abc")).toBeNull();
  });
});

describe("parseBooleanCell", () => {
  it("entiende sí/no en sus variantes", () => {
    expect(parseBooleanCell("Sí")).toBe(true);
    expect(parseBooleanCell("x")).toBe(true);
    expect(parseBooleanCell(1)).toBe(true);
    expect(parseBooleanCell("No")).toBe(false);
    expect(parseBooleanCell("inactivo")).toBe(false);
    expect(parseBooleanCell("quizás")).toBeNull();
  });
});

describe("diagnóstico: el stock no cuenta como dato faltante de la ficha", () => {
  it("un producto con ficha completa y sin stock no está en 'Falta 1 dato'", () => {
    const diag = getProductDiagnostics(producto({ id: "A", stock: 0 }));
    expect(diag.missingDataCount).toBe(0);
    expect(diag.missingCount).toBe(1); // sigue sin estar listo para vitrina
    expect(diag.isReady).toBe(false);
  });

  it("falta foto y stock: un dato de ficha", () => {
    const diag = getProductDiagnostics(producto({ id: "A", stock: 0, image: "/file.svg" }));
    expect(diag.missingData).toEqual(["Sin foto"]);
  });
});

describe("getPriceWarnings", () => {
  it("avisa oferta mayor o igual al precio y precio bajo el costo", () => {
    const p = producto({ id: "A", price: 1000, purchasePrice: 600 });
    expect(getPriceWarnings(p)).toEqual([]);
    expect(getPriceWarnings(p, { offerPrice: 1000 })).toEqual(["Oferta ≥ precio"]);
    expect(getPriceWarnings(p, { price: 500 })).toEqual(["Precio bajo costo"]);
  });

  it("sin costo cargado no avisa precio bajo costo", () => {
    expect(getPriceWarnings(producto({ id: "A", purchasePrice: 0 }), { price: 1 })).toEqual([]);
  });
});

describe("applyPatch", () => {
  it("un campo que vuelve a su valor guardado deja de estar pendiente", () => {
    const p = producto({ id: "A", price: 1000 });
    const map: Record<string, ProductChanges> = {};
    expect(applyPatch(map, p, { price: 1200 })).toBe(true);
    expect(map.A).toEqual({ price: 1200 });
    applyPatch(map, p, { price: 1000 });
    expect(map.A).toBeUndefined();
  });

  it("no muta el objeto de cambios anterior (las filas memorizadas dependen de eso)", () => {
    const p = producto({ id: "A" });
    const anterior = { price: 1200, stock: 3 };
    const map: Record<string, ProductChanges> = { A: anterior };
    applyPatch(map, p, { price: 1000 });
    expect(anterior).toEqual({ price: 1200, stock: 3 });
    expect(map.A).toEqual({ stock: 3 });
    expect(map.A).not.toBe(anterior);
  });

  it("devuelve false si nada cambió", () => {
    const p = producto({ id: "A", isActive: true });
    const map: Record<string, ProductChanges> = {};
    expect(applyPatch(map, p, { isActive: true })).toBe(false);
  });
});

describe("buildImportPlan", () => {
  const catalogo = [
    producto({ id: "7801620009342", name: "Leche", price: 1000, stock: 3 }),
    producto({ id: "047800000144", name: "Diablitos", price: 900, isActive: true }),
  ];

  it("lee precios con miles, activo, imagen y costo, y avisa lo inválido", () => {
    const plan = buildImportPlan(
      [
        ["Código", "Precio", "Stock", "Costo", "Activo", "Imagen", "Columna rara"],
        ["7801620009342", "1.500", 10, "700", "Sí", "https://img/x.jpg", "?"],
        [47800000144, "abc", -2, "", "No", "foto.jpg", ""],
        ["999", 100, 1, "", "", "", ""],
      ],
      catalogo
    );

    expect(plan.error).toBeUndefined();
    expect(plan.changes["7801620009342"]).toEqual({
      price: 1500,
      stock: 10,
      purchasePrice: 700,
      image: "https://img/x.jpg",
    });
    // El código numérico perdió el 0 inicial en Excel y aun así se encuentra.
    expect(plan.changes["047800000144"]).toEqual({ isActive: false });
    expect(plan.unmatched).toBe(1);
    expect(plan.unmatchedCodes).toEqual(["999"]);
    expect(plan.invalid).toHaveLength(3); // precio "abc", stock -2, imagen sin http
    expect(plan.ignoredColumns).toEqual(["Columna rara"]);
    expect(plan.fieldCounts.price).toBe(1);
  });

  it("encuentra la fila de encabezados aunque haya un título arriba", () => {
    const plan = buildImportPlan(
      [["Inventario octubre"], [], ["SKU", "Nombre"], ["7801620009342", "Leche entera"]],
      catalogo
    );
    expect(plan.changes["7801620009342"]).toEqual({ name: "Leche entera" });
  });

  it("sin columna de código no importa nada", () => {
    const plan = buildImportPlan([["Nombre", "Precio"], ["x", 1]], catalogo);
    expect(plan.error).toBeTruthy();
  });
});

describe("diffSnapshot: restaurar devuelve también foto, vitrina y costo", () => {
  it("incluye image, isActive y purchasePrice", () => {
    const antes = producto({ id: "A", image: "https://a.jpg", isActive: true, purchasePrice: 500 });
    const snap = createBackup([antes], "x").products[0];
    const ahora = producto({ id: "A", image: "https://b.jpg", isActive: false, purchasePrice: 800 });
    expect(diffSnapshot(snap, ahora)).toEqual({ image: "https://a.jpg", isActive: true, purchasePrice: 500 });
  });
});

describe("findConflicts", () => {
  it("avisa sólo los campos editados que otra persona cambió entre tanto", () => {
    const cargado = [producto({ id: "A", price: 1000, stock: 5 })];
    const fresco = [producto({ id: "A", price: 1100, stock: 5 })];
    expect(findConflicts({ A: { price: 1200 } }, cargado, fresco)).toEqual([{ id: "A", name: "Producto", field: "precio" }]);
    expect(findConflicts({ A: { stock: 7 } }, cargado, fresco)).toEqual([]);
  });
});

describe("summarizeChanges", () => {
  it("cuenta campos, lista renombres y advertencias", () => {
    const s = summarizeChanges(
      { A: { price: 100, barcode: "B" }, C: { stock: 1 } },
      [producto({ id: "A", purchasePrice: 600 }), producto({ id: "C" })]
    );
    expect(s.fieldCounts).toEqual({ price: 1, barcode: 1, stock: 1 });
    expect(s.renames).toEqual([{ id: "A", name: "Producto", to: "B" }]);
    expect(s.warnings).toEqual([{ id: "A", name: "Producto", warnings: ["Precio bajo costo"] }]);
  });
});

describe("saveBackups sin espacio en el navegador", () => {
  beforeEach(() => localStorage.clear());

  it("descarta los backups más viejos hasta que entre", () => {
    const b = (n: number) => ({ ...createBackup([producto({ id: String(n) })], `b${n}`), id: String(n) });
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (JSON.parse(v).length > 2) throw new DOMException("lleno", "QuotaExceededError");
      return original.call(this, k, v);
    });
    const saved = saveBackups([b(1), b(2), b(3)]);
    spy.mockRestore();
    expect(saved?.map((x) => x.id)).toEqual(["1", "2"]);
    expect(loadBackups().map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("si ni el más nuevo entra devuelve null y no borra lo guardado", () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify([{ id: "viejo", products: [] }]));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("lleno", "QuotaExceededError");
    });
    expect(saveBackups([createBackup([producto({ id: "A" })], "x")])).toBeNull();
    spy.mockRestore();
    expect(loadBackups().map((x) => x.id)).toEqual(["viejo"]);
  });
});

describe("mapWithConcurrency", () => {
  it("no pasa del límite de tareas en paralelo y procesa todo", async () => {
    let enCurso = 0;
    let maximo = 0;
    const hechos: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      enCurso++;
      maximo = Math.max(maximo, enCurso);
      await new Promise((r) => setTimeout(r, 2));
      hechos.push(n);
      enCurso--;
    });
    expect(maximo).toBeLessThanOrEqual(3);
    expect(hechos.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("XLSX: lo exportado se puede volver a importar", () => {
  it("exporta con write-excel-file y lo lee read-excel-file con los mismos encabezados", async () => {
    const { EXPORT_COLUMNS } = await import("@/app/admin/productos/edicion-masiva/lib");
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const { readSheet } = await import("read-excel-file/browser");

    const catalogo = [producto({ id: "7801620009342", name: "Leche", price: 1000, stock: 3, categories: ["Lácteos", "Desayuno"] })];
    const data = [
      EXPORT_COLUMNS.map((c) => ({ value: c.header, fontWeight: "bold" as const })),
      ...catalogo.map((p) => EXPORT_COLUMNS.map((c) => c.value(p))),
    ];
    const blob = await writeXlsxFile(data, { columns: EXPORT_COLUMNS.map((c) => ({ width: c.width })) }).toBlob();
    // El Blob de jsdom no trae arrayBuffer(); el del navegador sí.
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(blob);
    });
    const rows = (await readSheet(buffer)) as unknown[][];

    expect(rows[0]).toEqual(EXPORT_COLUMNS.map((c) => c.header));
    // Sin cambios: el mismo archivo no propone nada.
    expect(buildImportPlan(rows, catalogo).matched).toBe(0);

    // Con un precio editado en el archivo, propone sólo ese cambio.
    const editado = rows.map((r) => [...r]);
    editado[1][EXPORT_COLUMNS.findIndex((c) => c.header === "Precio")] = 1290;
    const plan = buildImportPlan(editado, catalogo);
    expect(plan.changes).toEqual({ "7801620009342": { price: 1290 } });
    expect(plan.ignoredColumns).toEqual([]);
  });
});
