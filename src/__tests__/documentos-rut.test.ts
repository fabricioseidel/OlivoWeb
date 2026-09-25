import { describe, expect, it } from "vitest";
import { digitoVerificador, formatearRut, normalizarRut, rutValido } from "@/lib/documentos/rut";

describe("RUT", () => {
  it("calcula el dígito verificador, incluidos el 0 y la K", () => {
    expect(digitoVerificador("78002865")).toBe("3"); // Inversiones El Olivo SpA
    expect(digitoVerificador("77198288")).toBe("3"); // Dulce Pan
    expect(digitoVerificador("90703000")).toBe("8"); // Nestlé
    expect(digitoVerificador("11111111")).toBe("1");
    expect(digitoVerificador("10000013")).toBe("K");
  });

  it("guarda una sola forma sin importar cómo se escribió", () => {
    expect(normalizarRut("78.002.865-3")).toBe("78002865-3");
    expect(normalizarRut("780028653")).toBe("78002865-3");
    expect(normalizarRut(" 10.000.013-k ")).toBe("10000013-K");
    expect(normalizarRut("0078002865-3")).toBe("78002865-3");
  });

  it("rechaza lo que no es un RUT", () => {
    expect(normalizarRut("")).toBeNull();
    expect(normalizarRut(null)).toBeNull();
    expect(normalizarRut("K")).toBeNull();
    expect(normalizarRut("12K45678-9")).toBeNull();
  });

  it("valida el dígito verificador", () => {
    expect(rutValido("78.002.865-3")).toBe(true);
    expect(rutValido("78.002.865-4")).toBe(false);
    expect(rutValido("10000013-k")).toBe(true);
  });

  it("formatea con puntos para mostrar", () => {
    expect(formatearRut("780028653")).toBe("78.002.865-3");
    expect(formatearRut("1-9")).toBe("1-9");
    expect(formatearRut("no es rut")).toBe("no es rut");
  });
});
