import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['media.imov.somar.ia.br', 'localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: 'media.imov.somar.ia.br' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
