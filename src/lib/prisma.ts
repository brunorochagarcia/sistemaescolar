// On Neon: use PrismaNeon (HTTP-based) to avoid TCP handshake overhead on
// every serverless invocation. The Neon HTTP driver uses fetch internally, so
// we opt out of Next.js data cache (cache: 'no-store') to prevent stale reads.
//
// Locally: use PrismaPg (standard TCP) since the Neon HTTP driver only works
// with Neon endpoints. Adapter is chosen by DATABASE_URL at runtime.
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { neonConfig } from '@neondatabase/serverless'

neonConfig.fetchFunction = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: 'no-store' })

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = connectionString.includes('neon.tech')
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// Singleton pattern — prevents multiple PrismaClient instances during hot reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}