import { describe, expect, it } from "vitest";
import { leerFecha, leerMonto, parsearRcv } from "@/lib/documentos/rcv";

const COMPRAS =
  "Nro;Tipo Doc;Tipo Compra;RUT Proveedor;Razon Social;Folio;Fecha Docto;Fecha Recepcion;Fecha Acuse;Monto Exento;Monto Neto;Monto IVA Recuperable;Monto Iva No Recuperable;Codigo IVA No Rec.;Monto Total;Monto Neto Activo Fijo;IVA Activo Fijo;IVA uso Comun;Impto. Sin Derecho a Credito;IVA No Retenido;Tabacos Puros;Tabacos Cigarrillos;Tabacos Elaborados;NCE o NDE sobre Fact. de Compra;Codigo Otro Impuesto;Valor Otro Impuesto;Tasa Otro Impuesto\n";

describe("leerMonto", () => {
  it("acepta el formato del SII y el que deja Excel", () => {
    expect(leerMonto("119000")).toBe(119000);
    expect(leerMonto("119.000")).toBe(119000);
    expect(leerMonto("119.000,00")).toBe(119000);
    expect(leerMonto("$ 1.234.567")).toBe(1234567);
    expect(leerMonto("-5000")).toBe(-5000);
    expect(leerMonto("")).toBe(0);
    expect(leerMonto("abc")).toBeNull();
  });
});

describe("leerFecha", () => {
  it("entiende dd/mm/aaaa y aaaa-mm-dd", () => {
    expect(leerFecha("05/09/2026")).toBe("2026-09-05");
    expect(leerFecha("5-9-2026")).toBe("2026-09-05");
    expect(leerFecha("2026-09-05")).toBe("2026-09-05");
    expect(leerFecha("ayer")).toBeNull();
  });
});

describe("parsearRcv", () => {
  it("lee un registro de compras real", () => {
    const csv =
      "﻿" +
      COMPRAS +
      "1;33;Del Giro;77198288-3;DULCE PAN SPA;000123;27/08/2026;27/08/2026 10:11:12;;0;100000;19000;0;;119000;0;0;0;0;0;0;0;0;0;;;\n" +
      "2;61;Del Giro;78.306.534-7;TEQUEÑITOS CHILE SPA;55;28/08/2026;28/08/2026;;0;10000;1900;0;;11900;0;0;0;0;0;0;0;0;0;27;1800;18\n" +
      ";;;;;;;;;;;;;;;;;;;;;;;;;;\n";
    const { filas, errores } = parsearRcv(csv);
    expect(errores).toEqual([]);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({
      tipo: "33",
      folio: "123",
      rut: "77198288-3",
      razonSocial: "DULCE PAN SPA",
      fecha: "2026-08-27",
      neto: 100000,
      iva: 19000,
      total: 119000,
    });
    expect(filas[1]).toMatchObject({ tipo: "61", rut: "78306534-7", otrosImpuestos: 1800 });
  });

  it("reporta la fila mala y sigue con las demás", () => {
    const csv =
      COMPRAS +
      "1;99;Del Giro;1-9;X;1;01/08/2026;;;0;1;0;0;;1\n" +
      "2;33;Del Giro;1-9;X;abc;01/08/2026;;;0;1;0;0;;1\n" +
      "3;33;Del Giro;1-9;X;7;01/08/2026;;;0;mil;0;0;;1\n" +
      "4;33;Del Giro;1-9;X;8;01/08/2026;;;0;1000;190;0;;1190\n";
    const { filas, errores } = parsearRcv(csv);
    expect(filas.map((f) => f.folio)).toEqual(["8"]);
    expect(errores.map((e) => e.linea)).toEqual([2, 3, 4]);
  });

  it("rechaza un archivo que no es del SII", () => {
    const { filas, errores } = parsearRcv("nombre;precio\npan;1000\n");
    expect(filas).toEqual([]);
    expect(errores[0].motivo).toContain("No parece un Registro");
  });

  it("lee también el registro de ventas", () => {
    const csv =
      "Nro;Tipo Doc;Tipo Venta;Rut cliente;Razon Social;Folio;Fecha Docto;Fecha Recepcion;Fecha Acuse Recibo;Fecha Reclamo;Monto Exento;Monto Neto;Monto IVA;Monto total\n" +
      "1;33;Del Giro;76.123.456-0;OFICINA SPA;10;02/09/2026;;;;0;50000;9500;59500\n";
    const { filas } = parsearRcv(csv);
    expect(filas[0]).toMatchObject({ tipo: "33", rut: "76123456-0", iva: 9500, total: 59500 });
  });

  it("un archivo vacío no revienta", () => {
    expect(parsearRcv("").errores[0].motivo).toContain("vacío");
  });
});
