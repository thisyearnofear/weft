import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fal.run',
      },
      {
        protocol: 'https',
        hostname: '**.0g.ai',
      },
    ],
  },
};

export default nextConfig;
