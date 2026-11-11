import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { CabecalhoApp } from '@/components/CabecalhoApp'

/**
 * Área protegida do fisioterapeuta: sem sessão válida, volta ao login.
 * O cabeçalho discreto com nome e "Sair" fica aqui; as telas de execução
 * (kiosk) usam o layout próprio de /sessao.
 */
export default async function LayoutFisio({ children }: { children: ReactNode }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) redirect('/login')

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <div className="mx-auto w-full max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}
