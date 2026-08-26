import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/seo/business";

/**
 * Envoltorio común de las tres páginas legales.
 *
 * Comparten identificación del proveedor, fecha de vigencia y navegación entre
 * ellas, así que vive en un solo sitio: si cambia el RUT o la dirección, no hay
 * que acordarse de tocar tres archivos.
 */

/**
 * Fecha desde la que rigen los textos. Se actualiza a mano cuando el contenido
 * cambia de fondo — no se pone `new Date()`, que mostraría la fecha de hoy en
 * cada visita y haría imposible saber qué versión aceptó un cliente.
 */
export const VIGENCIA = "26 de agosto de 2026";

const PAGINAS = [
  { href: "/legal/terminos", label: "Términos y condiciones" },
  { href: "/legal/privacidad", label: "Política de privacidad" },
  { href: "/legal/devoluciones", label: "Cambios y devoluciones" },
];

export function LegalLayout({
  titulo,
  resumen,
  actual,
  children,
}: {
  titulo: string;
  resumen: string;
  actual: string;
  children: ReactNode;
}) {
  return (
    <div className="o-container py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Migas de pan" className="mb-6 text-sm text-neutral-500">
          <Link href="/" className="hover:text-emerald-700">
            Inicio
          </Link>
          <span className="mx-2 text-neutral-300">/</span>
          <span className="text-neutral-700">{titulo}</span>
        </nav>

        <header className="border-b border-neutral-200 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-neutral-600">{resumen}</p>
          <p className="mt-4 text-sm text-neutral-500">
            Vigente desde el {VIGENCIA}.
          </p>
        </header>

        <div className="mt-8 space-y-8">{children}</div>

        <IdentificacionProveedor />

        <nav
          aria-label="Otros documentos legales"
          className="mt-10 border-t border-neutral-200 pt-6"
        >
          <p className="mb-3 text-sm font-semibold text-neutral-900">
            Otros documentos
          </p>
          <ul className="space-y-2">
            {PAGINAS.filter((p) => p.href !== actual).map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="text-sm text-emerald-700 underline-offset-4 hover:underline"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** Sección de encabezado dentro de un documento legal. */
export function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight text-neutral-900">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>
    </section>
  );
}

/** Lista con viñetas, con el espaciado del resto del documento. */
export function Lista({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Quién es el proveedor. Es lo que permite a un cliente saber a quién le está
 * comprando y dónde reclamar, así que va al pie de los tres documentos.
 *
 * El RUT se omite mientras no esté cargado, igual que el resto de los datos
 * pendientes del negocio: se prefiere una línea de menos a un dato inventado.
 */
function IdentificacionProveedor() {
  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
      <h2 className="text-base font-bold text-neutral-900">
        Identificación del proveedor
      </h2>
      <address className="mt-3 space-y-1.5 text-sm not-italic leading-relaxed text-neutral-700">
        <p>
          <strong>{BUSINESS.legalName}</strong>, que opera bajo el nombre de
          fantasía {BUSINESS.name}.
        </p>
        {BUSINESS.rut && <p>RUT {BUSINESS.rut}</p>}
        <p>{BUSINESS.addressFull}</p>
        <p>
          <a
            href={`mailto:${BUSINESS.email}`}
            className="text-emerald-700 underline-offset-4 hover:underline"
          >
            {BUSINESS.email}
          </a>
          {" · "}
          <a
            href={`tel:${BUSINESS.phoneE164}`}
            className="text-emerald-700 underline-offset-4 hover:underline"
          >
            {BUSINESS.phoneDisplay}
          </a>
        </p>
      </address>
    </section>
  );
}
