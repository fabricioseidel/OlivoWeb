"use client";

import { useState } from "react";

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Valor confirmado en el estado de la página (cambio pendiente o valor guardado). */
  value: number | string | null | undefined;
  /** Recibe el texto crudo del input; la página lo parsea y decide si es un cambio. */
  onValueChange: (raw: string) => void;
}

/**
 * Input numérico que respeta lo que la persona está escribiendo.
 *
 * El problema que resuelve: la página descarta un cambio cuando el valor no es
 * un número (`parseFloat("")` es NaN) y entonces vuelve a entregar el valor
 * guardado. Con un input controlado puro, borrar el precio para reescribirlo
 * era imposible: al dejar el campo vacío reaparecía solo el precio viejo, y
 * había que escribir encima de la selección para poder cambiarlo.
 *
 * Mientras el campo tiene el foco manda el borrador local, así que se puede
 * dejar vacío y escribir con calma. Al salir del campo se suelta el borrador y
 * vuelve a mostrarse el valor real del estado: si lo que quedó no era un
 * número válido, se ve otra vez el valor guardado, que es lo que de verdad
 * quedó registrado.
 */
export default function NumericInput({ value, onValueChange, onBlur, ...rest }: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const confirmado = value === null || value === undefined ? "" : String(value);
  const mostrado = draft ?? confirmado;

  return (
    <input
      {...rest}
      type="number"
      value={mostrado}
      onChange={(e) => {
        setDraft(e.target.value);
        onValueChange(e.target.value);
      }}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
