import { formatarDataHora, formatarMedida } from '@/lib/domain/constantes'

export type PontoEvolucao = {
  /** ISO 8601 do início da sessão concluída. */
  inicio: string
  repeticoes: number
  amplitude: number
}

const LARGURA = 640
const ALTURA = 260
const MARGEM = { cima: 18, direita: 52, baixo: 34, esquerda: 44 }
const LARGURA_INTERNA = LARGURA - MARGEM.esquerda - MARGEM.direita
const ALTURA_INTERNA = ALTURA - MARGEM.cima - MARGEM.baixo
const DIA_MS = 86_400_000
const SEMANA_MS = 7 * DIA_MS

function dominio(valorMaximo: number, minimo: number): number {
  const teto = Math.max(valorMaximo, minimo)
  return teto * 1.15
}

/**
 * Gráfico de evolução em SVG próprio (sem biblioteca): repetições válidas e
 * amplitude máxima por sessão concluída, eixo em semanas desde a primeira
 * sessão, tooltips nativos via <title>.
 * Dois eixos honestos: esquerda = repetições (marca), direita = amplitude (sinal).
 */
export function GraficoEvolucao({ pontos }: { pontos: PontoEvolucao[] }) {
  if (pontos.length === 0) return null

  const tempos = pontos.map((p) => new Date(p.inicio).getTime())
  const t0 = Math.min(...tempos)
  const t1 = Math.max(...tempos)
  const dominioInicio = t0 - 0.5 * DIA_MS
  const dominioFim = Math.max(t1 + 0.5 * DIA_MS, t0 + SEMANA_MS)
  const dominioTotal = dominioFim - dominioInicio

  const maxRepeticoes = dominio(Math.max(...pontos.map((p) => p.repeticoes)), 10)
  const maxAmplitude = dominio(Math.max(...pontos.map((p) => p.amplitude)), 50)

  const x = (t: number) => MARGEM.esquerda + ((t - dominioInicio) / dominioTotal) * LARGURA_INTERNA
  const yReps = (v: number) => MARGEM.cima + ALTURA_INTERNA * (1 - v / maxRepeticoes)
  const yAmp = (v: number) => MARGEM.cima + ALTURA_INTERNA * (1 - v / maxAmplitude)

  const linhaReps = pontos.map((p, i) => `${x(tempos[i] ?? t0)},${yReps(p.repeticoes)}`).join(' ')
  const linhaAmp = pontos.map((p, i) => `${x(tempos[i] ?? t0)},${yAmp(p.amplitude)}`).join(' ')

  const totalSemanas = Math.floor(dominioTotal / SEMANA_MS)
  const passoSemana = Math.max(1, Math.ceil(totalSemanas / 6))
  const marcas: { t: number; rotulo: string }[] = []
  for (let i = 0; i <= totalSemanas; i += passoSemana) {
    marcas.push({ t: t0 + i * SEMANA_MS, rotulo: `sem. ${i + 1}` })
  }

  const marcasY = [0, 0.25, 0.5, 0.75, 1]

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de evolução: repetições válidas e amplitude por sessão concluída"
      >
        {/* Grade horizontal e eixo de repetições (esquerda) */}
        {marcasY.map((proporcao) => {
          const y = MARGEM.cima + ALTURA_INTERNA * proporcao
          const valor = maxRepeticoes * (1 - proporcao)
          return (
            <g key={`y-${proporcao}`}>
              <line
                x1={MARGEM.esquerda}
                x2={LARGURA - MARGEM.direita}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
              <text
                x={MARGEM.esquerda - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="currentColor"
                className="numero text-muted"
              >
                {formatarMedida(valor)}
              </text>
            </g>
          )
        })}

        {/* Eixo de amplitude (direita) */}
        {marcasY.map((proporcao) => (
          <text
            key={`amp-${proporcao}`}
            x={LARGURA - MARGEM.direita + 8}
            y={MARGEM.cima + ALTURA_INTERNA * proporcao + 4}
            textAnchor="start"
            fontSize={11}
            fill="currentColor"
            className="numero text-signal"
          >
            {formatarMedida(maxAmplitude * (1 - proporcao))}
          </text>
        ))}

        {/* Faixa de semanas (eixo x) */}
        <line
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={MARGEM.cima + ALTURA_INTERNA}
          y2={MARGEM.cima + ALTURA_INTERNA}
          stroke="var(--color-muted)"
          strokeWidth={1}
        />
        {marcas.map((marca) => (
          <g key={marca.t}>
            <line
              x1={x(marca.t)}
              x2={x(marca.t)}
              y1={MARGEM.cima + ALTURA_INTERNA}
              y2={MARGEM.cima + ALTURA_INTERNA + 5}
              stroke="var(--color-muted)"
              strokeWidth={1}
            />
            <text
              x={x(marca.t)}
              y={MARGEM.cima + ALTURA_INTERNA + 18}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              className="text-muted"
            >
              {marca.rotulo}
            </text>
          </g>
        ))}

        {/* Linhas de dados */}
        <polyline
          points={linhaAmp}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.75}
        />
        <polyline
          points={linhaReps}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2.25}
          strokeLinejoin="round"
        />

        {/* Pontos com tooltip nativo */}
        {pontos.map((ponto, i) => {
          const t = tempos[i] ?? t0
          return (
            <g key={ponto.inicio + String(i)}>
              <circle cx={x(t)} cy={yAmp(ponto.amplitude)} r={3} fill="var(--color-signal)" opacity={0.7}>
                <title>{`Sessão de ${formatarDataHora(ponto.inicio)} — amplitude ${formatarMedida(ponto.amplitude)}`}</title>
              </circle>
              <circle cx={x(t)} cy={yReps(ponto.repeticoes)} r={4.5} fill="var(--color-brand)">
                <title>{`Sessão de ${formatarDataHora(ponto.inicio)} — ${ponto.repeticoes} repetições válidas`}</title>
              </circle>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-brand" />
          Repetições válidas (eixo esquerdo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden width={16} height={4} viewBox="0 0 16 4" className="shrink-0">
            <line
              x1={0}
              y1={2}
              x2={16}
              y2={2}
              stroke="var(--color-signal)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          </svg>
          Amplitude máxima (eixo direito)
        </span>
        <span>Semanas desde a primeira sessão concluída</span>
      </figcaption>
    </figure>
  )
}
