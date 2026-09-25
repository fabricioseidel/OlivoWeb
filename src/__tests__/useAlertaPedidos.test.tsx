/**
 * La campanilla de pedidos nuevos.
 *
 * Lo que se prueba acá no es el sonido —jsdom no tiene Web Audio— sino la
 * propiedad de la que dependía que sonara: que `sonar` no quede congelada con
 * el estado del montaje.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAlertaPedidos } from "@/hooks/useAlertaPedidos";

describe("useAlertaPedidos", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("arranca apagada y recuerda que la encendieron", () => {
    const { result, unmount } = renderHook(() => useAlertaPedidos());
    expect(result.current.activada).toBe(false);

    act(() => result.current.alternar());
    expect(result.current.activada).toBe(true);
    expect(localStorage.getItem("olivo:alerta-pedidos")).toBe("on");
    unmount();

    // Al volver al panel la preferencia sigue puesta: encenderla una vez por
    // navegador es todo lo que se le pide a la tienda.
    const segunda = renderHook(() => useAlertaPedidos());
    expect(segunda.result.current.activada).toBe(true);
  });

  it("mantiene la misma función `sonar` al encenderse", () => {
    // Es la regresión que importa. Quien llama a `sonar` lo hace desde un
    // `setInterval` creado una sola vez, así que se queda con la versión del
    // montaje: si esa versión dependiera de `activada`, seguiría muda para
    // siempre aunque la tienda encendiera la alerta. El panel decía "alerta
    // activada" y no sonaba nunca.
    const { result } = renderHook(() => useAlertaPedidos());
    const sonarInicial = result.current.sonar;

    act(() => result.current.alternar());

    expect(result.current.activada).toBe(true);
    expect(result.current.sonar).toBe(sonarInicial);
  });

  it("apagarla vuelve a dejarla en silencio", () => {
    const { result } = renderHook(() => useAlertaPedidos());
    act(() => result.current.alternar());
    act(() => result.current.alternar());
    expect(result.current.activada).toBe(false);
    expect(localStorage.getItem("olivo:alerta-pedidos")).toBe("off");
  });

  it("no se cae en un navegador sin Web Audio", () => {
    // jsdom no trae AudioContext, que es justamente el caso de un navegador
    // viejo: la alerta se degrada a nada, no rompe el panel.
    const { result } = renderHook(() => useAlertaPedidos());
    expect(() => {
      act(() => result.current.sonar("Pedido nuevo", "Ana · $10.000"));
      act(() => result.current.probar());
    }).not.toThrow();
  });
});
