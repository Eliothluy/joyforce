import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'

/**
 * Proteção de /sessao: sem sessão válida, volta ao login.
 * Não renderiza cabeçalho — a execução é modo kiosk e as outras telas da
 * sessão incluem o cabeçalho por conta própria.
 */
export default async function LayoutSessao({ children }: { children: ReactNode }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) redirect('/login')
  return <>{children}</>
}
