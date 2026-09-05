/**
 * Qué pedidos son nuevos y en qué columna del tablero va cada uno.
 *
 * De esto depende que suene la campanilla, así que un error acá es un pedido
 * que nadie atiende.
 */
import { describe, it, expect } from "vitest";
import {
  detectarNuevos,
  agruparPorEtapa,
  etapaDe,
  idsDe,
  esperaEnTexto,
  estaAtrasado,
  MINUTOS_URGENTE,
} from "@/lib/admin/pedidos-nuevos";

const pedido = (id: string, estado: string, createdAt?: string) => ({
  id,
  estado,
  createdAt,
});

describe("en qué columna cae cada estado", () => {
  it("entiende las dos escrituras que conviven en la base", () => {
    // El código escribe en inglés y hay cargas viejas en español. Mirar sólo
    // una dejaba pedidos fuera de las tres columnas: existían y no se veían.
    expect(etapaDe("pending")).toBe("nuevos");
    expect(etapaDe("Pendiente")).toBe("nuevos");
    expect(etapaDe("processing")).toBe("preparando");
    expect(etapaDe("preparando")).toBe("preparando");
    expect(etapaDe("shipped")).toBe("listos");
    expect(etapaDe("enviado")).toBe("listos");
  });

  it("saca del tablero lo que ya terminó", () => {
    expect(etapaDe("delivered")).toBeNull();
    expect(etapaDe("cancelled")).toBeNull();
    expect(etapaDe(undefined)).toBeNull();
  });

  it("pone primero al que lleva más tiempo esperando", () => {
    const grupos = agruparPorEtapa([
      pedido("nuevo", "pending", "2026-09-05T12:30:00Z"),
      pedido("viejo", "pending", "2026-09-05T12:00:00Z"),
    ]);
    // Es una cola: el que espera hace 40 minutos no puede quedar enterrado
    // bajo los recién llegados.
    expect(grupos.nuevos.map((p) => p.id)).toEqual(["viejo", "nuevo"]);
    expect(grupos.preparando).toEqual([]);
  });
});

describe("cuándo suena la campanilla", () => {
  it("suena por un pedido pagado, que entra como processing", () => {
    // El caso que el panel se perdía: MercadoPago marca `processing` al
    // confirmar el pago, así que contar pendientes dejaba mudo justamente al
    // pedido que sí importa.
    const nuevos = detectarNuevos(new Set(["a"]), [
      pedido("a", "pending"),
      pedido("b", "processing"),
    ]);
    expect(nuevos.map((p) => p.id)).toEqual(["b"]);
  });

  it("suena aunque entre uno y se despache otro a la vez", () => {
    // Con el conteo, un pedido que entra mientras otro sale dejaba el total
    // igual y no sonaba nada.
    const vistos = new Set(["a", "b"]);
    const nuevos = detectarNuevos(vistos, [pedido("b", "processing"), pedido("c", "pending")]);
    expect(nuevos.map((p) => p.id)).toEqual(["c"]);
  });

  it("no suena de nuevo por un pedido ya visto", () => {
    expect(detectarNuevos(new Set(["a"]), [pedido("a", "pending")])).toEqual([]);
  });

  it("no suena por un pedido que llega ya terminado", () => {
    // Un pedido entregado o cancelado que aparece en la lista no es trabajo
    // nuevo, y hacer sonar la campanilla por él enseña a ignorarla.
    expect(detectarNuevos(new Set(), [pedido("z", "delivered")])).toEqual([]);
    expect(detectarNuevos(new Set(), [pedido("y", "cancelled")])).toEqual([]);
  });

  it("recuerda todos los ids, terminados incluidos", () => {
    // Si un pedido entregado no quedara registrado, volvería a aparecer como
    // nuevo al reabrirse.
    expect(idsDe([pedido("a", "pending"), pedido("z", "delivered")])).toEqual(
      new Set(["a", "z"])
    );
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
