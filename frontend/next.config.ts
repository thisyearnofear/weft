import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Three.js / GSAP transpilation
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', 'gsap'],
};

export default nextConfig;