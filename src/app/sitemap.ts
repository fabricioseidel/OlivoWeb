import type { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { slugify } from '@/utils/string-utils';
import { BUSINESS } from '@/lib/seo/business';

export const revalidate = 3600; // regenerar cada hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // El dominio canónico manda: NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL pueden apuntar
  // a un preview de Vercel y ensuciarían el sitemap de producción.
  const base = BUSINESS.url;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0, changeFrequency: 'daily', lastModified: now },
    { url: `${base}/productos`, priority: 0.9, changeFrequency: 'daily', lastModified: now },

    // Landings locales (SEO Ñuñoa)
    { url: `${base}/tienda-nunoa`, priority: 0.9, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/punto-de-envio`, priority: 0.9, changeFrequency: 'monthly', lastModified: now },
    ...BUSINESS.services.map((s) => ({
      url: `${base}/punto-de-envio/${s.slug}`,
      priority: 0.8,
      changeFrequency: 'monthly' as const,
      lastModified: now,
    })),
    { url: `${base}/delivery/nunoa`, priority: 0.8, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/delivery/macul`, priority: 0.7, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/delivery/penalolen`, priority: 0.7, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/delivery/san-joaquin`, priority: 0.7, changeFrequency: 'monthly', lastModified: now },

    { url: `${base}/categorias`, priority: 0.8, changeFrequency: 'weekly', lastModified: now },
    { url: `${base}/ofertas`, priority: 0.8, changeFrequency: 'daily', lastModified: now },
    { url: `${base}/contacto`, priority: 0.6, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/bienvenidos`, priority: 0.5, changeFrequency: 'monthly', lastModified: now },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const { data: products } = await supabaseServer
      .from('products')
      .select('name, updated_at')
      .eq('is_active', true)
      .limit(1000);

    productPages = (products || [])
      .filter((p) => p.name)
      .map((p) => ({
        url: `${base}/productos/${slugify(p.name)}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        priority: 0.7,
        changeFrequency: 'weekly' as const,
      }));
  } catch {
    // Si la BD no está disponible, devolver al menos las páginas estáticas
  }

  return [...staticPages, ...productPages];
}
