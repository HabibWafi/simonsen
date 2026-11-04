import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Shared hosting may expose host CPU count despite a smaller process/thread quota.
  experimental: { cpus: 1 },
  serverExternalPackages: ['mysql2', 'bcryptjs', 'sharp'],
  // Disable the optimizer until SVG rejection is confirmed fixed upstream.
  images: { unoptimized: true },
}

export default nextConfig
