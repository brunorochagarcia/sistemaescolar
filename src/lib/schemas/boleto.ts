import { z } from 'zod'

export const marcarPagoSchema = z.object({
  boletoId: z.string().min(1),
})

export const cancelarBoletoSchema = z.object({
  boletoId: z.string().min(1),
})

export const enviarEmailBoletoSchema = z.object({
  boletoId: z.string().min(1),
})
