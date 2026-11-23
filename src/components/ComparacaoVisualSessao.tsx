import { formatarMedida } from '@/lib/domain/constantes'
import { Card } from '@/components/Card'
import { Tendencia } from '@/components/Tendencia'

type BarraComparacao = {
  rotulo: string
  valor: number
  destaque?: boolean
}

function GrupoBarras({
  titulo,
  unidade,
  barras,
  delta,
  rotuloDelta,
}: {
  titulo: string
  unidade: string
  barras: BarraComparacao[]
  delta: number | null
  rotuloDelta: string
}) {
  const maximo = Math.max(...barras.map((b) => b.valor), 1)

  return (
    <div className="rounded-xl border border-line bg-paper/45 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="etiqueta">{titulo}</p>
        {delta !== null ? (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>{rotuloDelta}</span>
            <Tendencia delta={delta} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {barras.map((barra) => {
          const larguraPct = Math.max(4, Math.round((barra.valor / maximo) * 100))
          return (
            <div key={barra.rotulo}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className={barra.destaque ? 'font-semibold text-ink' : 'text-muted'}>
                  {barra.rotulo}
                </span>
                <span className={`numero ${barra.destaque ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {formatarMedida(barra.valor)} {unidade}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/70">
                <div
                  className={`h-full rounded-full ${
                    barra.destaque ? 'bg-brand' : 'bg-muted/45'
                  }`}
                  style={{ width: `${larguraPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Barras horizontais comparando a sessão de hoje com a sessão anterior e
 * a avaliação inicial, acompanhando os deltas da sessão concluída.
 */
export function ComparacaoVisualSessao({
  repeticoesHoje,
  repeticoesAnterior,
  amplitudeHoje,
  amplitudeAnterior,
  alcanceInicial,
  rotuloDirecao,
}: {
  repeticoesHoje: number
  repeticoesAnterior: number | null
  amplitudeHoje: number
  amplitudeAnterior: number | null
  alcanceInicial: number | null
  rotuloDirecao: string
}) {
  const barrasReps: BarraComparacao[] = [
    ...(repeticoesAnterior !== null
      ? [{ rotulo: 'Sessão anterior', valor: repeticoesAnterior }]
      : []),
    { rotulo: 'Sessão de hoje', valor: repeticoesHoje, destaque: true },
  ]

  const barrasAmp: BarraComparacao[] = [
    ...(alcanceInicial !== null
      ? [{ rotulo: `Linha de base (${rotuloDirecao})`, valor: alcanceInicial }]
      : []),
    ...(amplitudeAnterior !== null
      ? [{ rotulo: 'Sessão anterior', valor: amplitudeAnterior }]
      : []),
    { rotulo: 'Sessão de hoje', valor: amplitudeHoje, destaque: true },
  ]

  const deltaReps = repeticoesAnterior === null ? null : repeticoesHoje - repeticoesAnterior
  const deltaAmp =
    amplitudeAnterior === null
      ? null
      : Math.round((amplitudeHoje - amplitudeAnterior) * 10) / 10

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold tracking-tight">Comparação com o histórico</h2>
          <p className="text-xs text-muted">
            Leitura proporcional em relação à sessão anterior e ao ponto de partida.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GrupoBarras
          titulo="Repetições válidas"
          unidade="reps"
          barras={barrasReps}
          delta={deltaReps}
          rotuloDelta="vs. anterior:"
        />
        <GrupoBarras
          titulo="Amplitude máxima"
          unidade="unid."
          barras={barrasAmp}
          delta={deltaAmp}
          rotuloDelta="vs. anterior:"
        />
      </div>
    </Card>
  )
}
