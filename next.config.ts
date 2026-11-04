import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mysql2', 'bcryptjs', 'sharp'],
  // Disable the optimizer until SVG rejection is confirmed fixed upstream.
  images: { unoptimized: true },
}

export default nextConfig
