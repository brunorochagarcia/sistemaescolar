// @prisma/adapter-neon uses @neondatabase/serverless (HTTP-based) instead of TCP.
// This avoids the TCP handshake overhead on every serverless invocation,
// which is the main cause of slow page loads on Vercel + Neon free tier.
//
// IMPORTANT: Next.js App Router caches all `fetch` calls automatically.
// The Neon HTTP driver uses fetch internally, so without `cache: 'no-store'`
// Next.js would cache database responses and serve stale data across requests
// (e.g., a filtered query would return the same result as an unfiltered one).
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// Opt out of Next.js data cache for all Neon HTTP requests
neonConfig.fetchFunction = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: 'no-store' })

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

// Singleton pattern — prevents multiple PrismaClient instances during hot reload
// Without this, each reload creates a new client and exhausts the connection pool
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
