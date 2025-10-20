import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep existing remote patterns, but narrow transformations by using sensible defaults
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Encourage reuse of generated variants and modern formats
    deviceSizes: [320, 640, 828, 1080],
    imageSizes: [16, 32, 48, 64, 96],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 day cache TTL for optimized images
  },
};

export default nextConfig;
