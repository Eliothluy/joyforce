import type { StatusSessao } from '@/lib/domain/contratos'

const rotulos: Record<StatusSessao, string> = {
  PREPARANDO: 'Preparando',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ABORTADA: 'Abortada',
}

/** Cores dos tokens: CONCLUIDA marca, ABORTADA danger, EM_ANDAMENTO warn, PREPARANDO neutro. */
const classes: Record<StatusSessao, string> = {
  CONCLUIDA: 'bg-brand-soft text-brand-strong',
  ABORTADA: 'bg-danger-soft text-danger',
  EM_ANDAMENTO: 'bg-warn-soft text-warn',
  PREPARANDO: 'bg-paper text-muted border border-line',
}

export function StatusBadge({ status }: { status: StatusSessao }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes[status]}`}
    >
      {rotulos[status]}
    </span>
  )
}
