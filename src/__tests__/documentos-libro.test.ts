import { describe, expect, it } from "vitest";
import {
  calcularDesdeNeto,
  desglosarBruto,
  ivaDeVentasBrutas,
  resumirMes,
  totalVentasDocumentadas,
  type DocumentoLibro,
} from "@/lib/documentos/libro";

const venta = (neto: number, extra: Partial<DocumentoLibro> = {}): DocumentoLibro => ({
  direccion: "emitido",
  tipo: "33",
  estado: "emitido",
  neto,
  exento: 0,
  iva: Math.round(neto * 0.19),
  total: neto + Math.round(neto * 0.19),
  ...extra,
});

const compra = (neto: number, extra: Partial<DocumentoLibro> = {}): DocumentoLibro => ({
  ...venta(neto),
  direccion: "recibido",
  estado: "aceptado",
  ...extra,
});

describe("desglose de IVA", () => {
  it("separa el IVA de un total con IVA incluido", () => {
    expect(desglosarBruto(11900)).toEqual({ neto: 10000, iva: 1900 });
    expect(desglosarBruto(1000)).toEqual({ neto: 840, iva: 160 });
  });

  it("calcula el total desde el neto", () => {
    expect(calcularDesdeNeto(10000, 500)).toEqual({ neto: 10000, exento: 500, iva: 1900, total: 12400 });
  });

  it("estima el IVA de las ventas brutas del sistema", () => {
    expect(ivaDeVentasBrutas(119000)).toBe(19000);
  });
});

describe("resumirMes", () => {
  it("débito menos crédito es lo que se paga", () => {
    const r = resumirMes([venta(1_000_000), compra(631_579)]);
    expect(r.ivaDebito).toBe(190_000);
    expect(r.ivaCredito).toBe(120_000);
    expect(r.ivaAPagar).toBe(70_000);
    expect(r.remanenteSiguiente).toBe(0);
  });

  it("si el crédito supera al débito, no se paga y queda remanente", () => {
    const r = resumirMes([venta(526_316), compra(789_474)]);
    expect(r.ivaAPagar).toBe(0);
    expect(r.remanenteSiguiente).toBe(50_000);
  });

  it("descuenta el remanente del mes anterior", () => {
    const r = resumirMes([venta(1_052_632), compra(631_579)], { remanenteAnterior: 30_000 });
    expect(r.ivaDeterminado).toBe(200_000 - 120_000 - 30_000);
    expect(r.ivaAPagar).toBe(50_000);
  });

  it("la nota de crédito emitida resta del débito, la recibida resta del crédito", () => {
    const r = resumirMes([
      venta(100_000),
      venta(20_000, { tipo: "61" }),
      compra(50_000),
      compra(10_000, { tipo: "61" }),
    ]);
    expect(r.ivaDebito).toBe(19_000 - 3_800);
    expect(r.ivaCredito).toBe(9_500 - 1_900);
  });

  it("la nota de débito suma", () => {
    const r = resumirMes([venta(100_000), venta(10_000, { tipo: "56" })]);
    expect(r.ivaDebito).toBe(20_900);
  });

  it("deja fuera borradores, anulados y facturas reclamadas", () => {
    const r = resumirMes([
      venta(100_000, { estado: "borrador" }),
      venta(100_000, { estado: "anulado" }),
      compra(100_000, { estado: "reclamado" }),
      venta(100_000),
    ]);
    expect(r.ivaDebito).toBe(19_000);
    expect(r.ivaCredito).toBe(0);
  });

  it("la guía de despacho no cuenta", () => {
    const r = resumirMes([compra(100_000, { tipo: "52" })]);
    expect(r.ivaCredito).toBe(0);
    expect(r.compras.documentos).toBe(0);
  });

  it("desglosa boletas y vouchers que sólo traen el total", () => {
    const r = resumirMes([
      { direccion: "emitido", tipo: "39", estado: "emitido", neto: 0, exento: 0, iva: 0, total: 11_900 },
      { direccion: "emitido", tipo: "48", estado: "emitido", neto: 0, exento: 0, iva: 0, total: 23_800 },
    ]);
    expect(r.ivaDebito).toBe(1_900 + 3_800);
    expect(r.ventas.neto).toBe(30_000);
  });

  it("lo exento no lleva IVA pero entra a la base del PPM", () => {
    const r = resumirMes(
      [venta(100_000), { direccion: "emitido", tipo: "34", estado: "emitido", neto: 0, exento: 50_000, iva: 0, total: 50_000 }],
      { tasaPpm: 0.125 },
    );
    expect(r.ivaDebito).toBe(19_000);
    expect(r.baseAfectaPpm).toBe(150_000);
    expect(r.ppm).toBe(188); // 187,5 → 188
  });

  it("suma retenciones de honorarios y el IVA retenido de facturas de compra", () => {
    const r = resumirMes([
      { direccion: "recibido", tipo: "BHE", estado: "aceptado", neto: 0, exento: 0, iva: 0, total: 100_000, retencion: 15_250 },
      { direccion: "emitido", tipo: "46", estado: "emitido", neto: 10_000, exento: 0, iva: 1_900, total: 11_900 },
    ]);
    expect(r.ivaCredito).toBe(1_900);
    expect(r.retenciones).toBe(15_250 + 1_900);
    expect(r.totalF29).toBe(r.ivaAPagar + r.ppm + r.retenciones);
  });

  it("suma como boletas las ventas del sistema que no tienen documento", () => {
    const docs: DocumentoLibro[] = [
      { direccion: "emitido", tipo: "39", estado: "emitido", neto: 0, exento: 0, iva: 0, total: 11_900 },
    ];
    expect(totalVentasDocumentadas(docs)).toBe(11_900);
    const r = resumirMes(docs, { ventasSinDocumento: 107_100 });
    expect(r.ivaDebito).toBe(1_900 + 17_100);
    expect(r.baseAfectaPpm).toBe(100_000);
  });

  it("el impuesto único de los trabajadores va a retenciones", () => {
    expect(resumirMes([], { retencionImpuestoUnico: 12_000 }).totalF29).toBe(12_000);
  });

  it("un mes sin movimiento da cero, pero igual se declara", () => {
    const r = resumirMes([]);
    expect(r.totalF29).toBe(0);
  });
});
