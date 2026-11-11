import type { ReactNode } from 'react'

/**
 * Cabeçalho de página: rótulo opcional de contexto, título, descrição e ações.
 */
export function PageHeader({
  contexto,
  titulo,
  descricao,
  acoes,
}: {
  contexto?: string
  titulo: string
  descricao?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {contexto ? <p className="etiqueta mb-1">{contexto}</p> : null}
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        {descricao ? <div className="mt-1 text-sm text-muted">{descricao}</div> : null}
      </div>
      {acoes ? <div className="flex shrink-0 items-center gap-2">{acoes}</div> : null}
    </header>
  )
}
