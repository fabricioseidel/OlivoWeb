import type { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase-server';
import { slugify } from '@/utils/string-utils';
import { isProductVisible, mapSupaToUI } from '@/services/products';
import type { SupaProduct } from '@/types';
import { BUSINESS } from '@/lib/seo/business';
import { RUTA_FIESTAS_PATRIAS, enTemporadaDieciochera } from '@/lib/fiestas-patrias';

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

    // La sección dieciochera se declara todo el año —la URL es estable y
    // conviene que conserve su historial— pero en septiembre sube de
    // prioridad y de frecuencia, que es cuando el catálogo se mueve a diario.
    {
      url: `${base}${RUTA_FIESTAS_PATRIAS}`,
      priority: enTemporadaDieciochera() ? 0.9 : 0.4,
      changeFrequency: enTemporadaDieciochera() ? 'daily' : 'yearly',
      lastModified: now,
    },
    { url: `${base}/contacto`, priority: 0.6, changeFrequency: 'monthly', lastModified: now },
    { url: `${base}/bienvenidos`, priority: 0.5, changeFrequency: 'monthly', lastModified: now },

    // Documentos legales: prioridad baja porque no compiten por búsquedas,
    // pero se declaran igual — un comercio que los esconde da mala señal.
    { url: `${base}/legal/terminos`, priority: 0.3, changeFrequency: 'yearly', lastModified: now },
    { url: `${base}/legal/privacidad`, priority: 0.3, changeFrequency: 'yearly', lastModified: now },
    { url: `${base}/legal/devoluciones`, priority: 0.3, changeFrequency: 'yearly', lastModified: now },
  ];

  // Productos y categorías salen de lo que la tienda de verdad muestra: la
  // misma regla que la vitrina (`isProductVisible`: nombre, categoría, precio,
  // foto y costo cargado). Antes entraba todo producto activo, también los
  // que la tienda oculta, y el buscador recibía URLs que el cliente ve como
  // "Producto no encontrado".
  //
  // Categorías: cada una es una página propia con su metadata, así que vale
  // la pena declararlas, pero SOLO las que tienen productos visibles y no
  // están desactivadas: enviar categorías vacías al buscador es contenido
  // pobre y resta más de lo que suma.
  let categoryPages: MetadataRoute.Sitemap = [];
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const [{ data: rows }, { data: inactivas }] = await Promise.all([
      supabaseServer
        .from('products')
        .select('barcode, name, category, sale_price, offer_price, image_url, is_active, purchase_price, updated_at')
        .eq('is_active', true)
        .limit(2000),
      supabaseServer.from('categories').select('name').eq('is_active', false),
    ]);

    const visibles = (rows || []).filter((r) => r.name && isProductVisible(mapSupaToUI(r as SupaProduct)));

    productPages = visibles.map((p) => ({
      url: `${base}/productos/${slugify(p.name)}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    }));

    const apagadas = new Set((inactivas || []).map((c) => slugify(String(c.name))));
    const slugs = new Set<string>();
    for (const row of visibles) {
      // `category` guarda las categorías separadas por coma.
      for (const name of String(row.category ?? '').split(',')) {
        const slug = slugify(name.trim());
        if (slug && !apagadas.has(slug)) slugs.add(slug);
      }
    }

    categoryPages = [...slugs].map((slug) => ({
      url: `${base}/categorias/${slug}`,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
      lastModified: now,
    }));
  } catch {
    // Si la BD no está disponible, devolver al menos las páginas estáticas
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
