/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["cloudinary"],
  serverActions: {
    bodySizeLimit: '10mb',
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
