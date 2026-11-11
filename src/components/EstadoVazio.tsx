import type { ReactNode } from 'react'

/** Estado vazio calmo: traço pontilhado, título, texto de apoio e ação opcional. */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="vao-vazio flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-semibold">{titulo}</p>
      <div className="max-w-md text-sm text-muted">{descricao}</div>
      {acao ? <div className="mt-3">{acao}</div> : null}
    </div>
  )
}
