import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // Neon serverless driver uses fetch internally. The `cache: 'no-store'` we set
  // in src/lib/prisma.ts prevents Next.js from accidentally caching raw DB responses.
  // Selective caching is done via unstable_cache in page components instead.
}

export default nextConfig
