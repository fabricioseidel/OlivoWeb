// Bloques configurables de la página de inicio (Constructor Visual).
// Compartido entre la API de settings, el constructor del admin y la homepage.

export type PageBlockType =
  | 'hero'
  | 'features'
  | 'products'
  | 'banner'
  | 'offers'
  | 'categories'
  | 'more_products'
  | 'fiestas_patrias'
  | 'newsletter';

export type PageBlock = {
  id: string;
  type: PageBlockType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  itemsToShow?: number;
  config?: Record<string, unknown>;
};

export const BLOCK_TYPE_LABELS: Record<PageBlockType, string> = {
  hero: 'Portada (Hero)',
  features: 'Beneficios',
  products: 'Más vendidos',
  banner: 'Banner promocional',
  offers: 'Ofertas',
  categories: 'Categorías',
  more_products: 'Más productos',
  fiestas_patrias: 'Fiestas Patrias (septiembre)',
  newsletter: 'Newsletter',
};

export const BLOCK_TYPE_DESCRIPTIONS: Record<PageBlockType, string> = {
  hero: 'Encabezado principal con buscador y botones',
  features: 'Franja de beneficios (envío, garantía, pago seguro)',
  products: 'Grilla de productos destacados y más vendidos',
  banner: 'Banner de promoción con botón',
  offers: 'Grilla de productos con precio de oferta',
  categories: 'Grilla visual de categorías',
  more_products: 'Segunda grilla con el resto del catálogo',
  fiestas_patrias:
    'Banner y vitrina dieciochera. Se muestra solo durante septiembre y se apaga sola el 1 de octubre',
  newsletter: 'Formulario de suscripción al newsletter',
};

// Layout por defecto: replica el orden de la portada original
export const DEFAULT_BLOCKS: PageBlock[] = [
  {
    id: 'b1',
    type: 'hero',
    enabled: true,
    // El título del hero es el <h1> de la portada: debe nombrar la comuna y el
    // posicionamiento dual (minimarket + paquetería) por SEO local.
    //
    // Decía "Productos venezolanos", que es el 1,7% del catálogo: dejaba fuera
    // de las búsquedas a quien busca abarrotes, helados o panadería en Ñuñoa.
    title: 'Minimarket en Ñuñoa con despacho a domicilio y punto de encomiendas',
    subtitle: 'Minimarket y punto de encomiendas · Ñuñoa',
    description:
      'Más de 700 productos: abarrotes, bebidas, lácteos, panadería, helados y aseo. Retiro y envío de encomiendas en Av. José Pedro Alessandri 2010, Ñuñoa.',
    buttonText: 'Comprar ahora',
    buttonLink: '/productos',
  },
  { id: 'b4', type: 'features', enabled: true },
  // Va inmediatamente bajo el hero: en septiembre la campaña dieciochera es
  // lo primero que la tienda quiere mostrar. El bloque se auto-oculta fuera
  // de temporada, así que puede quedar activo todo el año sin molestar.
  {
    id: 'b9',
    type: 'fiestas_patrias',
    enabled: true,
    title: '¡Anticipa tu pedido para estas Fiestas Patrias!',
    description:
      'Disfruten con nuestras ricas empanadas de pino y todo lo que necesitan para la mesa dieciochera. Encarga con tiempo: el 18 se agota.',
    buttonText: 'Ver productos dieciocheros',
    buttonLink: '/fiestas-patrias',
    itemsToShow: 10,
  },
  { id: 'b3', type: 'products', enabled: true, title: 'Lo más vendido', itemsToShow: 10 },
  {
    id: 'b6',
    type: 'banner',
    enabled: true,
    title: 'Descuentos hasta 40% OFF',
    description: 'En productos seleccionados de toda la tienda',
    buttonText: 'Ver ofertas',
    buttonLink: '/ofertas',
  },
  { id: 'b7', type: 'offers', enabled: true, title: 'Ofertas especiales', itemsToShow: 10 },
  { id: 'b2', type: 'categories', enabled: true, title: 'Nuestras categorías' },
  { id: 'b8', type: 'more_products', enabled: true, title: 'Más productos', itemsToShow: 10 },
  {
    id: 'b5',
    type: 'newsletter',
    enabled: true,
    title: '🌿 Únete a la familia Olivo',
    description: 'Recibe ofertas exclusivas, cupones de descuento y novedades directamente en tu email.',
  },
];
