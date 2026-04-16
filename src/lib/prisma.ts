// @prisma/adapter-neon uses @neondatabase/serverless (HTTP-based) instead of TCP.
// This avoids the TCP handshake overhead on every serverless invocation,
// which is the main cause of slow page loads on Vercel + Neon free tier.
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

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
