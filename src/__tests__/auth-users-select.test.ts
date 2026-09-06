/**
 * Las columnas que el login necesita leer del usuario.
 *
 * `getUserByEmail` usa un `select` explícito, y el `authorize` de NextAuth
 * decide con lo que ese select traiga. Si falta una columna, el valor llega
 * como `undefined` — no como error — y la comprobación que la usa falla en
 * silencio para **todas** las cuentas.
 *
 * Pasó al agregar la verificación de correo: `email_verified_at` no estaba en
 * el select, así que la comprobación habría bloqueado el inicio de sesión de
 * todo el mundo, incluida la cuenta de administrador. Este test lee el archivo
 * fuente porque lo que se protege es justamente el texto de la consulta.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const FUENTE = fs.readFileSync(
  path.join(process.cwd(), "src/services/auth-users.ts"),
  "utf8"
);

/** Lo que el login lee del usuario y no puede faltar. */
const COLUMNAS_QUE_USA_EL_LOGIN = [
  "id",
  "email",
  "password_hash",
  "role",
  "email_verified_at",
];

describe("el select del login", () => {
  const select = FUENTE.match(/\.select\("([^"]+)"\)/)?.[1] ?? "";

  it("existe y es explícito", () => {
    expect(select.length).toBeGreaterThan(0);
  });

  it.each(COLUMNAS_QUE_USA_EL_LOGIN)("trae %s", (columna) => {
    const columnas = select.split(",").map((c) => c.trim());
    expect(columnas).toContain(columna);
  });
});
