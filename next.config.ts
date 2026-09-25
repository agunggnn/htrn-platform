import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo-adjacent checkout (E:\GitHub\package-lock.json) makes Turbopack
  // guess the workspace root. Pin it so dev/build resolve consistently.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Trim client JS: import only the icons/chart modules actually used.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  images: {
    // Product photos: local /public/products/* plus Supabase Storage uploads
    // stored in items.image_url.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
