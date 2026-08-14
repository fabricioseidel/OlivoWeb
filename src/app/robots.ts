import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/lib/seo/business';

/**
 * Se permiten explícitamente los crawlers de buscadores y de motores de IA:
 * las búsquedas locales cada vez se resuelven más dentro de asistentes, y para
 * aparecer ahí el contenido tiene que ser rastreable.
 */
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Google-Extended',
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'CCBot',
];

/**
 * Rutas que nunca deben rastrearse: no son páginas, son endpoints y panel
 * interno. Aquí sí corresponde bloquear en robots.txt.
 */
const NEVER_CRAWL = ['/admin', '/api', '/operaciones', '/uber-eats-editor', '/debug'];

/**
 * Las zonas privadas del cliente (carrito, checkout, cuenta, acceso) NO se
 * bloquean aquí a propósito.
 *
 * Un `Disallow` impide el rastreo, y por lo tanto impide que el buscador lea
 * la etiqueta `noindex` de esas páginas. El resultado clásico es que la URL
 * igual aparece en resultados, sin título ni descripción, porque alguien la
 * enlazó. Dejándolas rastreables, el bot entra, encuentra el `noindex` que
 * declara cada layout y las deja fuera del índice de verdad.
 */
export default function robots(): MetadataRoute.Robots {
  const base = BUSINESS.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: NEVER_CRAWL,
      },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: NEVER_CRAWL,
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
