import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ปิดการตรวจสอบ ESLint เมื่อ build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ปิดการตรวจสอบ TypeScript type checking เมื่อ build (ถ้าต้องการ)
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true, // ปิด optimization ชั่วคราวเพื่อแก้ปัญหา production
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3002',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'psc-webapp2',
        port: '3002',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**', // อนุญาตทุกโดเมน HTTPS สำหรับ production
        pathname: '/uploads/**',
      }
    ],
  },
  // เพิ่มการตั้งค่า timeout และ performance
  serverExternalPackages: [],
  // กำหนด headers สำหรับ timeout และ static files
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Keep-Alive',
            value: 'timeout=30, max=100'
          },
          {
            key: 'Connection',
            value: 'keep-alive'
          }
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
