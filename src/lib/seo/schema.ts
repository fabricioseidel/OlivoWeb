/**
 * Generadores de JSON-LD (schema.org) tipados.
 *
 * REGLAS:
 * - Todo se renderiza server-side vía <JsonLd /> — nunca inyectado desde el cliente.
 * - Nunca se emiten propiedades con valor null/undefined: JSON-LD con nulls es
 *   inválido y Google descarta el bloque completo.
 * - Nunca marcar algo que no esté visible en el HTML de la página.
 */

import { BUSINESS, type CourierSlug, type Comuna } from "@/lib/seo/business";

/** @id estable del negocio: el resto de los schemas lo referencian. */
export const STORE_ID = `${BUSINESS.url}/#store`;

type JsonLdObject = Record<string, unknown>;

/** Elimina claves con undefined/null y objetos/arrays vacíos, recursivamente. */
function clean<T extends JsonLdObject>(obj: T): T {
  const out: JsonLdObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      out[key] = value;
      continue;
    }
    if (typeof value === "object") {
      const nested = clean(value as JsonLdObject);
      if (Object.keys(nested).length === 0) continue;
      out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out as T;
}

/** PostalAddress reutilizable. */
function postalAddress(): JsonLdObject {
  return {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.streetAddress,
    addressLocality: BUSINESS.address.addressLocality,
    addressRegion: BUSINESS.address.addressRegion,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.addressCountry,
  };
}

/** areaServed como lista de City. */
function areaServed(comunas: readonly Comuna[] = BUSINESS.comunas): JsonLdObject[] {
  return comunas.map((c) => ({
    "@type": "City",
    name: c.nombre,
    addressRegion: BUSINESS.address.addressRegion,
    addressCountry: BUSINESS.address.addressCountry,
  }));
}

function openingHoursSpecification(): JsonLdObject[] {
  return BUSINESS.openingHours.map((tramo) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: tramo.dayOfWeek,
    opens: tramo.opens,
    closes: tramo.closes,
  }));
}

/**
 * Schema principal del negocio. Se emite UNA sola vez por página
 * (home y /tienda-nunoa) — dos bloques con el mismo @id en una página se
 * consideran conflicto y Google puede ignorar ambos.
 */
export function groceryStoreSchema(images: string[] = []): JsonLdObject {
  const geoOk =
    typeof BUSINESS.geo.latitude === "number" &&
    typeof BUSINESS.geo.longitude === "number";

  return clean({
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": STORE_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    description: BUSINESS.description,
    url: BUSINESS.url,
    telephone: BUSINESS.phoneE164,
    email: BUSINESS.email,
    priceRange: "$$",
    currenciesAccepted: "CLP",
    paymentAccepted: "Efectivo, Tarjeta de débito, Tarjeta de crédito",
    image: images.length > 0 ? images : undefined,
    address: postalAddress(),
    // geo y hasMap se omiten mientras no haya datos reales confirmados
    geo: geoOk
      ? {
          "@type": "GeoCoordinates",
          latitude: BUSINESS.geo.latitude,
          longitude: BUSINESS.geo.longitude,
        }
      : undefined,
    hasMap: BUSINESS.googleCid
      ? `https://maps.google.com/?cid=${BUSINESS.googleCid}`
      : undefined,
    openingHoursSpecification: openingHoursSpecification(),
    areaServed: areaServed(),
    sameAs: [BUSINESS.instagram, BUSINESS.uberEats],
    makesOffer: BUSINESS.services.map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: `${s.nombre} en Ñuñoa`,
        description: s.descripcion,
      },
    })),
  });
}

/**
 * Schema de un servicio de courier. Un bloque por página de courier —
 * apilar los 4 en la home diluye la relevancia de cada uno.
 */
export function serviceSchema(slug: CourierSlug): JsonLdObject | null {
  const service = BUSINESS.services.find((s) => s.slug === slug);
  if (!service) return null;

  return clean({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${BUSINESS.url}/punto-de-envio/${service.slug}/#service`,
    name: `${service.nombre} en Ñuñoa — Olivo Market`,
    serviceType: `Punto de retiro y envío ${service.nombre}`,
    description: service.descripcion,
    provider: { "@id": STORE_ID },
    areaServed: areaServed(),
    availableChannel: {
      "@type": "ServiceChannel",
      serviceLocation: {
        "@type": "Place",
        name: BUSINESS.name,
        address: postalAddress(),
      },
      servicePhone: BUSINESS.phoneE164,
      serviceUrl: `${BUSINESS.url}/punto-de-envio/${service.slug}`,
    },
  });
}

/** BreadcrumbList para rutas anidadas. `items` en orden raíz → hoja. */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>
): JsonLdObject {
  return clean({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BUSINESS.url}${item.path}`,
    })),
  });
}

/** Product + Offer para fichas de producto. */
export function productSchema(product: {
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  slug: string;
  inStock?: boolean;
}): JsonLdObject {
  return clean({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.image || undefined,
    url: `${BUSINESS.url}/productos/${product.slug}`,
    offers: clean({
      "@type": "Offer",
      price: typeof product.price === "number" ? product.price : undefined,
      priceCurrency: "CLP",
      availability:
        product.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: `${BUSINESS.url}/productos/${product.slug}`,
      seller: { "@id": STORE_ID },
    }),
  });
}

/**
 * FAQPage. SOLO debe usarse con preguntas que estén visibles en el HTML de la
 * página — marcar FAQs ocultas es una violación de las guías de Google.
 */
export function faqSchema(
  faqs: ReadonlyArray<{ pregunta: string; respuesta: string }>
): JsonLdObject | null {
  if (faqs.length === 0) return null;
  return clean({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.pregunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.respuesta,
      },
    })),
  });
}
