/**
 * Traducción de los estados de una entrega de Uber Direct.
 *
 * Estas reglas deciden dos cosas que se ven: qué le dice el panel a la tienda y
 * cuándo el pedido pasa a "enviado" o "entregado" solo.
 */
import { describe, it, expect } from "vitest";
import { leerEstadoUber, esAvance } from "@/lib/uber-status";

describe("qué significa cada estado de Uber", () => {
  it("no despacha el pedido mientras Uber sólo busca repartidor", () => {
    // "pending" es "estoy buscando a quién asignarle esto": el pedido sigue en
    // preparación y mandar el correo de despacho acá sería mentirle al cliente.
    expect(leerEstadoUber("pending").estadoPedido).toBeNull();
    expect(leerEstadoUber("pickup").estadoPedido).toBeNull();
  });

  it("despacha el pedido cuando el repartidor ya lo tiene", () => {
    expect(leerEstadoUber("pickup_complete").estadoPedido).toBe("shipped");
    expect(leerEstadoUber("dropoff").estadoPedido).toBe("shipped");
  });

  it("cierra el pedido al entregar", () => {
    const l = leerEstadoUber("delivered");
    expect(l.estadoPedido).toBe("delivered");
    expect(l.terminal).toBe(true);
  });

  it("marca para atención lo que deja al pedido sin repartidor", () => {
    // Pagado y sin quien lo lleve: la tienda tiene que enterarse, no quedar
    // esperando un aviso que ya no va a llegar.
    expect(leerEstadoUber("canceled").necesitaAtencion).toBe(true);
    expect(leerEstadoUber("returned").necesitaAtencion).toBe(true);
    expect(leerEstadoUber("delivered").necesitaAtencion).toBe(false);
  });

  it("no rompe con un estado que Uber invente después", () => {
    const l = leerEstadoUber("teletransportado");
    expect(l.estado).toBe("unknown");
    // Se muestra el crudo: entender qué pasó sin abrir el código vale más que
    // un "desconocido" prolijo.
    expect(l.etiqueta).toContain("teletransportado");
    expect(l.estadoPedido).toBeNull();
  });

  it("tolera nulo, vacío y mayúsculas", () => {
    expect(leerEstadoUber(null).estado).toBe("unknown");
    expect(leerEstadoUber("").etiqueta).toBe("Sin información de Uber");
    expect(leerEstadoUber("DELIVERED").estadoPedido).toBe("delivered");
  });
});

describe("los avisos llegan desordenados", () => {
  it("acepta el avance normal", () => {
    expect(esAvance("pending", "pickup")).toBe(true);
    expect(esAvance("pickup_complete", "dropoff")).toBe(true);
    // Sin estado guardado, el primer aviso siempre se registra.
    expect(esAvance(null, "pending")).toBe(true);
  });

  it("ignora un aviso viejo que llega tarde", () => {
    // Sin esto un "pickup" rezagado desentregaba un pedido ya entregado.
    expect(esAvance("dropoff", "pickup")).toBe(false);
    expect(esAvance("delivered", "dropoff")).toBe(false);
  });

  it("ignora el mismo aviso repetido", () => {
    expect(esAvance("dropoff", "dropoff")).toBe(false);
  });

  it("deja pasar una cancelación en cualquier momento", () => {
    // Cancelar es el final: venga cuando venga, la tienda tiene que verlo.
    expect(esAvance("dropoff", "canceled")).toBe(true);
    expect(esAvance("delivered", "returned")).toBe(true);
  });

  it("no avanza con un estado que no reconoce", () => {
    expect(esAvance("pickup", "teletransportado")).toBe(false);
  });
});
