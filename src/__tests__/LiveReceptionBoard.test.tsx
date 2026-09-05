/**
 * El tablero de recepción, montado de verdad.
 *
 * Las reglas viven en `pedidos-nuevos` y se prueban aparte; acá se comprueba lo
 * que la tienda ve: que cada pedido caiga en su pestaña, que el contador diga
 * la verdad y que el botón mande el estado siguiente.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveReceptionBoard, { type LiveOrder } from "@/components/admin/LiveReceptionBoard";

const PEDIDOS: LiveOrder[] = [
  {
    id: "aaaaaa-1",
    customer: "Ana",
    total: 24990,
    productos: 3,
    estado: "pending",
    paymentStatus: "paid",
    shippingMethod: "flash",
    expressStatus: "dropoff",
    expressTrackingUrl: "https://uber.example/seguimiento",
    createdAt: new Date().toISOString(),
  },
  {
    id: "bbbbbb-2",
    customer: "Beto",
    total: 8000,
    productos: 1,
    estado: "processing",
    paymentStatus: "pending",
    shippingMethod: "pickup",
    createdAt: new Date().toISOString(),
  },
  // Entregado: no es trabajo pendiente y no debe ocupar ninguna pestaña.
  { id: "cccccc-3", customer: "Carla", estado: "delivered", createdAt: new Date().toISOString() },
];

describe("el tablero de recepción", () => {
  it("abre en los pedidos nuevos y no muestra los de otras etapas", () => {
    render(<LiveReceptionBoard orders={PEDIDOS} onUpdateStatus={() => {}} />);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.queryByText("Beto")).toBeNull();
    expect(screen.queryByText("Carla")).toBeNull();
  });

  it("deja ver el estado del repartidor sin salir del tablero", () => {
    render(<LiveReceptionBoard orders={PEDIDOS} onUpdateStatus={() => {}} />);
    expect(screen.getByText("En camino al cliente")).toBeTruthy();
    const link = screen.getByText("Ver repartidor").closest("a");
    expect(link?.getAttribute("href")).toBe("https://uber.example/seguimiento");
  });

  it("cambia de pestaña y ahí sí aparece el que estaba en preparación", () => {
    render(<LiveReceptionBoard orders={PEDIDOS} onUpdateStatus={() => {}} />);
    fireEvent.click(screen.getByText("Preparando"));
    expect(screen.getByText("Beto")).toBeTruthy();
    expect(screen.queryByText("Ana")).toBeNull();
  });

  it("dice que no hay nada cuando la pestaña está vacía", () => {
    render(<LiveReceptionBoard orders={PEDIDOS} onUpdateStatus={() => {}} />);
    fireEvent.click(screen.getByText("Listos"));
    expect(screen.getByText("No hay pedidos listos")).toBeTruthy();
  });

  it("el botón manda el estado siguiente de la etapa", () => {
    const onUpdateStatus = vi.fn();
    render(<LiveReceptionBoard orders={PEDIDOS} onUpdateStatus={onUpdateStatus} />);
    fireEvent.click(screen.getByText("Aceptar y preparar"));
    expect(onUpdateStatus).toHaveBeenCalledWith("aaaaaa-1", "processing");
  });

  it("el interruptor de la alerta dice si está encendida", () => {
    const { rerender } = render(
      <LiveReceptionBoard orders={[]} onUpdateStatus={() => {}} alertaActivada={false} />
    );
    // Apagada tiene que invitar a encenderla, no limitarse a informar.
    expect(screen.getByText("Activar alerta sonora")).toBeTruthy();
    rerender(<LiveReceptionBoard orders={[]} onUpdateStatus={() => {}} alertaActivada={true} />);
    expect(screen.getByText("Alerta activada")).toBeTruthy();
  });
});
