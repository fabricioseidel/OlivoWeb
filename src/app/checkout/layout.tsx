import type { Metadata } from "next";

/**
 * Zona privada: no aporta nada en resultados de búsqueda y gasta presupuesto
 * de rastreo. El bloqueo en robots.txt impide el rastreo, pero una página
 * enlazada desde fuera puede igual aparecer listada sin contenido; esta
 * directiva la deja fuera del índice de forma explícita.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
