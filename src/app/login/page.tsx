import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Login — Sistema Escolar' }

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand">
            Sistema Escolar
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Entre com sua conta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
