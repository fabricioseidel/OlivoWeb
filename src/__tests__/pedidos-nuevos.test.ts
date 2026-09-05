/**
 * Qué pedidos entran al tablero y en qué columna.
 *
 * De esto depende que suene la campanilla, así que un error acá es un pedido
 * que nadie atiende — o una campanilla que enseña a ignorarse.
 */
import { describe, it, expect } from "vitest";
import {
  detectarNuevos,
  agruparPorEtapa,
  etapaDe,
  esperandoPago,
  idsDe,
  esperaEnTexto,
  estaAtrasado,
  MINUTOS_URGENTE,
} from "@/lib/admin/pedidos-nuevos";

/** Pagado salvo que se diga lo contrario: es el caso normal del tablero. */
const pedido = (id: string, estado: string, extra: { pago?: string; creado?: string } = {}) => ({
  id,
  estado,
  paymentStatus: extra.pago ?? "paid",
  createdAt: extra.creado,
});

describe("sin pago confirmado no hay trabajo", () => {
  it("deja fuera del tablero al pedido sin pagar", () => {
    // El checkout sólo cobra por MercadoPago: no existe "paga al recibir", así
    // que un pedido sin pagar no es algo que preparar.
    expect(etapaDe(pedido("a", "processing", { pago: "pending" }))).toBeNull();
    expect(etapaDe(pedido("b", "pending", { pago: "pending" }))).toBeNull();
    expect(etapaDe(pedido("c", "shipped", { pago: "failed" }))).toBeNull();
  });

  it("los cuenta aparte, porque acumularse significa algo", () => {
    // Un abandono suelto es normal. Muchos son el síntoma de que las
    // confirmaciones de pago dejaron de llegar, que es lo que pasó el
    // 2026-09-05 y desde el tablero no se veía.
    const lista = [
      pedido("pagado", "processing"),
      pedido("abandonado", "pending", { pago: "pending" }),
      pedido("otro", "pendiente", { pago: "pending" }),
      // Uno cancelado sin pagar ya no espera nada.
      pedido("cancelado", "cancelled", { pago: "failed" }),
    ];
    expect(esperandoPago(lista).map((p) => p.id)).toEqual(["abandonado", "otro"]);
  });
});

describe("en qué columna cae cada pedido pagado", () => {
  it("entiende las dos escrituras que conviven en la base", () => {
    // El código escribe en inglés y hay cargas viejas en español. Mirar sólo
    // una dejaba pedidos fuera de las columnas: existían y no se veían.
    expect(etapaDe(pedido("a", "processing"))).toBe("preparar");
    expect(etapaDe(pedido("b", "preparando"))).toBe("preparar");
    expect(etapaDe(pedido("c", "shipped"))).toBe("listos");
    expect(etapaDe(pedido("d", "enviado"))).toBe("listos");
  });

  it("saca del tablero lo que ya terminó", () => {
    expect(etapaDe(pedido("a", "delivered"))).toBeNull();
    expect(etapaDe(pedido("b", "cancelled"))).toBeNull();
    expect(etapaDe(pedido("c", ""))).toBeNull();
  });

  it("pone primero al que lleva más tiempo esperando", () => {
    const grupos = agruparPorEtapa([
      pedido("nuevo", "processing", { creado: "2026-09-05T12:30:00Z" }),
      pedido("viejo", "processing", { creado: "2026-09-05T12:00:00Z" }),
    ]);
    // Es una cola: el que espera hace 40 minutos no puede quedar enterrado
    // bajo los recién llegados.
    expect(grupos.preparar.map((p) => p.id)).toEqual(["viejo", "nuevo"]);
    expect(grupos.listos).toEqual([]);
  });
});

describe("cuándo suena la campanilla", () => {
  it("suena por un pedido pagado, que entra como processing", () => {
    // El caso que el panel se perdía: MercadoPago marca `processing` al
    // confirmar el pago, así que contar pendientes dejaba mudo justamente al
    // pedido que sí importa.
    const nuevos = detectarNuevos(new Set(["a"]), [
      pedido("a", "processing"),
      pedido("b", "processing"),
    ]);
    expect(nuevos.map((p) => p.id)).toEqual(["b"]);
  });

  it("no suena por un checkout abandonado", () => {
    // Una campanilla que avisa de algo que no hay que atender enseña a
    // ignorar la campanilla.
    expect(detectarNuevos(new Set(), [pedido("x", "pending", { pago: "pending" })])).toEqual([]);
  });

  it("suena aunque entre uno y se despache otro a la vez", () => {
    // Con el conteo, un pedido que entra mientras otro sale dejaba el total
    // igual y no sonaba nada.
    const nuevos = detectarNuevos(new Set(["a", "b"]), [
      pedido("b", "processing"),
      pedido("c", "processing"),
    ]);
    expect(nuevos.map((p) => p.id)).toEqual(["c"]);
  });

  it("no suena de nuevo por un pedido ya visto", () => {
    expect(detectarNuevos(new Set(["a"]), [pedido("a", "processing")])).toEqual([]);
  });

  it("no suena por un pedido que llega ya terminado", () => {
    expect(detectarNuevos(new Set(), [pedido("z", "delivered")])).toEqual([]);
  });

  it("recuerda todos los ids, terminados y sin pagar incluidos", () => {
    // Si no quedaran registrados, volverían a aparecer como nuevos.
    expect(
      idsDe([pedido("a", "processing"), pedido("z", "pending", { pago: "pending" })])
    ).toEqual(new Set(["a", "z"]));
  });
});

describe("cuánto lleva esperando un pedido", () => {
  const haceMinutos = (m: number) => new Date(Date.now() - m * 60000).toISOString();

  it("lo dice en palabras y no en una fecha", () => {
    expect(esperaEnTexto(haceMinutos(0))).toBe("Recién llegado");
    expect(esperaEnTexto(haceMinutos(25))).toBe("25 min");
    expect(esperaEnTexto(haceMinutos(90))).toBe("1 h 30 min");
    expect(esperaEnTexto(haceMinutos(120))).toBe("2 h");
    expect(esperaEnTexto(undefined)).toBe("—");
  });

  it("marca en rojo al que espera de más", () => {
    expect(estaAtrasado(haceMinutos(MINUTOS_URGENTE - 1))).toBe(false);
    expect(estaAtrasado(haceMinutos(MINUTOS_URGENTE + 1))).toBe(true);
    expect(estaAtrasado(undefined)).toBe(false);
  });
});
