// Keepalive endpoint — bata neste URL a cada 4 minutos para evitar cold start do Neon.
// Sugestão: registre em https://cron-job.org (gratuito) com intervalo de 4 minutos.
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
