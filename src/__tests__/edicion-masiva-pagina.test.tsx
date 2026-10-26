import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
const updateProductsBulk = vi.fn();
const refresh = vi.fn();
let sesion: any = { data: { user: { role: "ADMIN" } }, status: "authenticated" };
let catalogo: any[] = [];

vi.mock("next-auth/react", () => ({ useSession: () => sesion }));
vi.mock("@/contexts/ProductContext", () => ({
  useProducts: () => ({ products: catalogo, updateProductsBulk, refresh }),
}));
vi.mock("@/contexts/CategoryContext", () => ({ useCategories: () => ({ categories: ["Despensa", "Bebidas"] }) }));
vi.mock("@/contexts/ToastContext", () => ({ useToast: () => ({ showToast }) }));
vi.mock("@/services/products", () => ({
  fetchAllProducts: vi.fn(async () => catalogo),
  renameProductBarcode: vi.fn(async () => {}),
  saveProductsBulk: vi.fn(async () => ({})),
}));
const upload = vi.fn();
vi.mock("@/actions/upload", () => ({ uploadImageToCloudinaryServerAction: (img: string) => upload(img) }));
vi.mock("@/utils/image", () => ({ compressImageFile: vi.fn(async () => "data:image/png;base64,AAAA") }));

import BulkEditProductsPage from "@/app/admin/productos/edicion-masiva/page";

function producto(p: Partial<any> & { id: string }) {
  return {
    name: "Producto",
    barcode: p.id,
    price: 1000,
    offerPrice: null,
    stock: 10,
    minStock: 5,
    optimumStock: 20,
    categories: ["Despensa"],
    description: "",
    image: "https://res.cloudinary.com/x/a.jpg",
    purchasePrice: 600,
    isActive: true,
    ...p,
  };
}

const tabla = () => screen.getByRole("table");
const fila = (nombre: string) => within(tabla()).getByDisplayValue(nombre).closest("tr") as HTMLElement;

async function escribir(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, texto: string) {
  await user.clear(input);
  await user.type(input, texto);
}

async function guardarYConfirmar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: /^Guardar \d+ producto/ })[0]);
  const dialogo = await screen.findByRole("dialog");
  await user.click(within(dialogo).getByRole("button", { name: /^Guardar/ }));
}

describe("Edición masiva: página", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sesion = { data: { user: { role: "ADMIN" } }, status: "authenticated" };
    catalogo = [
      producto({ id: "A", name: "Arroz", price: 0 }),
      producto({ id: "B", name: "Bebida", price: 1000 }),
    ];
    updateProductsBulk.mockResolvedValue({});
  });

  it("con 'Falta precio' activo, la fila no desaparece a mitad de escribir y se guarda el número completo", async () => {
    const user = userEvent.setup();
    render(<BulkEditProductsPage />);

    await user.click(screen.getByRole("button", { name: /^Precio\s*1$/ }));
    expect(within(tabla()).queryByDisplayValue("Bebida")).toBeNull();

    const precio = within(fila("Arroz")).getByLabelText("Precio de Arroz");
    await user.clear(precio);
    await user.type(precio, "1500");

    // Sigue en la lista y con el valor completo.
    expect(within(fila("Arroz")).getByLabelText("Precio de Arroz")).toHaveValue(1500);

    await guardarYConfirmar(user);
    await waitFor(() => expect(updateProductsBulk).toHaveBeenCalled());
    expect(updateProductsBulk.mock.calls[0][0]).toEqual({ A: { price: 1500 } });
  });

  it("borrar un campo no lo devuelve de golpe al valor original", async () => {
    const user = userEvent.setup();
    render(<BulkEditProductsPage />);

    const stock = within(fila("Bebida")).getByLabelText("Stock de Bebida");
    await user.clear(stock);
    expect(stock).toHaveValue(null);
    expect(stock).toHaveAttribute("aria-invalid", "true");

    await user.type(stock, "7");
    expect(stock).toHaveValue(7);
    expect(screen.getAllByRole("button", { name: "Guardar 1 producto" }).length).toBeGreaterThan(0);
  });

  it("no acepta negativos", async () => {
    const user = userEvent.setup();
    render(<BulkEditProductsPage />);
    const stock = within(fila("Bebida")).getByLabelText("Stock de Bebida");
    fireEvent.change(stock, { target: { value: "-3" } });
    expect(stock).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("button", { name: /^Guardar \d+ producto/ })).toBeNull();
    await user.tab();
  });

  it("las acciones masivas piden confirmación mostrando a cuántos productos afectan", async () => {
    const user = userEvent.setup();
    render(<BulkEditProductsPage />);

    await user.click(screen.getByRole("button", { name: /^Acciones/ }));
    await user.click(screen.getByRole("button", { name: /\+10% precio/ }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("2 productos filtrados");
    expect(screen.queryByRole("button", { name: /^Guardar \d+ producto/ })).toBeNull();

    await user.click(within(dialogo).getByRole("button", { name: "Aplicar" }));
    // Arroz tiene precio 0: no se ajusta. Sólo cambia Bebida.
    expect(within(fila("Bebida")).getByLabelText("Precio de Bebida")).toHaveValue(1100);
    expect(screen.getAllByRole("button", { name: "Guardar 1 producto" }).length).toBeGreaterThan(0);
  });

  it("los filtros de stock y de faltantes se combinan", async () => {
    const user = userEvent.setup();
    catalogo = [
      producto({ id: "A", name: "Arroz", stock: 5, image: "/file.svg" }),
      producto({ id: "B", name: "Bebida", stock: 0, image: "/file.svg" }),
      producto({ id: "C", name: "Café", stock: 5 }),
    ];
    render(<BulkEditProductsPage />);

    await user.click(screen.getByRole("button", { name: /^Con stock/ }));
    await user.click(screen.getByRole("button", { name: /^Foto\s*2$/ }));

    expect(within(tabla()).getByDisplayValue("Arroz")).toBeInTheDocument();
    expect(within(tabla()).queryByDisplayValue("Bebida")).toBeNull();
    expect(within(tabla()).queryByDisplayValue("Café")).toBeNull();
  });

  it("si la foto no sube, no se guarda en base64 y queda pendiente", async () => {
    const user = userEvent.setup();
    upload.mockResolvedValue({ ok: false, error: "Cloudinary caído" });
    render(<BulkEditProductsPage />);

    const input = fila("Bebida").querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["x"], "foto.png", { type: "image/png" }));
    await escribir(user, within(fila("Bebida")).getByLabelText("Stock de Bebida"), "8");

    await guardarYConfirmar(user);
    await waitFor(() => expect(updateProductsBulk).toHaveBeenCalled());

    expect(updateProductsBulk.mock.calls[0][0]).toEqual({ B: { stock: 8 } });
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining("foto no se pudo subir"), "error", 10000)
    );
    // La foto sigue pendiente para reintentar.
    expect(screen.getAllByRole("button", { name: "Guardar 1 producto" }).length).toBeGreaterThan(0);
  });

  it("si el ajuste de stock falla, lo avisa y el stock queda pendiente", async () => {
    const user = userEvent.setup();
    updateProductsBulk.mockResolvedValue({ stockError: "sin sucursal" });
    render(<BulkEditProductsPage />);

    await escribir(user, within(fila("Bebida")).getByLabelText("Stock de Bebida"), "3");
    await guardarYConfirmar(user);

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining("el stock no se actualizó"), "error", 10000)
    );
    expect(screen.getAllByRole("button", { name: "Guardar 1 producto" }).length).toBeGreaterThan(0);
  });

  it("deshacer una fila quita sus cambios pendientes", async () => {
    const user = userEvent.setup();
    render(<BulkEditProductsPage />);
    await escribir(user, within(fila("Bebida")).getByLabelText("Stock de Bebida"), "3");
    await user.click(within(fila("Bebida")).getByRole("button", { name: "Deshacer cambios de Bebida" }));
    expect(screen.queryByRole("button", { name: /^Guardar \d+ producto/ })).toBeNull();
  });

  it("un vendedor no puede usar la edición masiva", () => {
    sesion = { data: { user: { role: "SELLER" } }, status: "authenticated" };
    render(<BulkEditProductsPage />);
    expect(screen.getByText("Solo administradores")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
