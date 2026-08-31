/**
 * Costo por bulto y la fila de la grilla de costos.
 *
 * Los casos salen de datos reales del catálogo, medidos el 2026-08-30: los
 * productos que figuraban a pérdida por tener cargado el precio del bulto en
 * el campo del costo unitario.
 */
import { describe, it, expect } from "vitest";
import {
  costoUnitarioDesdeBulto,
  calcularFilaCosto,
  TASA_IVA,
} from "@/lib/pricing";

describe("costo unitario desde el bulto", () => {
  it("divide por las unidades del bulto", () => {
    expect(costoUnitarioDesdeBulto(1860, 24)).toBeCloseTo(77.5, 2);
  });

  it("sin bulto devuelve el costo tal cual", () => {
    // El caso de quien compra por unidad y no tiene que pensar en esto.
    expect(costoUnitarioDesdeBulto(500, null)).toBe(500);
    expect(costoUnitarioDesdeBulto(500, undefined)).toBe(500);
    expect(costoUnitarioDesdeBulto(500, 1)).toBe(500);
  });

  it("rechaza un bulto de cero o negativo en vez de disimularlo", () => {
    // Devolver el costo del bulto entero escondería el dato malo, que es
    // justamente el error que esta función existe para hacer visible.
    expect(costoUnitarioDesdeBulto(1860, 0)).toBeNull();
    expect(costoUnitarioDesdeBulto(1860, -4)).toBeNull();
  });

  it("rechaza un costo que no es número", () => {
    expect(costoUnitarioDesdeBulto(NaN, 4)).toBeNull();
    expect(costoUnitarioDesdeBulto(-100, 4)).toBeNull();
  });
});

describe("la fila de la grilla", () => {
  it("con el bulto cargado, el Pomarola deja de estar a pérdida", () => {
    // Real: se vende a $800 el sachet y tenía cargado $1.860, que es el pack
    // de 24. Así figuraba perdiendo $1.060 en cada venta.
    const malo = calcularFilaCosto({ costoBulto: 1563, unidadesPorBulto: null, precioVenta: 800 });
    expect(malo.aPerdida).toBe(true);

    const bueno = calcularFilaCosto({ costoBulto: 1563, unidadesPorBulto: 24, precioVenta: 800 });
    expect(bueno.aPerdida).toBe(false);
    expect(bueno.margenActual).toBeGreaterThan(0.85);
  });

  it("mide el margen contra el costo CON IVA, no contra el neto", () => {
    // Es el error que infla el margen: `unit_cost` se guarda neto y el precio
    // de venta ya lleva IVA. Compararlos directo daba 46% donde hay 27%.
    const f = calcularFilaCosto({ costoBulto: 1000, unidadesPorBulto: 1, precioVenta: 2000 });
    expect(f.costoUnitarioNeto).toBe(1000);
    expect(f.costoUnitarioBruto).toBeCloseTo(1190, 0);
    // (2000 - 1190) / 2000 = 0,405 — y NO (2000-1000)/2000 = 0,5
    expect(f.margenActual).toBeCloseTo(0.405, 3);
  });

  it("sin precio de venta no inventa un margen", () => {
    // Son los 64 productos con precio $0: todavía no se venden, y decir que
    // están a pérdida sería inventar un problema.
    const f = calcularFilaCosto({ costoBulto: 1000, unidadesPorBulto: 1, precioVenta: 0 });
    expect(f.margenActual).toBeNull();
    expect(f.aPerdida).toBe(false);
    // Pero sí propone un precio, que es justamente para lo que sirve la grilla.
    expect(f.precioSugerido).toBeGreaterThan(0);
  });

  it("el precio sugerido deja el margen pedido", () => {
    const f = calcularFilaCosto({
      costoBulto: 1000, unidadesPorBulto: 1, precioVenta: null,
      margen: 0.35, redondeo: "ninguno",
    });
    // costo bruto 1190 con margen 35% => 1190 / 0,65 = 1830,8
    expect(f.precioSugerido).toBeCloseTo(1831, 0);
  });

  it("sin costo no devuelve nada, en vez de un cero engañoso", () => {
    const f = calcularFilaCosto({ costoBulto: null, precioVenta: 1000 });
    expect(f.costoUnitarioNeto).toBeNull();
    expect(f.margenActual).toBeNull();
    expect(f.aPerdida).toBe(false);
  });

  it("respeta una tasa de IVA distinta", () => {
    const f = calcularFilaCosto({
      costoBulto: 1000, unidadesPorBulto: 1, precioVenta: null, tasa: 0,
    });
    expect(f.costoUnitarioBruto).toBe(1000);
    expect(TASA_IVA).toBe(19);
  });
});

describe("el borde de la pérdida se mide en pesos, no en centavos", () => {
  it("vender exactamente al costo cuenta como pérdida", () => {
    // Caso real: las tres leches Surlat. Costo neto 1.260,50, que por 1,19 da
    // 1.499,995, y se venden a $1.500. Sin redondear al peso el sistema las
    // daba por rentables por medio centavo y las escondía de la lista de
    // productos a revisar.
    const f = calcularFilaCosto({
      costoBulto: 1260.5, unidadesPorBulto: 1, precioVenta: 1500,
    });
    expect(f.aPerdida).toBe(true);
  });

  it("un peso de margen ya no es pérdida", () => {
    // El corte tiene que estar en el peso, no más arriba: si no, marcaría como
    // problema productos que sí dejan algo.
    const f = calcularFilaCosto({
      costoBulto: 1260.5, unidadesPorBulto: 1, precioVenta: 1501,
    });
    expect(f.aPerdida).toBe(false);
  });

  it("el margen sigue calculándose con el costo exacto", () => {
    // Redondear para decidir "está a pérdida" no debe ensuciar el porcentaje
    // que se muestra.
    const f = calcularFilaCosto({
      costoBulto: 1000, unidadesPorBulto: 1, precioVenta: 2000,
    });
    expect(f.costoUnitarioBruto).toBeCloseTo(1190, 5);
  });
});
