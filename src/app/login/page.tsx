import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { FormularioLogin } from './formulario-login'

export default async function PaginaLogin() {
  const usuario = await obterUsuarioAtual()
  if (usuario) redirect('/fisio/pacientes')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <p className="etiqueta">JoyForce</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Entrar no JoyForce</h1>
        <p className="mt-1 text-sm text-muted">
          Área do fisioterapeuta: registre sessões e acompanhe a evolução de cada paciente.
        </p>
      </div>
      <FormularioLogin />
    </main>
  )
}
