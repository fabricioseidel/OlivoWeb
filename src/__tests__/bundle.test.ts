import { describe, it, expect } from "vitest";
import {
  calculateBundleStock,
  calculateBundleCost,
  expandBundleForDeduction,
} from "@/lib/bundle";
import { BundleConfig } from "@/types/bundle";

describe("Bundle calculations (Stock y Costo derivado)", () => {
  const sampleBundle: BundleConfig = {
    isBundle: true,
    fixedItems: [
      {
        id: "chorizo-crianza",
        barcode: "7801111",
        name: "Chorizo La Crianza",
        quantity: 2,
        unitCost: 3500,
      },
      {
        id: "marraqueta",
        barcode: "7802222",
        name: "Marraqueta",
        quantity: 1,
        unitCost: 1200,
      },
    ],
    optionGroups: [
      {
        id: "bebidas",
        title: "Bebida 3L",
        required: true,
        minQuantity: 1,
        maxQuantity: 1,
        options: [
          { id: "coca-3l", barcode: "7803333", name: "Coca-Cola 3L", unitCost: 1950 },
          { id: "sprite-3l", barcode: "7804444", name: "Sprite 3L", unitCost: 1900 },
        ],
      },
      {
        id: "salsas",
        title: "Salsas 100g",
        required: true,
        minQuantity: 4,
        maxQuantity: 4,
        options: [
          { id: "mayo", barcode: "7805555", name: "Mayonesa 100g", unitCost: 400 },
          { id: "ketchup", barcode: "7806666", name: "Ketchup 100g", unitCost: 400 },
        ],
      },
    ],
  };

  it("calcula el stock del pack basado en el cuello de botella de los productos fijos", () => {
    // Chorizo: 20 u. / 2 = 10 packs
    // Marraqueta: 5 u. / 1 = 5 packs
    // Bebidas: Coca (10) + Sprite (10) = 20 u. / 1 = 20 packs
    // Salsas: Mayo (20) + Ketchup (20) = 40 u. / 4 = 10 packs
    // Tope = Marraqueta (5 packs)
    const stockMap: Record<string, number> = {
      "7801111": 20,
      "7802222": 5,
      "7803333": 10,
      "7804444": 10,
      "7805555": 20,
      "7806666": 20,
    };

    const result = calculateBundleStock(sampleBundle, (barcode) => stockMap[barcode] ?? 0);
    expect(result.stock).toBe(5);
    expect(result.isAvailable).toBe(true);
    expect(result.limitingItem).toContain("Marraqueta");
  });

  it("devuelve 0 si un componente fijo está agotado", () => {
    const stockMap: Record<string, number> = {
      "7801111": 0, // Sin chorizos
      "7802222": 50,
      "7803333": 10,
      "7804444": 10,
      "7805555": 20,
      "7806666": 20,
    };

    const result = calculateBundleStock(sampleBundle, (barcode) => stockMap[barcode] ?? 0);
    expect(result.stock).toBe(0);
    expect(result.isAvailable).toBe(false);
  });

  it("calcula el stock limitante por grupos de opciones", () => {
    // Salsas: total 6 u. disponibles, requiere 4 u. -> solo 1 pack posible
    const stockMap: Record<string, number> = {
      "7801111": 100,
      "7802222": 100,
      "7803333": 10,
      "7804444": 10,
      "7805555": 3,
      "7806666": 3,
    };

    const result = calculateBundleStock(sampleBundle, (barcode) => stockMap[barcode] ?? 0);
    expect(result.stock).toBe(1);
    expect(result.isAvailable).toBe(true);
  });

  it("calcula el costo consolidado del pack", () => {
    // Fijos: 2 * 3500 + 1 * 1200 = 7000 + 1200 = 8200
    // Bebida: avg(1950, 1900) * 1 = 1925
    // Salsas: avg(400, 400) * 4 = 1600
    // Total = 8200 + 1925 + 1600 = 11725
    const costMap: Record<string, number> = {
      "7801111": 3500,
      "7802222": 1200,
      "7803333": 1950,
      "7804444": 1900,
      "7805555": 400,
      "7806666": 400,
    };

    const result = calculateBundleCost(sampleBundle, (barcode) => costMap[barcode] ?? 0);
    expect(result.fixedCost).toBe(8200);
    expect(result.totalCost).toBe(11725);
  });

  it("expande el pack en sus productos componentes sueltos para descontar stock en venta", () => {
    const selectedOptions = [
      {
        groupId: "bebidas",
        groupTitle: "Bebida 3L",
        selection: "Sprite 3L",
        items: [{ barcode: "7804444", name: "Sprite 3L", quantity: 1 }],
      },
      {
        groupId: "salsas",
        groupTitle: "Salsas 100g",
        selection: "2x Mayonesa 100g, 2x Ketchup 100g",
        items: [
          { barcode: "7805555", name: "Mayonesa 100g", quantity: 2 },
          { barcode: "7806666", name: "Ketchup 100g", quantity: 2 },
        ],
      },
    ];

    // Venta de 2 packs
    const deductions = expandBundleForDeduction(2, sampleBundle, selectedOptions);

    // Debe descontar:
    // - Chorizos: 2 * 2 = 4 u.
    // - Marraqueta: 1 * 2 = 2 u.
    // - Sprite 3L: 1 * 2 = 2 u.
    // - Mayonesa: 2 * 2 = 4 u.
    // - Ketchup: 2 * 2 = 4 u.
    expect(deductions).toHaveLength(5);
    expect(deductions.find((d) => d.barcode === "7801111")?.quantity).toBe(4);
    expect(deductions.find((d) => d.barcode === "7802222")?.quantity).toBe(2);
    expect(deductions.find((d) => d.barcode === "7804444")?.quantity).toBe(2);
    expect(deductions.find((d) => d.barcode === "7805555")?.quantity).toBe(4);
    expect(deductions.find((d) => d.barcode === "7806666")?.quantity).toBe(4);
  });
});
