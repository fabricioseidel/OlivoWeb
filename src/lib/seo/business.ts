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
  /** Qué se puede hacer con este courier en el local. */
  puedeHacer: string[];
  /** Servicios que este courier NO ofrece acá (evita viajes en vano). */
  noDisponible?: string[];
  /**
   * Horario propio del courier, si difiere del horario del minimarket.
   * `null` = se atiende en el horario corrido de la tienda.
   */
  horarioPropio: { dayOfWeek: string[]; opens: string; closes: string } | null;
  /** Horario legible para mostrar en la UI. */
  horarioDisplay: string;
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

  /**
   * RUT de la sociedad, para identificar al proveedor en los documentos
   * legales. Se omite del texto mientras sea null — no se inventa.
   * // TODO-HUMANO: entregar el RUT de Inversiones El Olivo SpA. Los términos
   * y condiciones de un comercio chileno deben identificar al proveedor.
   */
  rut: null as string | null,

  /**
   * Frase de entidad — debe aparecer idéntica en todo el sitio.
   *
   * Decía "minimarket venezolano". El catálogo real son ~725 productos activos
   * en 21 categorías, de los cuales los etiquetados como venezolanos son 13:
   * el 1,7%. Esa frase escondía el 98% de lo que se vende y dejaba fuera de
   * las búsquedas a quien busca "helados en Ñuñoa" o "punto Chilexpress
   * Ñuñoa" — mientras quien llegaba buscando leche veía una tienda de
   * especialidades y se iba.
   *
   * Lo venezolano sigue siendo un diferenciador y tiene su propia sección,
   * pero no encabeza: encabeza lo que la tienda es.
   */
  entityPhrase:
    "Olivo Market — minimarket y punto de paquetería en Ñuñoa, Santiago.",

  description:
    "Minimarket en Ñuñoa con más de 700 productos: abarrotes, bebidas, lácteos, panadería, helados, cecinas, snacks, dulces y aseo. También punto de retiro y envío de encomiendas de MercadoLibre, Chilexpress, Bluexpress y Correos de Chile. Compra online con despacho a domicilio o retira en tienda.",

  /**
   * Tamaño del catálogo, para el texto público.
   *
   * Es un PISO deliberadamente conservador, no la cifra exacta: al 27-ago-2026
   * había 725 productos activos y 21 categorías. Se redondea hacia abajo para
   * que el texto no quede desmentido si se dan de baja productos. Si el
   * catálogo creciera mucho, conviene subirlo — decir "más de 700" con 1.500
   * productos es venderse por debajo.
   */
  catalogo: {
    productosDesde: 700,
    categoriasDesde: 20,
  },

  /**
   * Las categorías fuertes, en orden de peso real en el catálogo.
   *
   * Se usan en los textos de las landings y en el schema. Salen del catálogo,
   * no de una lista inventada: enumerar categorías que no se tienen genera
   * visitas que se van sin comprar.
   */
  categoriasDestacadas: [
    "Bebidas",
    "Abarrotes",
    "Chocolates y dulces",
    "Aseo del hogar",
    "Lácteos",
    "Galletas",
    "Snacks",
    "Aguas",
    "Bebidas energéticas",
    "Panadería",
    "Jugos",
    "Helados",
    "Cecinas y quesos",
    "Salsas y conservas",
    "Café",
  ] as string[],

  /**
   * Lo que distingue a Olivo Market de otro minimarket del barrio.
   *
   * Sirve para los textos de las landings: contra un almacén de esquina o una
   * cadena, lo que decide no es tener abarrotes —eso lo tienen todos— sino
   * estas cuatro cosas juntas en un mismo local.
   */
  diferenciadores: [
    {
      titulo: "Cuatro couriers en un mismo local",
      detalle:
        "Retiro y envío de MercadoLibre, Chilexpress, Bluexpress y Correos de Chile sin ir a cuatro sitios distintos.",
    },
    {
      titulo: "Despacho propio a domicilio",
      detalle:
        "Reparto en Ñuñoa y comunas vecinas el mismo día si el pedido entra temprano.",
    },
    {
      titulo: "Abierto todos los días",
      detalle:
        "De lunes a viernes desde las 07:45 y hasta las 20:30; sábados y domingos de 10:00 a 18:00.",
    },
    {
      titulo: "Productos venezolanos que no están en el supermercado",
      detalle:
        "Harina de maíz, salsas, dulces y marcas que no se consiguen en las cadenas.",
    },
  ] as { titulo: string; detalle: string }[],

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
  /** Coordenadas exactas del local, provistas por Fabri (30-jul-2026). */
  geo: {
    latitude: -33.472904287482656 as number | null,
    longitude: -70.59850517606597 as number | null,
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
   * Horario del minimarket. Fuente única para schema, footer y /contacto —
   * cualquier divergencia entre esos tres puntos penaliza el SEO local.
   * Confirmado por el dueño.
   */
  openingHours: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "07:45",
      closes: "20:30",
    },
    { dayOfWeek: ["Saturday", "Sunday"], opens: "10:00", closes: "18:00" },
  ] as OpeningHours[],

  /**
   * Horarios en texto legible, derivados de openingHours para mostrar en UI.
   * Se mantiene en el mismo objeto para que no exista una segunda fuente.
   */
  openingHoursDisplay: [
    { label: "Lunes a viernes", value: "07:45 – 20:30" },
    { label: "Sábado y domingo", value: "10:00 – 18:00" },
  ],

  /**
   * Colecta: hora a la que las compañías retiran lo admitido en el local.
   * Es el dato que responde "¿hasta qué hora puedo dejar un paquete?".
   */
  colecta: {
    horaLimite: "16:00",
    resumen:
      "Las compañías retiran de lunes a viernes antes de las 16:00. Seguimos recibiendo paquetes después de esa hora y también los fines de semana: simplemente salen en la siguiente colecta hábil, no se rechaza ninguno.",
  },

  // ── Servicios de paquetería ─────────────────────────────────────────────
  services: [
    {
      slug: "mercadolibre",
      nombre: "MercadoLibre",
      descripcion:
        "Punto de retiro, envío, devolución y cambio de compras de MercadoLibre con código QR.",
      puedeHacer: [
        "Enviar paquetes ya etiquetados (vendedores)",
        "Retirar tus compras (pickup), con 7 días de plazo para pasar a buscarlas",
        "Devolver compras de MercadoLibre, solo con código QR",
        "Cambiar productos, coordinando antes por la app y con código QR",
      ],
      horarioPropio: null,
      horarioDisplay: "Horario corrido del minimarket",
    },
    {
      slug: "chilexpress",
      nombre: "Chilexpress",
      descripcion:
        "Recepción y envío de encomiendas Chilexpress y Falabella en Ñuñoa.",
      puedeHacer: [
        "Recibir encomiendas Chilexpress",
        "Recibir envíos de Falabella, que despacha por Chilexpress",
        "Enviar encomiendas",
      ],
      noDisponible: [
        "Servicio de cobro (pago contra entrega)",
        "Western Union",
        "Impresión de etiquetas",
      ],
      // Único courier con horario propio: no opera fines de semana.
      horarioPropio: {
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "20:00",
      },
      horarioDisplay: "Lunes a viernes, 08:00 – 20:00",
    },
    {
      slug: "bluexpress",
      nombre: "Bluexpress",
      descripcion:
        "Punto Bluexpress con impresión de etiquetas, envío, devolución, pickup y sistema de cobro.",
      puedeHacer: [
        "Imprimir etiquetas adhesivas en el local (tenemos máquina)",
        "Enviar paquetes con etiqueta creada antes en la app",
        "Enviar paquetes preetiquetados (vendedores)",
        "Devolver paquetes",
        "Pagar encomiendas: contamos con sistema de cobro Bluexpress",
        "Retirar tus pedidos (pickup)",
      ],
      horarioPropio: null,
      horarioDisplay: "Horario corrido del minimarket",
    },
    {
      slug: "correos-de-chile",
      nombre: "Correos de Chile",
      descripcion:
        "Punto de retiro (pickup) y envío de encomiendas preetiquetadas de Correos de Chile.",
      puedeHacer: [
        "Retirar tus encomiendas (pickup)",
        "Enviar encomiendas preetiquetadas",
      ],
      horarioPropio: null,
      horarioDisplay: "Horario corrido del minimarket",
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
