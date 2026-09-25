import { describe, expect, it } from "vitest";
import { calcularTotales, faltantesParaEmitir, preciosConIva } from "@/lib/documentos/emision";

describe("calcularTotales", () => {
  it("boleta: el precio ya trae el IVA", () => {
    expect(calcularTotales("39", [{ descripcion: "Pan", cantidad: 2, precio: 5950 }])).toEqual({
      neto: 10000,
      exento: 0,
      iva: 1900,
      total: 11900,
    });
  });

  it("factura: el precio es neto y el IVA se agrega", () => {
    expect(calcularTotales("33", [{ descripcion: "Café", cantidad: 3, precio: 10000 }])).toEqual({
      neto: 30000,
      exento: 0,
      iva: 5700,
      total: 35700,
    });
  });

  it("separa las líneas exentas", () => {
    const t = calcularTotales("33", [
      { descripcion: "Afecto", cantidad: 1, precio: 10000 },
      { descripcion: "Exento", cantidad: 1, precio: 5000, exento: true },
    ]);
    expect(t).toEqual({ neto: 10000, exento: 5000, iva: 1900, total: 16900 });
  });

  it("documentos exentos no llevan IVA", () => {
    expect(calcularTotales("41", [{ descripcion: "x", cantidad: 1, precio: 1000 }]).iva).toBe(0);
    expect(calcularTotales("34", [{ descripcion: "x", cantidad: 1, precio: 1000 }]).total).toBe(1000);
  });

  it("la nota de crédito sigue al documento que corrige", () => {
    expect(preciosConIva("61", "39")).toBe(true);
    expect(preciosConIva("61", "33")).toBe(false);
    expect(calcularTotales("61", [{ descripcion: "Devolución", cantidad: 1, precio: 11900 }], { tipoReferencia: "39" }).iva).toBe(1900);
  });
});

describe("faltantesParaEmitir", () => {
  const linea = { descripcion: "Pan", cantidad: 1, precio: 1000 };

  it("una boleta sólo necesita líneas", () => {
    expect(faltantesParaEmitir({ tipo: "39", lineas: [linea] })).toEqual([]);
  });

  it("una factura necesita los datos del cliente", () => {
    expect(faltantesParaEmitir({ tipo: "33", lineas: [linea] })).toEqual([
      "el RUT del cliente",
      "la razón social del cliente",
      "el giro del cliente",
      "la dirección del cliente",
    ]);
  });

  it("una nota de crédito necesita el documento que corrige", () => {
    expect(faltantesParaEmitir({ tipo: "61", lineas: [linea] })).toContain("el documento que se corrige");
  });
});
