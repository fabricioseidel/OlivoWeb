import type { Metadata } from "next";

/**
 * Zona privada: no aporta nada en resultados de búsqueda y gasta presupuesto
 * de rastreo. El bloqueo en robots.txt impide el rastreo, pero una página
 * enlazada desde fuera puede igual aparecer listada sin contenido; esta
 * directiva la deja fuera del índice de forma explícita.
 */
export const metadata: Metadata = {
  // `noindex` deja la página fuera de Google, pero el título sigue siendo lo
  // que se lee en la pestaña. Sin uno propio, las tres zonas privadas se
  // llamaban igual ("Olivo Market") y no se distinguían entre sí.
  title: 'Crear cuenta',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
