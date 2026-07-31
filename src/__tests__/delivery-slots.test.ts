import { describe, expect, it } from "vitest";
import {
  SAME_DAY_CUTOFF_HOUR,
  firstSelectableDate,
  openingHoursFor,
  sameDaySlotIsAllowed,
  slotMatches,
  slotsForDate,
} from "@/lib/delivery-slots";

// 2026-08-03 = lunes, 2026-08-08 = sábado, 2026-08-09 = domingo.
const LUNES = "2026-08-03";
const VIERNES = "2026-08-07";
const SABADO = "2026-08-08";
const DOMINGO = "2026-08-09";

describe("openingHoursFor", () => {
  it("usa el horario de semana de lunes a viernes", () => {
    expect(openingHoursFor(LUNES)).toEqual({ opens: "07:45", closes: "20:30" });
    expect(openingHoursFor(VIERNES)).toEqual({ opens: "07:45", closes: "20:30" });
  });

  it("usa el horario reducido del fin de semana", () => {
    expect(openingHoursFor(SABADO)).toEqual({ opens: "10:00", closes: "18:00" });
    expect(openingHoursFor(DOMINGO)).toEqual({ opens: "10:00", closes: "18:00" });
  });
});

describe("slotsForDate", () => {
  it("entre semana recorta el último bloque a la hora de cierre", () => {
    const ids = slotsForDate(LUNES).map((s) => s.id);
    expect(ids).toEqual(["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-20:30"]);
  });

  it("no ofrece entregas después del cierre entre semana", () => {
    const ultimo = slotsForDate(LUNES).at(-1)!;
    expect(ultimo.endMin).toBe(20 * 60 + 30);
  });

  it("el fin de semana empieza a las 10:00 y termina a las 18:00", () => {
    const ids = slotsForDate(SABADO).map((s) => s.id);
    expect(ids).toEqual(["10:00-12:00", "12:00-15:00", "15:00-18:00"]);
  });

  it("no ofrece bloques con el local cerrado", () => {
    for (const fecha of [LUNES, SABADO, DOMINGO]) {
      const horario = openingHoursFor(fecha)!;
      const abre = Number(horario.opens.split(":")[0]) * 60 + Number(horario.opens.split(":")[1]);
      const cierra = Number(horario.closes.split(":")[0]) * 60 + Number(horario.closes.split(":")[1]);
      for (const slot of slotsForDate(fecha)) {
        expect(slot.startMin).toBeGreaterThanOrEqual(abre);
        expect(slot.endMin).toBeLessThanOrEqual(cierra);
      }
    }
  });
});

describe("slotMatches", () => {
  it("reconoce el identificador viejo de un bloque recortado", () => {
    const ultimo = slotsForDate(LUNES).at(-1)!;
    // Pedidos agendados antes del recorte guardaron "18:00-21:00".
    expect(slotMatches(ultimo, "18:00-21:00")).toBe(true);
    expect(slotMatches(ultimo, "18:00-20:30")).toBe(true);
  });

  it("no confunde bloques distintos", () => {
    const primero = slotsForDate(LUNES)[0];
    expect(slotMatches(primero, "12:00-15:00")).toBe(false);
    expect(slotMatches(primero, null)).toBe(false);
  });
});

describe("sameDaySlotIsAllowed", () => {
  const slots = slotsForDate(LUNES);

  it("antes del corte solo admite el último bloque del día", () => {
    const permitidos = slots.filter((s) => sameDaySlotIsAllowed(s, slots, 9));
    expect(permitidos.map((s) => s.id)).toEqual(["18:00-20:30"]);
  });

  it("pasada la hora de corte no admite ninguno", () => {
    const permitidos = slots.filter((s) => sameDaySlotIsAllowed(s, slots, SAME_DAY_CUTOFF_HOUR));
    expect(permitidos).toHaveLength(0);
  });
});

describe("firstSelectableDate", () => {
  it("propone hoy cuando todavía se alcanza el bloque del mismo día", () => {
    expect(firstSelectableDate(LUNES, 9)).toBe(LUNES);
  });

  it("pasada la hora de corte propone el día siguiente, no hoy", () => {
    // Este era el callejón: el formulario preseleccionaba hoy y no había
    // ningún bloque disponible.
    expect(firstSelectableDate(LUNES, 15)).toBe("2026-08-04");
  });

  it("cruza el fin de mes sin romperse", () => {
    expect(firstSelectableDate("2026-08-31", 18)).toBe("2026-09-01");
  });
});
