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

export default function robots(): MetadataRoute.Robots {
  const base = BUSINESS.url;

  return {
    rules: [
      // Zonas privadas: fuera del índice para cualquier bot
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/mi-cuenta', '/checkout', '/carrito', '/login', '/registro'],
      },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: ['/admin', '/api', '/mi-cuenta', '/checkout'],
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
