import type { InputHTMLAttributes } from 'react'

type PropriedadesCampo = {
  /** Identificador do campo; obrigatório para ligar label, erro e dica. */
  id: string
  rotulo: string
  erro?: string
  dica?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

/**
 * Campo de formulário com label, dica e erro por campo (RF-01).
 * O erro é anunciado por aria-describedby e marca aria-invalid.
 */
export function Campo({ id, rotulo, erro, dica, ...resto }: PropriedadesCampo) {
  const idApoio = erro ? `${id}-erro` : dica ? `${id}-dica` : null
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idApoio ?? undefined}
        className={
          'rounded-lg border bg-card px-3 py-2 text-base outline-none transition-colors ' +
          (erro ? 'border-danger' : 'border-line focus:border-brand')
        }
        {...resto}
      />
      {erro ? (
        <p id={`${id}-erro`} className="text-sm text-danger">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-sm text-muted">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
