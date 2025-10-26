import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Image optimization for external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'arxiv.org',
      },
      {
        protocol: 'https',
        hostname: 'huggingface.co',
      },
    ],
    minimumCacheTTL: 60,
  },

  // Runtime configuration
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // Monorepo configuration - trace files in parent directory
  outputFileTracingRoot: path.join(__dirname, '../'),

  // Production build optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-dialog', 'framer-motion'],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },

  // Rewrites for API consistency - direct SSE calls to backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/ai-interpretation',
        destination: `${backendUrl}/api/ai-interpretation`,
      },
    ];
  },
};

export default nextConfig;
