import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import FiestasPatriasClient from "./FiestasPatriasClient";

/**
 * Sección de Fiestas Patrias.
 *
 * Vive en su propia ruta —y no como un filtro de /productos— porque en
 * septiembre "empanadas de pino Ñuñoa" es una búsqueda con volumen propio y
 * necesita una página con título, descripción y contenido que la respalden.
 * La ruta queda publicada todo el año: la campaña se enciende sola cada
 * septiembre y borrar la URL en octubre desperdiciaría el posicionamiento
 * ganado.
 */

const TITULO = "Fiestas Patrias 2025 | Empanadas de pino y productos para el 18 · Olivo Market Ñuñoa";
const DESCRIPCION =
  "Anticipa tu pedido de Fiestas Patrias en Olivo Market Ñuñoa: empanadas de pino y todo para la mesa del 18. Retiro en Av. José Pedro Alessandri 2010 o despacho en Ñuñoa, Macul, Peñalolén y San Joaquín.";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.url),
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/fiestas-patrias" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    title: TITULO,
    description: DESCRIPCION,
    url: "/fiestas-patrias",
  },
};

// El contenido depende del catálogo, que se carga en el cliente; la cáscara
// se revalida cada hora para no quedar pegada en el cache de la CDN.
export const revalidate = 3600;

export default function FiestasPatriasPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Fiestas Patrias", path: "/fiestas-patrias" },
        ])}
      />
      <FiestasPatriasClient />
    </>
  );
}
