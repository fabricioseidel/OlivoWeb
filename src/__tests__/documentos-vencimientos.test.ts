import { describe, expect, it } from "vitest";
import {
  diaHabilAnterior,
  diasEntre,
  fechaCorta,
  hoyEnChile,
  limitesPeriodo,
  nombrePeriodo,
  obligacionesEntre,
  periodoSiguiente,
  siguienteDiaHabil,
  textoPlazo,
  urgencia,
  vencimientoF29,
  vencimientoPrevired,
} from "@/lib/documentos/vencimientos";

describe("siguienteDiaHabil", () => {
  it("deja igual un día hábil", () => {
    expect(siguienteDiaHabil("2026-10-20")).toBe("2026-10-20"); // martes
  });

  it("corre el fin de semana al lunes", () => {
    expect(siguienteDiaHabil("2026-09-20")).toBe("2026-09-21"); // domingo → lunes
    expect(siguienteDiaHabil("2026-12-19")).toBe("2026-12-21"); // sábado → lunes
  });

  it("sigue corriendo si el lunes también es feriado", () => {
    expect(siguienteDiaHabil("2026-10-10")).toBe("2026-10-13"); // sáb, dom, lun 12 feriado
  });

  it("salta feriados seguidos", () => {
    expect(siguienteDiaHabil("2026-09-18")).toBe("2026-09-21"); // 18 y 19 feriados, 20 domingo
  });
});

describe("vencimientos del mes siguiente", () => {
  it("F29 vence el 20; si cae domingo, el lunes", () => {
    expect(vencimientoF29("2026-09")).toBe("2026-10-20");
    expect(vencimientoF29("2026-08")).toBe("2026-09-21");
    expect(vencimientoF29("2026-11")).toBe("2026-12-21");
  });

  it("Previred vence el 13 aunque caiga domingo: pagando en línea no se corre", () => {
    expect(vencimientoPrevired("2026-09")).toBe("2026-10-13");
    expect(vencimientoPrevired("2026-11")).toBe("2026-12-13");
  });

  it("si el 13 no es hábil, sugiere pagar el hábil anterior", () => {
    const [previred] = obligacionesEntre("2026-12-01", "2026-12-13");
    expect(previred.tipo).toBe("PREVIRED");
    expect(previred.vence).toBe("2026-12-13"); // domingo
    expect(previred.pagarAntesDel).toBe("2026-12-11"); // viernes
    expect(diaHabilAnterior("2026-10-12")).toBe("2026-10-09"); // feriado lunes → viernes
  });

  it("diciembre se paga en enero del año siguiente", () => {
    expect(periodoSiguiente("2026-12")).toBe("2027-01");
    expect(periodoSiguiente("2027-01", -1)).toBe("2026-12");
    expect(vencimientoF29("2026-12")).toBe("2027-01-20");
  });
});

describe("obligacionesEntre", () => {
  it("lista en orden lo que vence en el rango", () => {
    const lista = obligacionesEntre("2026-09-25", "2026-10-31");
    expect(lista.map((o) => `${o.tipo}:${o.periodo}:${o.vence}`)).toEqual([
      "PREVIRED:2026-09:2026-10-13",
      "F29:2026-09:2026-10-20",
    ]);
  });

  it("incluye las cuotas de patente y la renta", () => {
    const lista = obligacionesEntre("2027-01-01", "2027-08-31");
    // 31-01-2027 es domingo y 31-07-2027 sábado: se corren al lunes.
    expect(lista.filter((o) => o.tipo === "PATENTE").map((o) => o.vence)).toEqual(["2027-02-01", "2027-08-02"]);
    expect(lista.find((o) => o.tipo === "F22")?.vence).toBe("2027-04-30");
  });
});

describe("plazos", () => {
  it("cuenta días y arma el semáforo", () => {
    expect(diasEntre("2026-09-25", "2026-10-13")).toBe(18);
    expect(urgencia("2026-10-12", "2026-10-13")).toBe("urgente");
    expect(urgencia("2026-10-06", "2026-10-13")).toBe("proximo");
    expect(urgencia("2026-09-25", "2026-10-13")).toBe("tranquilo");
    expect(urgencia("2026-10-14", "2026-10-13")).toBe("vencido");
  });

  it("dice el plazo en palabras", () => {
    expect(textoPlazo("2026-10-13", "2026-10-13")).toBe("vence hoy");
    expect(textoPlazo("2026-10-12", "2026-10-13")).toBe("vence mañana");
    expect(textoPlazo("2026-10-15", "2026-10-13")).toBe("venció hace 2 días");
  });

  it("usa formatos chilenos", () => {
    expect(fechaCorta("2026-10-20")).toBe("20-10-2026");
    expect(nombrePeriodo("2026-09")).toBe("septiembre 2026");
  });

  it("el mes chileno empieza a medianoche de Santiago", () => {
    // Septiembre 2026: horario de verano desde el 6-sep (UTC-3); agosto en UTC-4.
    expect(limitesPeriodo("2026-09")).toEqual({
      desde: "2026-09-01T04:00:00.000Z",
      hasta: "2026-10-01T03:00:00.000Z",
    });
  });

  it("toma el día de Chile, no el de UTC", () => {
    // 02:00 UTC del 26 es todavía el 25 en Santiago.
    expect(hoyEnChile(new Date("2026-09-26T02:00:00Z"))).toBe("2026-09-25");
  });
});
