'use client'

import Link from 'next/link'
import { Botao, classesBotao } from '@/components/Botao'

/**
 * Fronteira de erro global: tom calmo, sem jargão técnico, com caminho de volta.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="etiqueta">Algo saiu do previsto</p>
      <h1 className="text-2xl font-semibold tracking-tight">Não foi possível carregar esta tela</h1>
      <p className="text-muted">
        A interrupção foi registrada e seus dados permanecem guardados. Tente novamente; se
        persistir, volte para a lista de pacientes.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Botao onClick={reset}>Tentar novamente</Botao>
        <Link href="/fisio/pacientes" className={classesBotao('secundario')}>
          Ir para os pacientes
        </Link>
      </div>
    </main>
  )
}
