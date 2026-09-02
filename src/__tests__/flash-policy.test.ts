/**
 * Reglas del envío flash. Todo lo que decide si se ofrece y a cuánto.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  quoteFlash,
  revalidarFlash,
  feeUberACLP,
  TOPE_FLASH_CLP,
  MARGEN_REVALIDACION_FLASH,
} from "@/lib/flash-policy";
import { tiendaAbierta } from "@/lib/delivery-slots";

const LUNES = "2024-01-01";
const SABADO = "2024-01-06";
const min = (h: number, m = 0) => h * 60 + m;

describe("el fee de Uber viene en centavos", () => {
  it("divide por 100 aunque el peso chileno no tenga centavos", () => {
    // Medido contra la API real el 2026-08-28: 2 km desde el local.
    expect(feeUberACLP(338400)).toBe(3384);
    expect(feeUberACLP(295300)).toBe(2953);
    expect(feeUberACLP(472600)).toBe(4726);
  });

  it("las cotizaciones reales caen en el rango de un delivery, no en el de un vuelo", () => {
    // La comprobación que desambiguó la lectura: sin dividir, llevar un
    // paquete 2 km costaría $338.400.
    for (const crudo of [295300, 338400, 427500, 472600, 567500]) {
      const clp = feeUberACLP(crudo);
      expect(clp).toBeGreaterThan(1000);
      expect(clp).toBeLessThan(10000);
    }
  });
});

describe("cuándo se ofrece el flash", () => {
  const base = { subtotal: 10000, freeShippingMinimum: null, tiendaAbierta: true };

  it("con la tienda cerrada no se ofrece, aunque Uber cotice barato", () => {
    const q = quoteFlash({ ...base, costoUber: 3000, tiendaAbierta: false });
    expect(q.disponible).toBe(false);
    expect(q.motivo).toBe("tienda-cerrada");
  });

  it("la tienda cerrada manda por sobre cualquier otro motivo", () => {
    // Importa para no llamar a Uber de gusto: si el motivo fuera otro, el
    // llamador podría creer que vale la pena reintentar.
    const q = quoteFlash({ ...base, costoUber: null, tiendaAbierta: false });
    expect(q.motivo).toBe("tienda-cerrada");
  });

  it("sin cobertura de Uber no se ofrece", () => {
    const q = quoteFlash({ ...base, costoUber: null });
    expect(q.disponible).toBe(false);
    expect(q.motivo).toBe("sin-cobertura");
  });

  it("sobre el tope no se ofrece: es la protección contra los picos", () => {
    const q = quoteFlash({ ...base, costoUber: TOPE_FLASH_CLP + 1 });
    expect(q.disponible).toBe(false);
    expect(q.motivo).toBe("sobre-el-tope");
  });

  it("justo en el tope todavía se ofrece", () => {
    expect(quoteFlash({ ...base, costoUber: TOPE_FLASH_CLP }).disponible).toBe(true);
  });

  it("le cobra al cliente exactamente lo que cotiza Uber", () => {
    const q = quoteFlash({ ...base, costoUber: 4726 });
    expect(q.price).toBe(4726);
    expect(q.rawPrice).toBe(4726);
  });

  it("es gratis desde el mínimo del flash", () => {
    const abajo = quoteFlash({ ...base, costoUber: 4726, subtotal: 39999, freeShippingMinimum: 40000 });
    const justo = quoteFlash({ ...base, costoUber: 4726, subtotal: 40000, freeShippingMinimum: 40000 });
    expect(abajo.price).toBe(4726);
    expect(justo.price).toBe(0);
    expect(justo.freeApplied).toBe(true);
    // Se conserva lo que cuesta de verdad, para poder tacharlo en la tarjeta.
    expect(justo.rawPrice).toBe(4726);
  });

  it("un carro que alcanza el mínimo NO destraba el flash sobre el tope", () => {
    // Es el caso que protege la plata: si el envío gratis pudiera saltarse el
    // tope, un pico de lluvia regalaría un envío que se come el margen entero.
    const q = quoteFlash({ ...base, costoUber: 9000, subtotal: 40000, freeShippingMinimum: 40000 });
    expect(q.disponible).toBe(false);
    expect(q.freeApplied).toBe(false);
  });
});

describe("la segunda cotización, antes de cobrar", () => {
  it("respeta el precio que vio el cliente si subió poco", () => {
    const r = revalidarFlash({ precioMostrado: 3384, precioNuevo: 3500 });
    expect(r.aceptable).toBe(true);
    expect(r.precioACobrar).toBe(3384);
    expect(r.diferenciaAbsorbida).toBe(116);
  });

  it("en el borde del margen todavía se respeta", () => {
    const mostrado = 4000;
    const enElBorde = mostrado * (1 + MARGEN_REVALIDACION_FLASH);
    expect(revalidarFlash({ precioMostrado: mostrado, precioNuevo: enElBorde }).aceptable).toBe(true);
    expect(revalidarFlash({ precioMostrado: mostrado, precioNuevo: enElBorde + 1 }).aceptable).toBe(false);
  });

  it("si se disparó, no se cobra: hay que avisarle", () => {
    const r = revalidarFlash({ precioMostrado: 3384, precioNuevo: 8000 });
    expect(r.aceptable).toBe(false);
    expect(r.diferenciaAbsorbida).toBe(0);
  });

  it("si bajó, igual se le cobra lo que vio y no menos", () => {
    // Cobrar menos de lo mostrado suena generoso, pero descuadra el total que
    // el cliente ya aceptó y el pedido que se le manda a MercadoPago.
    const r = revalidarFlash({ precioMostrado: 4000, precioNuevo: 3000 });
    expect(r.aceptable).toBe(true);
    expect(r.precioACobrar).toBe(4000);
    expect(r.diferenciaAbsorbida).toBe(0);
  });
});

describe("tienda abierta (regla 3)", () => {
  it("entre semana abre 07:45 y cierra 20:30", () => {
    expect(tiendaAbierta(LUNES, min(7, 44))).toBe(false);
    expect(tiendaAbierta(LUNES, min(7, 45))).toBe(true);
    expect(tiendaAbierta(LUNES, min(20, 29))).toBe(true);
    // Justo al cierre ya no: no alcanza a entregarle el paquete al repartidor.
    expect(tiendaAbierta(LUNES, min(20, 30))).toBe(false);
  });

  it("el fin de semana el horario es más corto", () => {
    expect(tiendaAbierta(SABADO, min(9))).toBe(false);
    expect(tiendaAbierta(SABADO, min(10))).toBe(true);
    expect(tiendaAbierta(SABADO, min(18))).toBe(false);
  });

  it("de madrugada nunca está abierta", () => {
    for (const dia of [LUNES, SABADO]) {
      expect(tiendaAbierta(dia, min(3))).toBe(false);
    }
  });
});

describe("la excepción de horario para pruebas", () => {
  const original = process.env.UBER_DIRECT_IGNORE_STORE_HOURS;
  afterEach(() => {
    if (original === undefined) delete process.env.UBER_DIRECT_IGNORE_STORE_HOURS;
    else process.env.UBER_DIRECT_IGNORE_STORE_HOURS = original;
  });

  it("está apagada mientras nadie la encienda", async () => {
    // Lo importante: por defecto la regla 3 rige. Una versión anterior tenía
    // un `|| true` fijo que la dejaba desactivada siempre, en producción y
    // para todos los clientes.
    delete process.env.UBER_DIRECT_IGNORE_STORE_HOURS;
    const { horarioIgnorado } = await import("@/lib/flash-policy");
    expect(horarioIgnorado()).toBe(false);
  });

  it("se enciende sólo con el valor exacto", async () => {
    const { horarioIgnorado } = await import("@/lib/flash-policy");
    process.env.UBER_DIRECT_IGNORE_STORE_HOURS = "true";
    expect(horarioIgnorado()).toBe(true);

    // Cualquier otra cosa no cuenta: un "1" o un "yes" olvidado en Vercel no
    // debería desactivar la regla sin que nadie lo note.
    for (const valor of ["1", "yes", "TRUE", "", "false"]) {
      process.env.UBER_DIRECT_IGNORE_STORE_HOURS = valor;
      expect(horarioIgnorado()).toBe(false);
    }
  });
});

describe("el horario que se le publica al cliente", () => {
  it("sale del horario real del local, no de un texto escrito a mano", async () => {
    // Si divergieran, el aviso diría una hora y `tiendaAbierta` decidiría con
    // otra, que es justo lo que hace que alguien pruebe y no entienda nada.
    const { horarioDeAtencionPublicable, tiendaAbierta } = await import("@/lib/delivery-slots");
    const h = horarioDeAtencionPublicable();
    expect(h.semana).toBe("de 07:45 a 20:30");
    expect(h.finDeSemana).toBe("de 10:00 a 18:00");

    // Y el borde que publica es el borde que aplica.
    expect(tiendaAbierta("2024-01-01", 20 * 60 + 29)).toBe(true);
    expect(tiendaAbierta("2024-01-01", 20 * 60 + 30)).toBe(false);
  });
});
