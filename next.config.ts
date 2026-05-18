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
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
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
    ];
  },
};

export default nextConfig;
