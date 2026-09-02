/**
 * Qué opciones de envío ve el cliente.
 *
 * El caso que motiva el módulo: el flash estaba atado a que el agendado
 * estuviera disponible, con un `return` temprano dentro del `useMemo` del
 * checkout. Una dirección más lejos que la ronda propia pero dentro de la
 * cobertura de Uber no veía ninguna opción de envío — que es exactamente el
 * caso para el que el flash existe.
 */
import { describe, it, expect } from "vitest";
import {
  armarOpcionesDeEnvio,
  avisoFlashNoDisponible,
  type DisponibilidadEnvio,
} from "@/lib/shipping-methods";

const RETIRO = [
  { id: "pickup", name: "Retirar en Tienda (Ñuñoa)", price: 0, days: "Te avisamos por correo" },
];

const VENTANA = { semana: "08:00 a 12:00", finDeSemana: "10:00 a 12:00 y 14:00 a 18:00" };

const cotizado = (price: number, freeApplied = false) => ({
  disponible: true, price, rawPrice: price, freeApplied,
});
const noDisponible = { disponible: false, price: 0, rawPrice: 0, freeApplied: false };

const base = (over: Partial<DisponibilidadEnvio> = {}): DisponibilidadEnvio => ({
  agendado: null, flash: null, ventanaAgendado: VENTANA, ...over,
});

const ids = (d: DisponibilidadEnvio) => armarOpcionesDeEnvio(d, RETIRO).map((o) => o.id);

describe("las modalidades son independientes de verdad", () => {
  it("ofrece el flash aunque el agendado no llegue a esa dirección", () => {
    // El bug original: a 7 km, fuera del reparto propio pero dentro de Uber,
    // el cliente sólo veía retiro en tienda.
    expect(ids(base({ agendado: noDisponible, flash: cotizado(4726) }))).toEqual([
      "flash",
      "pickup",
    ]);
  });

  it("ofrece el agendado aunque Uber no esté disponible", () => {
    // Tienda cerrada, sin cobertura o Uber por encima del tope.
    expect(ids(base({ agendado: cotizado(1500), flash: noDisponible }))).toEqual([
      "agendado",
      "pickup",
    ]);
  });

  it("ofrece las dos cuando las dos están, con el flash primero", () => {
    // El orden es de más rápida a más lenta: quien tiene apuro la encuentra
    // arriba, y quien mira el precio ve la barata en segundo lugar.
    expect(ids(base({ agendado: cotizado(1500), flash: cotizado(3384) }))).toEqual([
      "flash",
      "agendado",
      "pickup",
    ]);
  });

  it("con ninguna disponible queda sólo el retiro", () => {
    expect(ids(base({ agendado: noDisponible, flash: noDisponible }))).toEqual(["pickup"]);
  });

  it("una cotización que todavía no llegó no bloquea a la otra", () => {
    // `null` es "no se pudo cotizar", que no es lo mismo que "no disponible".
    expect(ids(base({ agendado: null, flash: cotizado(3384) }))).toEqual(["flash", "pickup"]);
    expect(ids(base({ agendado: cotizado(1500), flash: null }))).toEqual(["agendado", "pickup"]);
  });
});

describe("lo que dice cada tarjeta", () => {
  it("el flash informa el tiempo cuando Uber lo dio", () => {
    const [flash] = armarOpcionesDeEnvio(
      base({ flash: cotizado(3384), etaFlashMin: 57 }),
      RETIRO
    );
    expect(flash.days).toContain("57 minutos");
  });

  it("sin ETA no inventa un tiempo exacto", () => {
    const [flash] = armarOpcionesDeEnvio(
      base({ flash: cotizado(3384), etaFlashMin: null }),
      RETIRO
    );
    expect(flash.days).toContain("menos de una hora");
    expect(flash.days).not.toMatch(/\d+ minutos/);
  });

  it("el agendado publica las ventanas reales, no un texto escrito a mano", () => {
    const [agendado] = armarOpcionesDeEnvio(base({ agendado: cotizado(1500) }), RETIRO);
    expect(agendado.days).toContain(VENTANA.semana);
    expect(agendado.days).toContain(VENTANA.finDeSemana);
  });

  it("con envío gratis muestra la tarifa tachada, en las dos modalidades", () => {
    const [flash, agendado] = armarOpcionesDeEnvio(
      base({ agendado: cotizado(1500, true), flash: cotizado(4726, true) }),
      RETIRO
    );
    expect(flash.price).toBe(4726);
    expect(flash.originalPrice).toBe(4726);
    expect(agendado.originalPrice).toBe(1500);
  });

  it("sin envío gratis no hay precio tachado", () => {
    const [agendado] = armarOpcionesDeEnvio(base({ agendado: cotizado(1500) }), RETIRO);
    expect(agendado.originalPrice).toBeUndefined();
  });
});

describe("por qué no está el flash", () => {
  const horario = { semana: "de 07:45 a 20:30", finDeSemana: "de 10:00 a 18:00" };

  it("con la tienda cerrada le dice el horario, no lo deja adivinando", () => {
    // Es el caso que hizo perder tiempo: la opción desaparecía y no había cómo
    // saber que el envío rápido existe. El cliente se iba creyendo que lo más
    // rápido era la entrega de mañana.
    const aviso = avisoFlashNoDisponible("tienda-cerrada", horario);
    expect(aviso).toContain("07:45");
    expect(aviso).toContain("20:30");
  });

  it("explica el pico de demanda sin echarle la culpa a Uber", () => {
    expect(avisoFlashNoDisponible("sobre-el-tope", horario)).toMatch(/alta demanda/i);
  });

  it("sin cobertura ofrece la alternativa en vez de dejarlo en la nada", () => {
    expect(avisoFlashNoDisponible("sin-cobertura", horario)).toMatch(/ronda de reparto/i);
  });

  it("no le nombra el flash a quien no lo tiene configurado", () => {
    // Si la tienda no tiene Uber, mencionarle un servicio que no existe sólo
    // genera la pregunta de por qué no puede usarlo.
    expect(avisoFlashNoDisponible("no-configurado", horario)).toBeNull();
    expect(avisoFlashNoDisponible(null, horario)).toBeNull();
    expect(avisoFlashNoDisponible(undefined, horario)).toBeNull();
  });
});
