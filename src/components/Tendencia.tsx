import { formatarMedida } from '@/lib/domain/constantes'
import { IconeSetaBaixo, IconeSetaCima, IconeSetaLado } from '@/components/Icones'

/**
 * Tendência de evolução: seta + delta com algarismos tabulares.
 * Sobe = verde (marca), cai = laranja (sinal), estável/sem base = neutro.
 * Nunca há base quando não há sessão anterior para comparar.
 */
export function Tendencia({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted" title="Sem base de comparação">
        <span className="numero text-sm font-semibold">—</span>
      </span>
    )
  }

  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <IconeSetaLado className="h-3.5 w-3.5" />
        <span className="numero text-sm font-semibold">0</span>
      </span>
    )
  }

  const subiu = delta > 0
  const icone = subiu ? <IconeSetaCima className="h-3.5 w-3.5" /> : <IconeSetaBaixo className="h-3.5 w-3.5" />
  const cor = subiu ? 'text-brand-strong' : 'text-signal'
  const sinal = subiu ? '+' : '−'
  return (
    <span className={`inline-flex items-center gap-1.5 ${cor}`}>
      {icone}
      <span className="numero text-sm font-semibold">
        {sinal}
        {formatarMedida(Math.abs(delta))}
      </span>
    </span>
  )
}
