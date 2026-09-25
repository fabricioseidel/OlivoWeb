import { describe, expect, it } from "vitest";
import {
  estimarEmpleado,
  estimarImposiciones,
  tasaRetencionHonorarios,
  tasasConDefecto,
  TASAS_POR_DEFECTO,
} from "@/lib/documentos/imposiciones";

describe("estimarEmpleado", () => {
  it("contrato indefinido: descuentos del trabajador y aportes del empleador", () => {
    const d = estimarEmpleado({
      nombre: "Ana",
      sueldoImponible: 600_000,
      tipoContrato: "indefinido",
      afp: "Modelo",
    });
    expect(d.trabajador.afp).toBe(63_480); // 10,58%
    expect(d.trabajador.salud).toBe(42_000);
    expect(d.trabajador.cesantia).toBe(3_600);
    expect(d.empleador.cesantia).toBe(14_400);
    expect(d.empleador.mutual).toBe(5_580);
    expect(d.empleador.aporte).toBe(21_000);
    expect(d.totalPrevired).toBe(d.trabajador.total + d.empleador.total);
    expect(d.liquidoAproximado).toBe(600_000 - d.trabajador.total);
  });

  it("plazo fijo: el trabajador no paga cesantía y el empleador paga 3%", () => {
    const d = estimarEmpleado({ nombre: "Beto", sueldoImponible: 500_000, tipoContrato: "plazo_fijo", comisionAfp: 1 });
    expect(d.trabajador.cesantia).toBe(0);
    expect(d.empleador.cesantia).toBe(15_000);
    expect(d.trabajador.afp).toBe(55_000);
  });

  it("suma el adicional de Isapre", () => {
    const d = estimarEmpleado({ nombre: "C", sueldoImponible: 500_000, tipoContrato: "indefinido", adicionalSalud: 20_000 });
    expect(d.trabajador.salud).toBe(55_000);
  });
});

describe("estimarImposiciones", () => {
  it("totaliza la planilla", () => {
    const r = estimarImposiciones([
      { nombre: "A", sueldoImponible: 600_000, tipoContrato: "indefinido", comisionAfp: 1 },
      { nombre: "B", sueldoImponible: 400_000, tipoContrato: "indefinido", comisionAfp: 1 },
    ]);
    expect(r.imponible).toBe(1_000_000);
    expect(r.totalPrevired).toBe(r.detalle[0].totalPrevired + r.detalle[1].totalPrevired);
    expect(r.costoEmpresa).toBe(1_000_000 + r.empleador);
  });

  it("sin empleados, cero", () => {
    expect(estimarImposiciones([]).totalPrevired).toBe(0);
  });
});

describe("tasas", () => {
  it("completa con las por defecto e ignora valores inválidos", () => {
    const t = tasasConDefecto({ mutual: 1.5, sis: -1 } as never);
    expect(t.mutual).toBe(1.5);
    expect(t.sis).toBe(TASAS_POR_DEFECTO.sis);
    expect(tasasConDefecto(null)).toEqual(TASAS_POR_DEFECTO);
  });

  it("retención de honorarios por año", () => {
    expect(tasaRetencionHonorarios(2026)).toBe(15.25);
    expect(tasaRetencionHonorarios(2027)).toBe(16);
    expect(tasaRetencionHonorarios(2030)).toBe(17);
  });
});
