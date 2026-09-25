/**
 * La grilla del taller de precios.
 *
 * Lo que se prueba es lo que la hace útil: que el margen se recalcule mientras
 * se teclea, con la MISMA aritmética que el servidor va a usar al guardar. Si
 * la pantalla mostrara un margen y el guardado dejara otro, la grilla sería
 * peor que no tenerla — el dueño estaría decidiendo precios con un número
 * inventado.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const FILA_BASE = {
  barcode: "779",
  nombre: "Pomarola Sachet",
  categoria: "Abarrotes",
  stock: 4,
  precioVenta: 800,
  precioRevisado: false,
  proveedorId: "prov-1",
  proveedorNombre: "Taurus",
  costoNeto: 1563,
  packSize: null,
  tasa: 19,
  margenObjetivo: 0.35,
  costoUnitarioBruto: 1859.97,
  margenActual: -1.32,
  precioSugerido: 2860,
  aPerdida: true,
};

const respuesta = {
  filas: [FILA_BASE],
  proveedores: [{ id: "prov-1", name: "Taurus" }],
  totales: {
    activos: 736, sinPrecio: 76, sinPrecioConStock: 64,
    sinProveedor: 458, sinCosto: 4, aPerdida: 9,
  },
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    ({ ok: true, json: async () => respuesta }) as Response
  ) as unknown as typeof fetch;
});

async function montar() {
  const { default: Page } = await import("@/app/admin/precios/page");
  render(<Page />);
  await waitFor(() => expect(screen.getByText("Pomarola Sachet")).toBeInTheDocument());
}

describe("la grilla recalcula mientras se escribe", () => {
  it("declarar las unidades por bulto saca al producto de pérdida", async () => {
    await montar();

    // Tal como está en la base: el costo del pack cargado como unitario.
    expect(screen.getByText("bajo costo")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Unidades por bulto de Pomarola/i), {
      target: { value: "24" },
    });

    // Con el bulto declarado el costo unitario cae y el margen se vuelve sano,
    // sin haber guardado ni recargado nada.
    await waitFor(() => expect(screen.queryByText("bajo costo")).not.toBeInTheDocument());
  });

  it("el costo con IVA que muestra es el neto por unidad más el impuesto", async () => {
    await montar();

    fireEvent.change(screen.getByLabelText(/Costo de factura de Pomarola/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/Unidades por bulto de Pomarola/i), {
      target: { value: "10" },
    });

    // 1000 / 10 = 100 neto => 119 con IVA. Que se muestre el bruto importa:
    // es contra ese que se mide el margen, y confundirlo con el neto es
    // exactamente lo que inflaba el margen del catálogo.
    await waitFor(() => expect(screen.getByText("$119")).toBeInTheDocument());
  });

  it("ofrece el precio sugerido como botón, no como texto para copiar a mano", async () => {
    await montar();
    const boton = await screen.findByRole("button", { name: /usar \$/i });
    fireEvent.click(boton);

    const precio = screen.getByLabelText(/Precio de venta de Pomarola/i) as HTMLInputElement;
    expect(Number(precio.value)).toBeGreaterThan(0);
  });

  it("la barra de guardado aparece recién cuando hay algo que guardar", async () => {
    await montar();
    expect(screen.queryByRole("button", { name: /Guardar cambios/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Precio de venta de Pomarola/i), {
      target: { value: "2900" },
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Guardar cambios/i })).toBeInTheDocument()
    );
    // El texto va partido entre <strong> y el resto, así que se busca por el
    // contenido del contenedor y no por un nodo suelto.
    expect(
      screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, " ").trim() === "1 producto editado")
    ).toBeTruthy();
  });

  it("muestra cuántos productos hay en góndola sin poder venderse", async () => {
    await montar();
    expect(screen.getAllByText("64").length).toBeGreaterThan(0);
  });
});
