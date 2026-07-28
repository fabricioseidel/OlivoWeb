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
    title: 'Olivo Market Ñuñoa — Productos venezolanos y punto de envíos',
    description:
      'Minimarket venezolano y punto de retiro y envío de encomiendas en Av. José Pedro Alessandri 2010, Ñuñoa.',
    buttonText: 'Comprar ahora',
    buttonLink: '/productos',
  },
  { id: 'b4', type: 'features', enabled: true },
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
