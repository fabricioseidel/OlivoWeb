import type { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { slugify } from '@/utils/string-utils';

export const revalidate = 3600; // regenerar cada hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000';

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${base}/productos`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${base}/categorias`, priority: 0.8, changeFrequency: 'weekly' },
    { url: `${base}/ofertas`, priority: 0.8, changeFrequency: 'daily' },
    { url: `${base}/contacto`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${base}/bienvenidos`, priority: 0.5, changeFrequency: 'monthly' },
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
