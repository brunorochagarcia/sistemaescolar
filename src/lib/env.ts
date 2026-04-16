import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z.string().email('RESEND_FROM_EMAIL must be a valid email'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
  NEXT_PUBLIC_URL: z.string().url('NEXT_PUBLIC_URL must be a valid URL'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

// Skip validation during Next.js build phase — vars are only needed at runtime
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

const parsed = isBuildPhase
  ? { success: true as const, data: process.env as z.infer<typeof envSchema> }
  : envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error((parsed as { success: false; error: z.ZodError }).error.flatten().fieldErrors)
  throw new Error('Invalid environment variables — check your .env file')
}

export const env = parsed.data
