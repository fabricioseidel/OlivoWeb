import { describe, it, expect } from "vitest";
import { validateShippingInfo } from "../schemas/checkout.schema";

describe("validateShippingInfo", () => {
  const valid = {
    fullName: "Juan Pérez",
    email: "juan@test.com",
    phone: "+56 9 1234 5678",
    address: "Av. Providencia 1234, Santiago",
  };

  it("acepta datos válidos", () => {
    expect(validateShippingInfo(valid)).toBeNull();
  });

  it("rechaza nombre demasiado corto", () => {
    const errors = validateShippingInfo({ ...valid, fullName: "Jo" });
    expect(errors?.fullName).toBeTruthy();
  });

  it("rechaza email inválido", () => {
    const errors = validateShippingInfo({ ...valid, email: "no-es-email" });
    expect(errors?.email).toBeTruthy();
  });

  it("rechaza email vacío con mensaje de obligatorio", () => {
    const errors = validateShippingInfo({ ...valid, email: "" });
    expect(errors?.email).toContain("obligatorio");
  });

  it("rechaza teléfono con letras", () => {
    const errors = validateShippingInfo({ ...valid, phone: "no-phone" });
    expect(errors?.phone).toBeTruthy();
  });

  it("rechaza dirección demasiado corta", () => {
    const errors = validateShippingInfo({ ...valid, address: "x" });
    expect(errors?.address).toBeTruthy();
  });

  it("reporta múltiples errores a la vez (uno por campo)", () => {
    const errors = validateShippingInfo({ fullName: "", email: "", phone: "", address: "" });
    expect(errors).not.toBeNull();
    expect(Object.keys(errors!)).toEqual(
      expect.arrayContaining(["fullName", "email", "phone", "address"])
    );
  });
});
