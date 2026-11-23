import type { AvaliacaoDTO } from '@/lib/domain/contratos'
import { formatarMedida } from '@/lib/domain/constantes'
import { calcularTetoGrafico } from '@/lib/ui-format'

type PropriedadesRadar = {
  inicial: AvaliacaoDTO
  atual?: AvaliacaoDTO | null
  rotuloInicial?: string
  rotuloAtual?: string
}

const LARGURA = 380
const ALTURA = 256
const CX = LARGURA / 2
const CY = ALTURA / 2
const RAIO = 76

/**
 * Diagrama polar dos 4 alcances direcionais (RF-04: frente, direita, trás, esquerda).
 * Quando recebe uma avaliação de acompanhamento distinta da inicial, sobrepõe
 * os dois polígonos para evidenciar o ganho de alcance.
 */
export function RadarAlcances({
  inicial,
  atual = null,
  rotuloInicial = 'Avaliação inicial',
  rotuloAtual = 'Última avaliação',
}: PropriedadesRadar) {
  const temAtual = atual !== null && atual.id !== inicial.id
  const principal = temAtual && atual ? atual : inicial

  const todosValores = [
    inicial.alcanceFrente,
    inicial.alcanceDireita,
    inicial.alcanceTras,
    inicial.alcanceEsquerda,
    ...(temAtual && atual
      ? [atual.alcanceFrente, atual.alcanceDireita, atual.alcanceTras, atual.alcanceEsquerda]
      : []),
  ]
  const { teto } = calcularTetoGrafico(Math.max(...todosValores, 0), 120)

  const eixos = [
    { chave: 'frente', rotulo: 'Frente', dx: 0, dy: -1, anchor: 'middle' as const, lx: CX, ly: CY - RAIO - 14 },
    { chave: 'direita', rotulo: 'Direita', dx: 1, dy: 0, anchor: 'start' as const, lx: CX + RAIO + 10, ly: CY + 4 },
    { chave: 'tras', rotulo: 'Trás', dx: 0, dy: 1, anchor: 'middle' as const, lx: CX, ly: CY + RAIO + 22 },
    { chave: 'esquerda', rotulo: 'Esquerda', dx: -1, dy: 0, anchor: 'end' as const, lx: CX - RAIO - 10, ly: CY + 4 },
  ]

  function pontosDe(avaliacao: AvaliacaoDTO) {
    const valores = [
      avaliacao.alcanceFrente,
      avaliacao.alcanceDireita,
      avaliacao.alcanceTras,
      avaliacao.alcanceEsquerda,
    ]
    return eixos.map((eixo, i) => {
      const proporcao = Math.min(1, Math.max(0, (valores[i] ?? 0) / teto))
      return {
        x: CX + eixo.dx * RAIO * proporcao,
        y: CY + eixo.dy * RAIO * proporcao,
        valor: valores[i] ?? 0,
      }
    })
  }

  const ptsInicial = pontosDe(inicial)
  const ptsAtual = temAtual && atual ? pontosDe(atual) : null
  const ptsPrincipal = ptsAtual ?? ptsInicial

  const poligono = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const niveis = [0.25, 0.5, 0.75, 1]

  return (
    <figure className="m-0 flex flex-col items-center">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="h-auto w-full max-w-[360px]"
        role="img"
        aria-label={`Alcances: frente ${principal.alcanceFrente}, direita ${principal.alcanceDireita}, trás ${principal.alcanceTras}, esquerda ${principal.alcanceEsquerda}`}
      >
        {/* Anéis losangulares concêntricos */}
        {niveis.map((nivel) => {
          const ring = eixos
            .map((e) => `${(CX + e.dx * RAIO * nivel).toFixed(1)},${(CY + e.dy * RAIO * nivel).toFixed(1)}`)
            .join(' ')
          return (
            <polygon
              key={nivel}
              points={ring}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          )
        })}

        {/* Eixos cardeais */}
        {eixos.map((eixo) => (
          <line
            key={eixo.chave}
            x1={CX}
            y1={CY}
            x2={CX + eixo.dx * RAIO}
            y2={CY + eixo.dy * RAIO}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        {/* Marca do teto no topo */}
        <text
          x={CX + 4}
          y={CY - RAIO + 10}
          fontSize={9.5}
          fill="currentColor"
          className="numero text-muted"
        >
          {formatarMedida(teto)}
        </text>

        {/* Polígono da inicial como referência quando há acompanhamento */}
        {temAtual ? (
          <polygon
            points={poligono(ptsInicial)}
            fill="var(--color-signal)"
            fillOpacity={0.09}
            stroke="var(--color-signal)"
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />
        ) : null}

        {/* Polígono principal (última avaliação ou inicial quando única) */}
        <polygon
          points={poligono(ptsPrincipal)}
          fill="var(--color-brand)"
          fillOpacity={0.18}
          stroke="var(--color-brand)"
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {ptsPrincipal.map((pt, i) => (
          <circle
            key={`v-${eixos[i]?.chave ?? i}`}
            cx={pt.x}
            cy={pt.y}
            r={3.5}
            fill="var(--color-brand-strong)"
            stroke="var(--color-card)"
            strokeWidth={1.5}
          />
        ))}

        {/* Rótulos externos */}
        {eixos.map((eixo, i) => {
          const valorAtual = ptsPrincipal[i]?.valor ?? 0
          return (
            <text
              key={`lbl-${eixo.chave}`}
              x={eixo.lx}
              y={eixo.ly}
              textAnchor={eixo.anchor}
              fontSize={11}
              fill="currentColor"
              className="text-ink"
            >
              <tspan fontWeight={600}>{eixo.rotulo}</tspan>
              <tspan className="numero text-muted" fontSize={10.5}>
                {' '}
                {formatarMedida(valorAtual)}
              </tspan>
            </text>
          )
        })}
      </svg>

      <figcaption className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-xs bg-brand/35 ring-1 ring-brand" />
          {temAtual ? rotuloAtual : rotuloInicial}
        </span>
        {temAtual ? (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden width={16} height={4} viewBox="0 0 16 4">
              <line
                x1={0}
                y1={2}
                x2={16}
                y2={2}
                stroke="var(--color-signal)"
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
            </svg>
            {rotuloInicial}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
