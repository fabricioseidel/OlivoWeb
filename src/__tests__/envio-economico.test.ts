/**
 * Envío económico: las ventanas de reparto y su precio.
 *
 * Las fechas son reales y elegidas por su día de la semana: 2024-01-01 fue
 * lunes, 2024-01-06 sábado y 2024-01-07 domingo.
 */
import { describe, it, expect } from "vitest";
import {
  slotsEconomicosForDate,
  primeraFechaEconomica,
  economicoSlotEsValido,
  ventanaEconomicaPublicable,
  CORTE_ECONOMICO_MIN,
} from "@/lib/delivery-slots";
import {
  quoteEconomico,
  dentroDeZonaDeReparto,
  radioEfectivo,
  TARIFA_ECONOMICO_CLP,
  RADIO_DESPACHO_KM_DEFAULT,
} from "@/lib/shipping-policy";

const LUNES = "2024-01-01";
const VIERNES = "2024-01-05";
const SABADO = "2024-01-06";
const DOMINGO = "2024-01-07";

const min = (h: number, m = 0) => h * 60 + m;

describe("ventanas del envío económico", () => {
  it("de lunes a viernes ofrece una sola ronda, 08:00 a 12:00", () => {
    for (const dia of [LUNES, VIERNES]) {
      const slots = slotsEconomicosForDate(dia);
      expect(slots).toHaveLength(1);
      expect(slots[0].id).toBe("08:00-12:00");
    }
  });

  it("el sábado la recorta a 10:00, que es cuando abre el local", () => {
    // La ventana nominal empieza 08:00, pero el fin de semana el local abre a
    // las 10:00 y los pedidos salen de ahí. Sin este recorte prometeríamos una
    // entrega a las 08:00 con la cortina baja.
    const slots = slotsEconomicosForDate(SABADO);
    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe("10:00-12:00");
  });

  it("el domingo ofrece dos rondas, mañana y tarde", () => {
    const slots = slotsEconomicosForDate(DOMINGO);
    expect(slots.map((s) => s.id)).toEqual(["10:00-14:00", "14:00-18:00"]);
  });

  it("ninguna ventana se sale del horario de atención del local", () => {
    for (const dia of [LUNES, VIERNES, SABADO, DOMINGO]) {
      for (const slot of slotsEconomicosForDate(dia)) {
        expect(slot.startMin).toBeGreaterThanOrEqual(min(7, 45));
        expect(slot.endMin).toBeLessThanOrEqual(min(20, 30));
      }
    }
  });
});

describe("corte de las 22:30", () => {
  it("un pedido durante el turno sale a la mañana siguiente", () => {
    expect(primeraFechaEconomica(LUNES, min(10))).toBe("2024-01-02");
    expect(primeraFechaEconomica(LUNES, min(22, 29))).toBe("2024-01-02");
  });

  it("pasado el cierre del turno se corre un día", () => {
    // A las 22:30 el dueño ya cerró: el pedido no alcanza a prepararse esta
    // noche, así que la ronda que lo lleva es la del día subsiguiente.
    expect(primeraFechaEconomica(LUNES, CORTE_ECONOMICO_MIN)).toBe("2024-01-03");
    expect(primeraFechaEconomica(LUNES, min(23, 30))).toBe("2024-01-03");
  });

  it("nunca ofrece el mismo día, ni de madrugada", () => {
    // A las 02:00 la ronda de las 08:00 todavía no salió, pero el pedido no
    // pasó por ningún turno: no hay nadie que lo haya preparado.
    expect(primeraFechaEconomica(LUNES, min(2))).not.toBe(LUNES);
    expect(economicoSlotEsValido(LUNES, "08:00-12:00", LUNES, min(2))).toBe(false);
  });

  it("acepta una fecha y bloque que sí existen, y rechaza los que no", () => {
    expect(economicoSlotEsValido("2024-01-02", "08:00-12:00", LUNES, min(10))).toBe(true);
    // El bloque del domingo no existe un martes.
    expect(economicoSlotEsValido("2024-01-02", "14:00-18:00", LUNES, min(10))).toBe(false);
    // Una fecha anterior a la primera ofrecible no se acepta aunque el bloque exista.
    expect(economicoSlotEsValido(LUNES, "08:00-12:00", LUNES, min(10))).toBe(false);
  });
});

describe("precio del envío económico", () => {
  const dentro = { distanceKm: 2, ciudad: "Ñuñoa" };

  it("cobra la tarifa plana sin importar la distancia dentro de la zona", () => {
    const cerca = quoteEconomico({ ...dentro, distanceKm: 0.5, subtotal: 10000, freeShippingMinimum: null });
    const lejos = quoteEconomico({ ...dentro, distanceKm: 7.9, subtotal: 10000, freeShippingMinimum: null });
    expect(cerca.price).toBe(TARIFA_ECONOMICO_CLP);
    expect(lejos.price).toBe(TARIFA_ECONOMICO_CLP);
  });

  it("es gratis desde el mínimo, y no un peso antes", () => {
    const justoAbajo = quoteEconomico({ ...dentro, subtotal: 34999, freeShippingMinimum: 35000 });
    const justo = quoteEconomico({ ...dentro, subtotal: 35000, freeShippingMinimum: 35000 });
    expect(justoAbajo.price).toBe(TARIFA_ECONOMICO_CLP);
    expect(justoAbajo.freeApplied).toBe(false);
    expect(justo.price).toBe(0);
    expect(justo.freeApplied).toBe(true);
    // La tarifa original se conserva para poder tacharla en la tarjeta.
    expect(justo.rawPrice).toBe(TARIFA_ECONOMICO_CLP);
  });

  it("con la regla apagada nunca regala el envío", () => {
    const q = quoteEconomico({ ...dentro, subtotal: 500000, freeShippingMinimum: null });
    expect(q.price).toBe(TARIFA_ECONOMICO_CLP);
    expect(q.freeApplied).toBe(false);
  });

  it("no se ofrece fuera de la zona de reparto, ni siquiera con carro grande", () => {
    // Sin quien reparta, el envío gratis no puede "activarse" y dejar el
    // pedido en 0: la modalidad entera tiene que desaparecer.
    const q = quoteEconomico({ distanceKm: 12, ciudad: "Maipú", subtotal: 90000, freeShippingMinimum: 35000 });
    expect(q.disponible).toBe(false);
    expect(q.freeApplied).toBe(false);
  });

  it("manda la distancia por sobre el nombre de la comuna", () => {
    // El buscador de direcciones suele devolver "Santiago" o "Región
    // Metropolitana" en vez de la comuna. Con coordenadas eso no importa.
    const q = quoteEconomico({ distanceKm: 2, ciudad: "Región Metropolitana", subtotal: 40000, freeShippingMinimum: 35000 });
    expect(q.disponible).toBe(true);
    expect(q.price).toBe(0);
  });
});

describe("zona de reparto", () => {
  it("usa el radio del admin cuando existe, y el de por defecto si no", () => {
    expect(radioEfectivo(null)).toBe(RADIO_DESPACHO_KM_DEFAULT);
    expect(radioEfectivo(0)).toBe(RADIO_DESPACHO_KM_DEFAULT);
    expect(radioEfectivo(5)).toBe(5);
  });

  it("sin distancia se cae al nombre de la comuna", () => {
    expect(dentroDeZonaDeReparto({ comuna: "nunoa" })).toBe(true);
    expect(dentroDeZonaDeReparto({ comuna: null })).toBe(false);
  });
});

describe("texto publicable", () => {
  it("se deriva de las ventanas reales, no se escribe a mano", () => {
    const v = ventanaEconomicaPublicable();
    expect(v.semana).toBe("08:00 a 12:00");
    expect(v.domingo).toBe("10:00 a 14:00 y 14:00 a 18:00");
  });
});
