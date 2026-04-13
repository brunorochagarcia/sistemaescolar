// Prisma 7 is driver-adapter-first — direct connection requires @prisma/adapter-pg
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// Singleton pattern — prevents multiple PrismaClient instances during hot reload
// Without this, each reload creates a new client and exhausts the connection pool
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
