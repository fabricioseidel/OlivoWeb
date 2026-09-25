/**
 * RUT chileno: normalizar, validar y formatear.
 *
 * Un documento tributario con el RUT mal escrito no se corrige: se anula con
 * una nota de crédito y se vuelve a emitir. Y una factura recibida guardada
 * con el RUT del proveedor en otro formato ("12345678-9" contra
 * "12.345.678-9") no se reconoce como duplicada. Por eso todo RUT que entra a
 * la gestión documental pasa por aquí y se guarda en UNA forma: sin puntos,
 * con guión y la K en mayúscula (`12345678-9`).
 */

/** Deja solo dígitos y K, en mayúscula. `" 12.345.678-k "` → `"12345678K"`. */
function limpiar(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Dígito verificador por módulo 11 para el cuerpo del RUT (sin DV). */
export function digitoVerificador(cuerpo: string | number): string {
  const digitos = String(cuerpo).replace(/\D/g, "");
  let suma = 0;
  let factor = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += Number(digitos[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/**
 * Forma canónica para guardar y comparar: `12345678-9`.
 * Devuelve null si no parece un RUT (muy corto, K en el cuerpo, etc.). No
 * revisa el dígito verificador: para eso está `rutValido`.
 */
export function normalizarRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const limpio = limpiar(rut);
  if (limpio.length < 2) return null;
  const cuerpo = limpio.slice(0, -1).replace(/^0+/, "");
  const dv = limpio.slice(-1);
  if (!/^\d{1,9}$/.test(cuerpo)) return null;
  return `${cuerpo}-${dv}`;
}

/** ¿El dígito verificador cuadra con el cuerpo? */
export function rutValido(rut: string | null | undefined): boolean {
  const normal = normalizarRut(rut);
  if (!normal) return false;
  const [cuerpo, dv] = normal.split("-");
  return digitoVerificador(cuerpo) === dv;
}

/** Para mostrar e imprimir: `12.345.678-9`. Devuelve el texto tal cual si no es un RUT. */
export function formatearRut(rut: string | null | undefined): string {
  const normal = normalizarRut(rut);
  if (!normal) return rut ?? "";
  const [cuerpo, dv] = normal.split("-");
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
