import { RegisterForm } from '@/components/register-form'

export const metadata = { title: 'Solicitar Cadastro — Sistema Escolar' }

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand">
            Solicitar Cadastro
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Preencha os dados abaixo. A coordenação irá revisar e aprovar.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
