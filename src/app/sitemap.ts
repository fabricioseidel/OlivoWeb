import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/productos`, priority: 0.8 },
    { url: `${base}/carrito`, priority: 0.6 },
  ];
}
