/**
 * Política de contenido en modo SÓLO REPORTE: no bloquea nada, el navegador
 * avisa a /api/csp-report cada vez que la página carga algo fuera de la
 * lista. Cuando los reportes muestren sólo ruido (extensiones del navegador),
 * se puede pasar a `Content-Security-Policy` y empezar a bloquear.
 */
const CSP_SOLO_REPORTE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://images.unsplash.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self' https://*.mercadopago.com https://*.mercadopago.cl https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  serverExternalPackages: ["cloudinary"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 días
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_SOLO_REPORTE },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Sales workflow consolidated into the POS page
      { source: "/admin/productos/venta-rapida", destination: "/admin/pos", permanent: true },
      { source: "/admin/productos/venta-rapida-iphone", destination: "/admin/pos", permanent: true },
      // Purchase workflow consolidated — keep regular compra-rapida as canonical
      { source: "/admin/productos/compra-rapida-iphone", destination: "/admin/productos/compra-rapida", permanent: true },
      // Reabastecimiento sub-pages now live as tabs in the main page
      { source: "/admin/reabastecimiento/sugerencias", destination: "/admin/reabastecimiento?tab=sugerencias", permanent: true },
      { source: "/admin/reabastecimiento/recepcion", destination: "/admin/reabastecimiento?tab=recepcion", permanent: true },
      // /centro-logistico y /punto-de-envio cubrían el mismo tema (paquetería) y
      // competían entre sí por las mismas búsquedas. /punto-de-envio es la
      // canónica: tiene FAQPage, páginas por courier y segmentación local.
      { source: "/centro-logistico", destination: "/punto-de-envio", permanent: true },
    ];
  },
};

export default nextConfig;
