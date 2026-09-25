import { describe, it, expect } from "vitest";
import {
  getProductDiagnostics,
  isProductReady,
  type ProductChanges,
} from "@/app/admin/productos/edicion-masiva/lib";

describe("Edición Masiva: Diagnóstico y Prioridad de Publicación", () => {
  const completeProduct = {
    id: "PROD-1",
    barcode: "7801234567890",
    name: "Harina PAN 1kg",
    price: 2500,
    offerPrice: null,
    stock: 20,
    categories: ["Despensa", "Venezolanos"],
    image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    purchasePrice: 1600,
    isActive: true,
  };

  it("identifica correctamente un producto 100% listo para vitrina", () => {
    const diag = getProductDiagnostics(completeProduct);
    expect(diag.isReady).toBe(true);
    expect(diag.missingCount).toBe(0);
    expect(diag.missing).toEqual([]);
    expect(diag.percentage).toBe(100);
    expect(diag.hasImage).toBe(true);
    expect(diag.hasPrice).toBe(true);
    expect(diag.hasStock).toBe(true);
    expect(diag.hasCategories).toBe(true);
    expect(diag.hasBarcode).toBe(true);
    expect(isProductReady(completeProduct)).toBe(true);
  });

  it("detecta cuando solo falta 1 dato (máxima prioridad de trabajo: casi listo)", () => {
    const noPhoto = {
      ...completeProduct,
      image: "/file.svg",
    };
    const diagPhoto = getProductDiagnostics(noPhoto);
    expect(diagPhoto.isReady).toBe(false);
    expect(diagPhoto.missingCount).toBe(1);
    expect(diagPhoto.missing).toContain("Sin foto");
    expect(diagPhoto.percentage).toBe(80);

    const changesWithPhoto: ProductChanges = {
      image: "data:image/jpeg;base64,samplebase64",
    };
    const diagPhotoFixed = getProductDiagnostics(noPhoto, changesWithPhoto);
    expect(diagPhotoFixed.isReady).toBe(true);
    expect(diagPhotoFixed.missingCount).toBe(0);

    const noPrice = {
      ...completeProduct,
      price: 0,
    };
    const diagPrice = getProductDiagnostics(noPrice);
    expect(diagPrice.missingCount).toBe(1);
    expect(diagPrice.missing).toContain("Sin precio");

    const noStock = {
      ...completeProduct,
      stock: 0,
    };
    const diagStock = getProductDiagnostics(noStock);
    expect(diagStock.missingCount).toBe(1);
    expect(diagStock.missing).toContain("Sin stock");
  });

  it("detecta múltiples faltantes y calcula el porcentaje de completitud correctamente", () => {
    const emptyProduct = {
      id: "PROD-EMPTY",
      barcode: "",
      name: "Producto Nuevo",
      price: 0,
      stock: 0,
      categories: [],
      image: null,
      purchasePrice: 0,
      isActive: false,
    };

    const diag = getProductDiagnostics(emptyProduct);
    expect(diag.isReady).toBe(false);
    expect(diag.missingCount).toBe(5);
    expect(diag.missing).toEqual(["Sin foto", "Sin precio", "Sin stock", "Sin categoría", "Sin SKU"]);
    expect(diag.percentage).toBe(0);
    expect(diag.isActive).toBe(false);
    expect(diag.hasCost).toBe(false);
  });

  it("refleja cambios locales pendientes (editedChanges) en tiempo real", () => {
    const product = {
      id: "PROD-TEST",
      barcode: "123",
      name: "Test",
      price: 0,
      stock: 0,
      categories: ["General"],
      image: "https://demo.jpg",
    };

    expect(getProductDiagnostics(product).missingCount).toBe(2);

    const changes: ProductChanges = {
      price: 1990,
      stock: 10,
    };

    const updatedDiag = getProductDiagnostics(product, changes);
    expect(updatedDiag.missingCount).toBe(0);
    expect(updatedDiag.isReady).toBe(true);
    expect(updatedDiag.percentage).toBe(100);
  });
});
