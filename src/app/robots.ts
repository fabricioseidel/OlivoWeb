import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Mismo orden de prioridad que sitemap.ts — antes robots.ts solo miraba
  // NEXTAUTH_URL, así que si ese env var faltaba o apuntaba a otro host el
  // Sitemap: del robots.txt quedaba apuntando al lugar equivocado.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Rutas privadas/no indexables: no vale la pena gastar crawl budget
        // en ellas, y evita que terminen indexadas por accidente.
        disallow: [
          '/admin',
          '/api',
          '/checkout',
          '/carrito',
          '/mi-cuenta',
          '/mis-pedidos',
          '/login',
          '/registro',
          '/perfil',
          '/dashboard',
          '/debug',
          '/uber-eats-editor',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
