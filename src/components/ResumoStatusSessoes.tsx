import type { DistribuicaoStatusDTO } from '@/types/painel'
import { Card } from '@/components/Card'

const RAIO = 42
const CIRCUNFERENCIA = 2 * Math.PI * RAIO

/**
 * Anel proporcional de aproveitamento das sessões registradas (concluídas,
 * retomáveis e abortadas).
 */
export function ResumoStatusSessoes({ distribuicao }: { distribuicao: DistribuicaoStatusDTO }) {
  const { concluidas, abortadas, abertas } = distribuicao
  const total = concluidas + abortadas + abertas
  const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0

  const segmentos =
    total > 0
      ? [
          { chave: 'concluidas', rotulo: 'Concluídas', valor: concluidas, cor: 'var(--color-brand)', bolinha: 'bg-brand' },
          { chave: 'abertas', rotulo: 'Em aberto', valor: abertas, cor: 'var(--color-warn)', bolinha: 'bg-warn' },
          { chave: 'abortadas', rotulo: 'Abortadas', valor: abortadas, cor: 'var(--color-danger)', bolinha: 'bg-danger' },
        ]
      : []

  let acumulado = 0

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold tracking-tight">Aproveitamento das sessões</h2>
          <p className="text-xs text-muted">Histórico total de sessões iniciadas.</p>
        </div>
        <span className="numero rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-muted">
          {total} {total === 1 ? 'total' : 'totais'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 112 112"
            className="h-28 w-28 -rotate-90"
            role="img"
            aria-label={
              total > 0
                ? `${taxaConclusao}% de sessões concluídas (${concluidas} de ${total})`
                : 'Nenhuma sessão registrada ainda'
            }
          >
            <circle
              cx={56}
              cy={56}
              r={RAIO}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={13}
            />
            {segmentos.map((segmento) => {
              if (segmento.valor <= 0) return null
              const comprimento = (segmento.valor / total) * CIRCUNFERENCIA
              const deslocamento = -acumulado
              acumulado += comprimento
              return (
                <circle
                  key={segmento.chave}
                  cx={56}
                  cy={56}
                  r={RAIO}
                  fill="none"
                  stroke={segmento.cor}
                  strokeWidth={13}
                  strokeDasharray={`${comprimento} ${CIRCUNFERENCIA}`}
                  strokeDashoffset={deslocamento}
                  strokeLinecap="butt"
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="numero text-xl font-semibold leading-none text-ink">
              {total > 0 ? `${taxaConclusao}%` : '—'}
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              concluídas
            </span>
          </div>
        </div>

        <dl className="flex min-w-40 flex-1 flex-col gap-2">
          {[
            { rotulo: 'Concluídas', valor: concluidas, bolinha: 'bg-brand' },
            { rotulo: 'Em aberto', valor: abertas, bolinha: 'bg-warn' },
            { rotulo: 'Abortadas', valor: abortadas, bolinha: 'bg-danger' },
          ].map((item) => {
            const pct = total > 0 ? Math.round((item.valor / total) * 100) : 0
            return (
              <div key={item.rotulo} className="flex items-center justify-between gap-3 text-sm">
                <dt className="flex items-center gap-2 text-muted">
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${item.bolinha}`} />
                  {item.rotulo}
                </dt>
                <dd className="numero font-medium text-ink">
                  {item.valor}
                  <span className="ml-1.5 text-xs text-muted">({pct}%)</span>
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </Card>
  )
}
