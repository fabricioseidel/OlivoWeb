import React from "react";

/**
 * Guirnalda de banderines. Es la firma visual de la campaña: aparece bajo el
 * encabezado, sobre la sección y en el pie de las tarjetas dieciocheras.
 *
 * Se dibuja con CSS (ver `.fp-guirnalda` en globals.css) en vez de una
 * imagen: se estira a cualquier ancho sin pixelarse y no agrega una request.
 */
export default function GuirnaldaChilena({
  variante = "rojo",
  className = "",
}: {
  variante?: "rojo" | "azul";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`fp-guirnalda ${variante === "azul" ? "fp-guirnalda-azul" : ""} ${className}`}
    />
  );
}
