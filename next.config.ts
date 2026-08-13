import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Cloudflare quick tunnels (trycloudflare.com) used for iPhone Face ID testing
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
}

export default nextConfig
