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
  quoteAgendado,
  dentroDeZonaDeReparto,
  radioEfectivo,
  TARIFA_ZONA_PLANA_CLP,
  RADIO_ZONA_PLANA_KM,
  RADIO_DESPACHO_KM_DEFAULT,
  FACTOR_CALLES,
  radioDibujableMetros,
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

  it("sábado y domingo ofrecen dos rondas, mañana y tarde", () => {
    // Empiezan a las 10:00 y no a las 08:00 porque el fin de semana el local
    // abre a esa hora y los pedidos salen de ahí.
    for (const dia of [SABADO, DOMINGO]) {
      expect(slotsEconomicosForDate(dia).map((s) => s.id)).toEqual([
        "10:00-12:00",
        "14:00-18:00",
      ]);
    }
  });

  it("cubre los siete días de la semana", () => {
    // El reparto propio es la opción de base: si algún día quedara sin ronda,
    // ese día el cliente sólo podría pagar el flash o retirar en tienda.
    for (let i = 0; i < 7; i++) {
      const dia = `2024-01-0${i + 1}`;
      expect(slotsEconomicosForDate(dia).length).toBeGreaterThan(0);
    }
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
    // El bloque de la tarde sólo existe el fin de semana, no un martes.
    expect(economicoSlotEsValido("2024-01-02", "14:00-18:00", LUNES, min(10))).toBe(false);
    // Una fecha anterior a la primera ofrecible no se acepta aunque el bloque exista.
    expect(economicoSlotEsValido(LUNES, "08:00-12:00", LUNES, min(10))).toBe(false);
  });
});

describe("precio del despacho agendado", () => {
  const base = { subtotal: 10000, freeShippingMinimum: null, ciudad: "Ñuñoa", rawPrice: 4200 };

  it("cobra la tarifa plana dentro de la zona cercana", () => {
    for (const km of [0.2, 1, 2]) {
      const q = quoteAgendado({ ...base, distanceKm: km });
      expect(q.price).toBe(TARIFA_ZONA_PLANA_CLP);
      expect(q.tarifaPlana).toBe(true);
    }
  });

  it("pasada la zona plana vuelve el cálculo por distancia", () => {
    const q = quoteAgendado({ ...base, distanceKm: 4, rawPrice: 4200 });
    expect(q.price).toBe(4200);
    expect(q.tarifaPlana).toBe(false);
  });

  it("el borde de la zona plana entra en la tarifa plana, y un metro más no", () => {
    expect(quoteAgendado({ ...base, distanceKm: RADIO_ZONA_PLANA_KM }).tarifaPlana).toBe(true);
    expect(quoteAgendado({ ...base, distanceKm: RADIO_ZONA_PLANA_KM + 0.001 }).tarifaPlana).toBe(false);
  });

  it("no cobra por distancia menos que la tarifa plana sin querer", () => {
    // Si el cálculo por distancia diera menos que la plana justo afuera de la
    // zona, alguien a 2,1 km pagaría menos que alguien a 1,9. No debería
    // pasar con la tarifa configurada, pero si pasa es un error de datos y no
    // una promoción: se deja visible en vez de disimularlo.
    const justoAfuera = quoteAgendado({ ...base, distanceKm: 2.1, rawPrice: 800 });
    expect(justoAfuera.price).toBe(800);
    expect(justoAfuera.tarifaPlana).toBe(false);
  });

  it("es gratis desde el mínimo, y no un peso antes", () => {
    const abajo = quoteAgendado({ ...base, distanceKm: 1, subtotal: 29999, freeShippingMinimum: 30000 });
    const justo = quoteAgendado({ ...base, distanceKm: 1, subtotal: 30000, freeShippingMinimum: 30000 });
    expect(abajo.price).toBe(TARIFA_ZONA_PLANA_CLP);
    expect(abajo.freeApplied).toBe(false);
    expect(justo.price).toBe(0);
    expect(justo.freeApplied).toBe(true);
    // La tarifa original se conserva para poder tacharla en la tarjeta.
    expect(justo.rawPrice).toBe(TARIFA_ZONA_PLANA_CLP);
  });

  it("el envío gratis también alcanza a la franja por distancia", () => {
    const q = quoteAgendado({ ...base, distanceKm: 5, rawPrice: 5000, subtotal: 30000, freeShippingMinimum: 30000 });
    expect(q.price).toBe(0);
    expect(q.rawPrice).toBe(5000);
  });

  it("con la regla apagada nunca regala el envío", () => {
    const q = quoteAgendado({ ...base, distanceKm: 1, subtotal: 500000, freeShippingMinimum: null });
    expect(q.price).toBe(TARIFA_ZONA_PLANA_CLP);
    expect(q.freeApplied).toBe(false);
  });

  it("no se ofrece pasado el radio máximo, ni siquiera con carro grande", () => {
    // Sin quien reparta, el envío gratis no puede "activarse" y dejar el
    // pedido en 0: la modalidad entera tiene que desaparecer.
    const q = quoteAgendado({
      rawPrice: 9000, distanceKm: 12, ciudad: "Maipú",
      subtotal: 90000, freeShippingMinimum: 30000,
    });
    expect(q.disponible).toBe(false);
    expect(q.freeApplied).toBe(false);
  });

  it("el radio máximo por defecto son 6 km", () => {
    expect(quoteAgendado({ ...base, distanceKm: 5.9 }).disponible).toBe(true);
    expect(quoteAgendado({ ...base, distanceKm: 6.1 }).disponible).toBe(false);
  });

  it("manda la distancia por sobre el nombre de la comuna", () => {
    // El buscador de direcciones suele devolver "Santiago" o "Región
    // Metropolitana" en vez de la comuna. Con coordenadas eso no importa.
    const q = quoteAgendado({
      rawPrice: 3000, distanceKm: 1.5, ciudad: "Región Metropolitana",
      subtotal: 30000, freeShippingMinimum: 30000,
    });
    expect(q.disponible).toBe(true);
    expect(q.price).toBe(0);
  });

  it("sin distancia cobra la tarifa plana en vez de arriesgar cobrar de más", () => {
    const q = quoteAgendado({ ...base, distanceKm: null, rawPrice: 5000 });
    expect(q.disponible).toBe(true);
    expect(q.tarifaPlana).toBe(true);
    expect(q.price).toBe(TARIFA_ZONA_PLANA_CLP);
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
    expect(v.finDeSemana).toBe("10:00 a 12:00 y 14:00 a 18:00");
  });
});

describe("radios dibujables en el mapa", () => {
  it("deshace el factor de calles, para no prometer más cobertura que la real", () => {
    // 6 km de recorrido son 6/1,3 ≈ 4,62 km en línea recta. Dibujar 6.000 m
    // pintaría cobertura donde el checkout rechaza el pedido.
    expect(radioDibujableMetros(6)).toBeCloseTo(4615.4, 0);
    expect(radioDibujableMetros(2)).toBeCloseTo(1538.5, 0);
  });

  it("el círculo dibujado siempre es menor que el radio nominal", () => {
    for (const km of [1, 2, 4, 6, 8]) {
      expect(radioDibujableMetros(km)).toBeLessThan(km * 1000);
    }
  });

  it("una dirección en el borde del círculo dibujado sí es entregable", () => {
    // La comprobación real: el punto que el mapa muestra como límite tiene que
    // pasar la validación del checkout, no quedar justo afuera.
    const bordeDibujadoKm = radioDibujableMetros(RADIO_DESPACHO_KM_DEFAULT) / 1000;
    const distanciaQueVeElCheckout = bordeDibujadoKm * FACTOR_CALLES;
    expect(distanciaQueVeElCheckout).toBeLessThanOrEqual(RADIO_DESPACHO_KM_DEFAULT);
  });
});
