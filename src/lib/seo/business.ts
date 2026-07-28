/**
 * Fuente de verdad única del NAP (Name / Address / Phone) y datos de negocio.
 *
 * REGLA DURA: ningún componente, landing ni schema debe hardcodear estos datos.
 * El formato de la dirección es canónico y literal — no reformatear ("Av." no se
 * expande a "Avenida", se conservan las ñ y "Local A"). Cualquier divergencia
 * entre el NAP del sitio, Google Business Profile y los directorios degrada el
 * posicionamiento local.
 */

export type CourierSlug = "mercadolibre" | "chilexpress" | "bluexpress" | "correos-de-chile";

export type CourierService = {
  slug: CourierSlug;
  nombre: string;
  /** Descripción corta usada en schema (makesOffer) y en tarjetas de UI */
  descripcion: string;
};

export type ComunaSlug = "nunoa" | "macul" | "penalolen" | "san-joaquin" | "la-reina";

export type Comuna = {
  slug: ComunaSlug;
  /** Nombre con tildes/ñ tal como debe aparecer en texto y en schema areaServed */
  nombre: string;
};

/** Un tramo horario. `closed: true` marca el día como cerrado. */
export type OpeningHours = {
  /** Días en formato schema.org (Monday, Tuesday, ...) */
  dayOfWeek: string[];
  /** "HH:MM" 24h */
  opens: string;
  closes: string;
};

export const BUSINESS = {
  name: "Olivo Market",
  legalName: "Inversiones El Olivo SpA",

  /** Frase de entidad — debe aparecer idéntica en todo el sitio. */
  entityPhrase:
    "Olivo Market — minimarket venezolano y punto de paquetería en Ñuñoa, Santiago.",

  description:
    "Minimarket de productos venezolanos y punto de paquetería en Ñuñoa. Venta online y tienda física, más retiro y envío de encomiendas de MercadoLibre, Chilexpress, Bluexpress y Correos de Chile.",

  url: "https://www.olivomarket.cl",

  // ── NAP canónico (literal, no reformatear) ──────────────────────────────
  address: {
    streetAddress: "Av. José Pedro Alessandri 2010, Local A",
    addressLocality: "Ñuñoa",
    addressRegion: "Región Metropolitana",
    postalCode: "7800280",
    addressCountry: "CL",
  },
  /** Dirección completa en una línea, para renderizar en texto plano. */
  addressFull:
    "Av. José Pedro Alessandri 2010, Local A, Ñuñoa, Región Metropolitana, Chile",

  /** Teléfono con formato legible para humanos. */
  phoneDisplay: "+56 9 2063 9745",
  /** Mismo teléfono en E.164, para href="tel:" y para schema. */
  phoneE164: "+56920639745",
  /** Sin "+" — formato que espera la API de wa.me */
  whatsappNumber: "56920639745",

  email: "olivomarket1@gmail.com",

  // ── Perfiles externos (sameAs) ──────────────────────────────────────────
  instagram: "https://www.instagram.com/olivomarkett/",
  uberEats:
    "https://www.ubereats.com/cl/store/olivo-market-nunoa/BrtCgOgzUziAUqrTXiwWrg",

  // ── Datos que requieren confirmación humana ─────────────────────────────
  /**
   * Coordenadas exactas del local. Se omiten del JSON-LD mientras sean null
   * (emitir `null` en JSON-LD lo invalida).
   * // TODO-HUMANO: obtener latitud y longitud exactas del local desde Google
   * Maps (clic derecho sobre el pin → copiar coordenadas).
   */
  geo: {
    latitude: null as number | null,
    longitude: null as number | null,
  },

  /**
   * Foto de la fachada del local, para las páginas locales y para `image[]`
   * del schema. Se omite mientras sea null — no se inventan URLs.
   * // TODO-HUMANO: subir una foto real de la fachada del local (idealmente con
   * el letrero visible) y pegar aquí su URL pública.
   */
  facadePhoto: null as string | null,

  /**
   * CID de la ficha de Google Business Profile, para construir `hasMap`.
   * // TODO-HUMANO: entregar el CID de Google Business Profile (aparece en la
   * URL larga de la ficha como `...?cid=XXXXXXXXXXXXXXXXX`).
   */
  googleCid: null as string | null,

  /**
   * Horarios de atención. Fuente única para schema, footer y /contacto —
   * cualquier divergencia entre esos tres puntos penaliza el SEO local.
   * // TODO-HUMANO: confirmar horarios reales de atención de la tienda física
   * (apertura y cierre por día, y si hay horario distinto sábado/domingo).
   */
  openingHours: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "21:00",
    },
    { dayOfWeek: ["Saturday"], opens: "10:00", closes: "21:00" },
    { dayOfWeek: ["Sunday"], opens: "11:00", closes: "18:00" },
  ] as OpeningHours[],

  /**
   * Horarios en texto legible, derivados de openingHours para mostrar en UI.
   * Se mantiene en el mismo objeto para que no exista una segunda fuente.
   */
  openingHoursDisplay: [
    { label: "Lunes a viernes", value: "09:00 – 21:00" },
    { label: "Sábado", value: "10:00 – 21:00" },
    { label: "Domingo", value: "11:00 – 18:00" },
  ],

  // ── Servicios de paquetería ─────────────────────────────────────────────
  services: [
    {
      slug: "mercadolibre",
      nombre: "MercadoLibre",
      descripcion:
        "Punto de retiro y devolución de compras de MercadoLibre con código QR.",
    },
    {
      slug: "chilexpress",
      nombre: "Chilexpress",
      descripcion:
        "Admisión de envíos y retiro de encomiendas Chilexpress en Ñuñoa.",
    },
    {
      slug: "bluexpress",
      nombre: "Bluexpress",
      descripcion:
        "Punto de entrega y retiro de encomiendas Bluexpress en Ñuñoa.",
    },
    {
      slug: "correos-de-chile",
      nombre: "Correos de Chile",
      descripcion:
        "Envío y retiro de encomiendas de Correos de Chile en Ñuñoa.",
    },
  ] as CourierService[],

  /** Comunas con cobertura de despacho. */
  comunas: [
    { slug: "nunoa", nombre: "Ñuñoa" },
    { slug: "macul", nombre: "Macul" },
    { slug: "penalolen", nombre: "Peñalolén" },
    { slug: "san-joaquin", nombre: "San Joaquín" },
    { slug: "la-reina", nombre: "La Reina" },
  ] as Comuna[],
} as const;

/** Enlace de WhatsApp con mensaje pre-cargado. */
export function whatsappLink(mensaje: string): string {
  return `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
}

/** Busca un servicio de courier por slug. */
export function getService(slug: CourierSlug): CourierService | undefined {
  return BUSINESS.services.find((s) => s.slug === slug);
}
