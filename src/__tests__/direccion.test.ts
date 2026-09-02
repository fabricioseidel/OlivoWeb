/**
 * Sacar la comuna de una dirección de OpenStreetMap.
 *
 * El caso que motiva el módulo: en el Gran Santiago, Nominatim pone
 * `city: "Santiago"` —la ciudad— y la comuna real en otro campo. El checkout
 * leía sólo `city`, así que toda dirección de Ñuñoa se guardaba como
 * "Santiago" y así se le mandaba a Uber.
 */
import { describe, it, expect } from "vitest";
import { elegirComuna } from "@/lib/direccion";

describe("la comuna gana aunque venga en cualquier campo", () => {
  it("prefiere la comuna conocida por sobre la ciudad", () => {
    // La forma habitual del Gran Santiago.
    const r = elegirComuna({ city: "Santiago", municipality: "Ñuñoa", state: "Región Metropolitana" });
    expect(r.nombre).toBe("Ñuñoa");
    expect(r.campo).toBe("municipality");
    expect(r.reconocida).toBe(true);
  });

  it("la encuentra en city_district", () => {
    const r = elegirComuna({ city: "Santiago", city_district: "Macul" });
    expect(r.nombre).toBe("Macul");
    expect(r.reconocida).toBe(true);
  });

  it("la encuentra en suburb", () => {
    const r = elegirComuna({ city: "Santiago", suburb: "Peñalolén" });
    expect(r.nombre).toBe("Peñalolén");
    expect(r.reconocida).toBe(true);
  });

  it("la encuentra en city cuando ahí está de verdad", () => {
    // No siempre `city` está mal: para algunas direcciones sí trae la comuna.
    const r = elegirComuna({ city: "La Reina" });
    expect(r.nombre).toBe("La Reina");
    expect(r.reconocida).toBe(true);
  });

  it("una comuna conocida en un campo menos específico le gana a una desconocida en uno más específico", () => {
    // Es el corazón de la regla: importa más que el valor sea una comuna que
    // atendemos que el campo del que salga. `suburb` suele traer el barrio.
    const r = elegirComuna({ suburb: "Villa Frei", city: "Ñuñoa" });
    expect(r.nombre).toBe("Ñuñoa");
    expect(r.campo).toBe("city");
  });
});

describe("direcciones fuera de la zona", () => {
  it("devuelve el campo más específico en vez de la ciudad", () => {
    // No atendemos Providencia, pero guardarla es más útil que "Santiago".
    const r = elegirComuna({ city: "Santiago", municipality: "Providencia" });
    expect(r.nombre).toBe("Providencia");
    expect(r.reconocida).toBe(false);
  });

  it("con sólo la ciudad, se queda con la ciudad", () => {
    const r = elegirComuna({ city: "Valparaíso" });
    expect(r.nombre).toBe("Valparaíso");
    expect(r.reconocida).toBe(false);
  });
});

describe("casos degradados", () => {
  it("sin dirección no inventa nada", () => {
    expect(elegirComuna(null).nombre).toBeNull();
    expect(elegirComuna(undefined).nombre).toBeNull();
    expect(elegirComuna({}).nombre).toBeNull();
  });

  it("ignora campos vacíos o con espacios", () => {
    const r = elegirComuna({ municipality: "   ", city: "Ñuñoa" });
    expect(r.nombre).toBe("Ñuñoa");
  });

  it("ignora valores que no son texto", () => {
    const r = elegirComuna({ municipality: 42 as unknown as string, city: "Macul" });
    expect(r.nombre).toBe("Macul");
  });

  it("dice de qué campo salió, para poder depurarlo", () => {
    // Sin esto, cuando una dirección salga mal habría que adivinar otra vez.
    expect(elegirComuna({ city_district: "Macul" }).campo).toBe("city_district");
  });
});
