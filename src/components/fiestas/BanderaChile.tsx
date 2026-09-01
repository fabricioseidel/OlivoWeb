import React from "react";

/**
 * Bandera de Chile en SVG, con las proporciones oficiales (2:3, cantón
 * cuadrado de 1/3 del largo y estrella centrada en él).
 *
 * Va en SVG y no como emoji 🇨🇱 porque el emoji se renderiza distinto en cada
 * sistema —en Windows ni siquiera dibuja la bandera, muestra las letras "CL"—
 * y esta marca aparece en el encabezado de la campaña.
 *
 * Es decoración: siempre `aria-hidden`, el significado lo lleva el texto.
 */
export default function BanderaChile({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="900" height="300" fill="#ffffff" />
      <rect y="300" width="900" height="300" fill="#c8102e" />
      <rect width="300" height="300" fill="#0f3b8c" />
      <path
        fill="#ffffff"
        d="M150 60l21.3 65.4h68.8l-55.7 40.5 21.3 65.5-55.7-40.5-55.7 40.5 21.3-65.5-55.7-40.5h68.8z"
      />
    </svg>
  );
}
