import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { gerarBoletos } from '@/lib/actions/boleto'

export async function POST(request: Request) {
  // Verificar Bearer token
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { gerados } = await gerarBoletos(new Date())
    return NextResponse.json({ ok: true, gerados })
  } catch (err) {
    console.error('[cron/boletos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
