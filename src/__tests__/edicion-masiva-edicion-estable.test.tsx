import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  matchesBulkFilters,
  compareBySortPriority,
  getProductDiagnostics,
  type BulkFilterCriteria,
  type ProductChanges,
} from "@/app/admin/productos/edicion-masiva/lib";
import NumericInput from "@/app/admin/productos/edicion-masiva/components/NumericInput";

const CRITERIOS_BASE: BulkFilterCriteria = {
  search: "",
  filterLowStock: false,
  filterWithImage: false,
  categoryFilter: "",
  completenessTab: "all",
  specificFilter: "all",
};

const sinPrecio = {
  id: "PROD-1",
  barcode: "7801234567890",
  name: "Aceite Chef 1L",
  price: 0,
  offerPrice: null,
  stock: 12,
  categories: ["Abarrotes"],
  image: "https://res.cloudinary.com/demo/image/upload/aceite.jpg",
  purchasePrice: 1800,
  isActive: true,
};

describe("Edición masiva: la fila no se mueve mientras se escribe", () => {
  // Regresión: el filtro y el orden se calculaban sobre `producto + cambios sin
  // guardar`. Al teclear el primer dígito de un precio, el producto dejaba de
  // estar "Sin precio", salía del filtro y su fila desaparecía con el cursor
  // dentro: parecía que "se iba solo a Listo" y no se podía terminar de
  // escribir el número.

  it("un producto sin precio sigue en el filtro 'Sin precio' mientras se escribe el precio", () => {
    const criterios: BulkFilterCriteria = { ...CRITERIOS_BASE, specificFilter: "missing_price" };

    expect(matchesBulkFilters(sinPrecio, criterios)).toBe(true);

    // Con el precio ya tecleado pero SIN guardar, la fila tiene que seguir ahí.
    const cambios: ProductChanges = { price: 2990 };
    expect(getProductDiagnostics(sinPrecio, cambios).hasPrice).toBe(true);
    expect(matchesBulkFilters(sinPrecio, criterios)).toBe(true);
  });

  it("solo sale del filtro cuando el precio quedó guardado", () => {
    const criterios: BulkFilterCriteria = { ...CRITERIOS_BASE, specificFilter: "missing_price" };
    const guardado = { ...sinPrecio, price: 2990 };
    expect(matchesBulkFilters(guardado, criterios)).toBe(false);
  });

  it("la pestaña 'Faltan N datos' tampoco expulsa la fila en edición", () => {
    const faltanDos = { ...sinPrecio, price: 0, barcode: "" }; // sin precio y sin SKU
    const criterios: BulkFilterCriteria = { ...CRITERIOS_BASE, completenessTab: "missing_2" };

    expect(getProductDiagnostics(faltanDos).missingCount).toBe(2);
    expect(matchesBulkFilters(faltanDos, criterios)).toBe(true);

    // Al completar uno de los dos faltantes pasaría a "missing_1", pero la fila
    // no puede desaparecer hasta que se guarde.
    expect(getProductDiagnostics(faltanDos, { price: 2990 }).missingCount).toBe(1);
    expect(matchesBulkFilters(faltanDos, criterios)).toBe(true);
  });

  it("el orden no cambia por lo que se está escribiendo", () => {
    const barato = { ...sinPrecio, id: "A", name: "Barato", price: 500 };
    const caro = { ...sinPrecio, id: "B", name: "Caro", price: 9000 };

    const ordenados = [caro, barato].sort((a, b) => compareBySortPriority(a, b, "price_asc"));
    expect(ordenados.map((p) => p.id)).toEqual(["A", "B"]);

    // Subir el precio de "Barato" por encima de "Caro" no reordena la lista
    // hasta guardar: la fila en edición se quedaría sin cursor.
    const trasEditar = [caro, barato].sort((a, b) => compareBySortPriority(a, b, "price_asc"));
    expect(trasEditar.map((p) => p.id)).toEqual(["A", "B"]);
  });

  it("los contadores sí reflejan lo editado, porque no mueven filas", () => {
    expect(getProductDiagnostics(sinPrecio).missing).toContain("Sin precio");
    expect(getProductDiagnostics(sinPrecio, { price: 2990 }).missing).not.toContain("Sin precio");
  });
});

describe("NumericInput: se puede borrar el campo para reescribirlo", () => {
  // Regresión: la página descarta el cambio cuando el valor no es número
  // (`parseFloat("")` es NaN) y devuelve el valor guardado. Con un input
  // controlado puro, borrar el precio hacía reaparecer solo el precio viejo.

  it("deja el campo vacío mientras se escribe, aunque el padre devuelva el valor viejo", () => {
    const onValueChange = vi.fn();
    render(<NumericInput value={2500} onValueChange={onValueChange} aria-label="Precio" />);

    const input = screen.getByLabelText("Precio") as HTMLInputElement;
    expect(input.value).toBe("2500");

    fireEvent.change(input, { target: { value: "" } });

    expect(onValueChange).toHaveBeenCalledWith("");
    expect(input.value).toBe("");
  });

  it("acepta el número nuevo escrito tras vaciar el campo", () => {
    const onValueChange = vi.fn();
    render(<NumericInput value={2500} onValueChange={onValueChange} aria-label="Precio" />);
    const input = screen.getByLabelText("Precio") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.change(input, { target: { value: "39" } });
    fireEvent.change(input, { target: { value: "390" } });

    expect(input.value).toBe("390");
    expect(onValueChange).toHaveBeenLastCalledWith("390");
  });

  it("al salir del campo vuelve a mostrar lo que quedó registrado", () => {
    const onValueChange = vi.fn();
    render(<NumericInput value={2500} onValueChange={onValueChange} aria-label="Precio" />);
    const input = screen.getByLabelText("Precio") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.blur(input);
    expect(input.value).toBe("2500");
  });

  it("muestra vacío cuando no hay valor, sin imprimir null", () => {
    render(<NumericInput value={null} onValueChange={() => {}} aria-label="Oferta" />);
    expect((screen.getByLabelText("Oferta") as HTMLInputElement).value).toBe("");
  });
});
