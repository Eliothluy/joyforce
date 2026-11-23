import Link from 'next/link'
import type { ItemFeedDTO } from '@/types/painel'
import { formatarMedida } from '@/lib/domain/constantes'
import { Tendencia } from '@/components/Tendencia'
import {
  IconeAlerta,
  IconeBandeira,
  IconeCheck,
  IconePessoa,
} from '@/components/Icones'

const aparencia: Record<
  ItemFeedDTO['tipo'],
  { titulo: string; icone: React.ReactNode; circulo: string }
> = {
  SESSAO_CONCLUIDA: {
    titulo: 'Sessão concluída',
    icone: <IconeCheck className="h-4 w-4" />,
    circulo: 'bg-brand-soft text-brand-strong',
  },
  SESSAO_ABORTADA: {
    titulo: 'Sessão abortada',
    icone: <IconeAlerta className="h-4 w-4" />,
    circulo: 'bg-danger-soft text-danger',
  },
  AVALIACAO_INICIAL: {
    titulo: 'Avaliação inicial registrada',
    icone: <IconeBandeira className="h-4 w-4" />,
    circulo: 'bg-signal-soft text-signal',
  },
  PACIENTE_CADASTRADO: {
    titulo: 'Novo paciente',
    icone: <IconePessoa className="h-4 w-4" />,
    circulo: 'bg-paper text-muted border border-line',
  },
}

function meta(item: ItemFeedDTO): string {
  switch (item.tipo) {
    case 'SESSAO_CONCLUIDA':
      return `${item.repeticoes ?? 0} repetições válidas · amplitude ${formatarMedida(item.amplitudeMaxima ?? 0)}`
    case 'AVALIACAO_INICIAL':
      return 'Linha de base registrada manualmente'
    case 'PACIENTE_CADASTRADO':
      return 'Ficha criada, aguardando a primeira sessão'
    case 'SESSAO_ABORTADA':
      return 'Sem avaliação gerada'
  }
}

/** Uma linha do feed: ícone do evento, resumo e comparação com a sessão anterior. */
export function ItemFeed({ item, hora }: { item: ItemFeedDTO; hora: string }) {
  const aparenciaItem = aparencia[item.tipo]
  return (
    <Link
      href={item.alvoHref}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-brand-soft/60"
    >
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${aparenciaItem.circulo}`}
      >
        {aparenciaItem.icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{aparenciaItem.titulo}</span>
        <span className="block truncate text-sm text-muted">
          {item.pacienteNome} · {meta(item)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {item.tipo === 'SESSAO_CONCLUIDA' ? <Tendencia delta={item.variacaoRepeticoes} /> : null}
        <span className="numero text-xs text-muted">{hora}</span>
      </span>
    </Link>
  )
}
