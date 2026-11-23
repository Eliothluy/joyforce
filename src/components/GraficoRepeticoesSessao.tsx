'use client'

import { useState } from 'react'
import type { ExercicioDTO, RepeticaoDTO } from '@/lib/domain/contratos'
import { formatarMedida } from '@/lib/domain/constantes'
import { calcularTetoGrafico } from '@/lib/ui-format'
import { Card } from '@/components/Card'
import { EstadoVazio } from '@/components/EstadoVazio'

type MetricaRepeticao = 'amplitude' | 'duracao'

const LARGURA = 640
const ALTURA = 224
const MARGEM = { cima: 20, direita: 16, baixo: 34, esquerda: 44 }
const LARGURA_INTERNA = LARGURA - MARGEM.esquerda - MARGEM.direita
const ALTURA_INTERNA = ALTURA - MARGEM.cima - MARGEM.baixo

function motivoRepeticao(rep: RepeticaoDTO, exercicio: ExercicioDTO): string {
  if (rep.valida) return 'Válida · entrou na contagem'
  if (rep.duracaoMs > exercicio.tempoMaxMs) {
    return `Não contou · passou de ${exercicio.tempoMaxMs / 1000} s`
  }
  if (rep.amplitude < exercicio.limiar) {
    return `Não contou · abaixo do limiar de ${exercicio.limiar} unid.`
  }
  return 'Não contou · movimento fora do padrão'
}

/**
 * Gráfico barra-a-barra de todas as repetições de uma sessão (RF-05):
 * alterna entre Amplitude (contra o limiar) e Duração (contra 10 s).
 */
export function GraficoRepeticoesSessao({
  repeticoes,
  exercicio,
  alcanceInicial = null,
}: {
  repeticoes: RepeticaoDTO[]
  exercicio: ExercicioDTO
  alcanceInicial?: number | null
}) {
  const [metrica, definirMetrica] = useState<MetricaRepeticao>('amplitude')
  const [indiceSelecionado, definirIndiceSelecionado] = useState<number>(() => {
    if (repeticoes.length === 0) return 0
    let melhorIndice = 0
    let melhorAmp = -1
    repeticoes.forEach((rep, idx) => {
      if (rep.amplitude > melhorAmp) {
        melhorAmp = rep.amplitude
        melhorIndice = idx
      }
    })
    return melhorIndice
  })

  if (repeticoes.length === 0) {
    return (
      <Card>
        <h2 className="mb-3 font-semibold">Movimentos da sessão</h2>
        <EstadoVazio
          titulo="Nenhuma repetição detalhada"
          descricao="Esta sessão não possui registros individuais de repetições para detalhar."
        />
      </Card>
    )
  }

  const indiceSeguro = Math.min(indiceSelecionado, repeticoes.length - 1)
  const selecionada = repeticoes[indiceSeguro]
  const limiteSegundos = exercicio.tempoMaxMs / 1000

  const valores = repeticoes.map((r) =>
    metrica === 'amplitude' ? r.amplitude : Math.round((r.duracaoMs / 1000) * 10) / 10,
  )
  const maximoReferencia =
    metrica === 'amplitude'
      ? Math.max(...valores, exercicio.limiar, alcanceInicial ?? 0)
      : Math.max(...valores, limiteSegundos)
  const { teto, passos } = calcularTetoGrafico(maximoReferencia, metrica === 'amplitude' ? 150 : 12)

  const yDe = (v: number) => MARGEM.cima + ALTURA_INTERNA * (1 - v / teto)
  const baseY = MARGEM.cima + ALTURA_INTERNA
  const larguraColuna = LARGURA_INTERNA / repeticoes.length
  const larguraBarra = Math.min(28, Math.max(6, larguraColuna * 0.64))
  const passoRotulo = repeticoes.length > 16 ? Math.ceil(repeticoes.length / 10) : 1

  const valorReferencia = metrica === 'amplitude' ? exercicio.limiar : limiteSegundos
  const textoReferencia =
    metrica === 'amplitude'
      ? `limiar ${exercicio.limiar} unid.`
      : `limite ${limiteSegundos} s`

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Movimento a movimento</h2>
          <p className="text-xs text-muted">
            Cada barra representa uma repetição executada. Selecione para inspecionar.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Métrica por repetição"
          className="inline-flex rounded-lg border border-line bg-paper p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={metrica === 'amplitude'}
            onClick={() => definirMetrica('amplitude')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              metrica === 'amplitude' ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Amplitude
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metrica === 'duracao'}
            onClick={() => definirMetrica('duracao')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              metrica === 'duracao' ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Duração (s)
          </button>
        </div>
      </div>

      <div className="mt-4">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label={`Gráfico de ${repeticoes.length} repetições da sessão`}
        >
          {passos.map((passo) => {
            const y = yDe(passo)
            return (
              <g key={passo}>
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
                  {metrica === 'duracao' ? `${formatarMedida(passo)}s` : formatarMedida(passo)}
                </text>
              </g>
            )
          })}

          {/* Linha de referência do limiar (amplitude) ou do limite de tempo (duração) */}
          <line
            x1={MARGEM.esquerda}
            x2={LARGURA - MARGEM.direita}
            y1={yDe(valorReferencia)}
            y2={yDe(valorReferencia)}
            stroke="var(--color-signal)"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />

          {/* Linha de avaliação inicial no modo amplitude */}
          {metrica === 'amplitude' && alcanceInicial !== null && alcanceInicial > 0 ? (
            <line
              x1={MARGEM.esquerda}
              x2={LARGURA - MARGEM.direita}
              y1={yDe(alcanceInicial)}
              y2={yDe(alcanceInicial)}
              stroke="var(--color-muted)"
              strokeWidth={1.3}
              strokeDasharray="3 3"
            />
          ) : null}

          {repeticoes.map((rep, i) => {
            const valor = valores[i] ?? 0
            const cx = MARGEM.esquerda + larguraColuna * (i + 0.5)
            const bx = cx - larguraBarra / 2
            const by = yDe(valor)
            const bh = Math.max(3, baseY - by)
            const sel = i === indiceSeguro
            const cor = rep.valida ? 'var(--color-brand)' : 'var(--color-signal)'
            const mostrarNumero = i === 0 || i === repeticoes.length - 1 || (i + 1) % passoRotulo === 0

            return (
              <g key={rep.id}>
                {sel ? (
                  <rect
                    x={MARGEM.esquerda + larguraColuna * i + 1}
                    y={MARGEM.cima}
                    width={Math.max(4, larguraColuna - 2)}
                    height={ALTURA_INTERNA}
                    rx={5}
                    fill="var(--color-brand-soft)"
                    opacity={0.45}
                  />
                ) : null}

                <rect
                  x={bx}
                  y={by}
                  width={larguraBarra}
                  height={bh}
                  rx={4}
                  fill={cor}
                  fillOpacity={rep.valida ? (sel ? 1 : 0.78) : sel ? 0.7 : 0.42}
                  stroke={!rep.valida ? 'var(--color-signal)' : sel ? 'var(--color-brand-strong)' : 'none'}
                  strokeWidth={!rep.valida || sel ? 1.5 : 0}
                  strokeDasharray={!rep.valida ? '3 2' : undefined}
                />

                {mostrarNumero || sel ? (
                  <text
                    x={cx}
                    y={baseY + 17}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={sel ? 700 : 400}
                    fill="currentColor"
                    className={`numero ${sel ? 'text-ink' : 'text-muted'}`}
                  >
                    #{rep.ordem}
                  </text>
                ) : null}

                <rect
                  x={MARGEM.esquerda + larguraColuna * i}
                  y={MARGEM.cima}
                  width={larguraColuna}
                  height={ALTURA_INTERNA + 26}
                  fill="transparent"
                  className="cursor-pointer outline-none"
                  tabIndex={0}
                  role="button"
                  aria-pressed={sel}
                  aria-label={`Repetição ${rep.ordem}: amplitude ${formatarMedida(rep.amplitude)}, duração ${(rep.duracaoMs / 1000).toFixed(1)} segundos, ${rep.valida ? 'válida' : 'não contou'}`}
                  onMouseEnter={() => definirIndiceSelecionado(i)}
                  onFocus={() => definirIndiceSelecionado(i)}
                  onClick={() => definirIndiceSelecionado(i)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault()
                      definirIndiceSelecionado(i)
                    }
                  }}
                />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-xs bg-brand" />
          Repetição válida
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-xs border border-dashed border-signal bg-signal/40"
          />
          Fora do padrão (não conta)
        </span>
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
          <span className="numero text-signal">{textoReferencia}</span>
        </span>
        {metrica === 'amplitude' && alcanceInicial !== null && alcanceInicial > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden width={16} height={4} viewBox="0 0 16 4">
              <line
                x1={0}
                y1={2}
                x2={16}
                y2={2}
                stroke="var(--color-muted)"
                strokeWidth={1.6}
                strokeDasharray="3 3"
              />
            </svg>
            <span className="numero">linha de base ({formatarMedida(alcanceInicial)} unid.)</span>
          </span>
        ) : null}
      </div>

      {selecionada ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper/70 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <p className="etiqueta">Repetição #{selecionada.ordem}</p>
              <p className="numero text-sm font-semibold">
                {formatarMedida(selecionada.amplitude)} unid. ·{' '}
                {(selecionada.duracaoMs / 1000).toFixed(1)} s
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              selecionada.valida
                ? 'bg-brand-soft text-brand-strong'
                : 'bg-signal-soft text-signal'
            }`}
          >
            {motivoRepeticao(selecionada, exercicio)}
          </span>
        </div>
      ) : null}
    </Card>
  )
}
