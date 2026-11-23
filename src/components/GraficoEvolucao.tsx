'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatarDataHora, formatarMedida } from '@/lib/domain/constantes'
import { calcularTetoGrafico, formatarDiaMes } from '@/lib/ui-format'
import { Tendencia } from '@/components/Tendencia'

export type PontoEvolucao = {
  /** ISO 8601 da sessão concluída. */
  inicio: string
  repeticoes: number
  amplitude: number
  /** Opcional: vincula o ponto selecionado ao resultado detalhado da sessão. */
  sessaoId?: string
}

type ModoGrafico = 'combinado' | 'repeticoes' | 'amplitude'

const MODOS: { id: ModoGrafico; rotulo: string }[] = [
  { id: 'combinado', rotulo: 'Combinado' },
  { id: 'repeticoes', rotulo: 'Repetições' },
  { id: 'amplitude', rotulo: 'Amplitude' },
]

const LARGURA = 680
const ALTURA = 270
const MARGEM = { cima: 24, direita: 52, baixo: 38, esquerda: 44 }
const LARGURA_INTERNA = LARGURA - MARGEM.esquerda - MARGEM.direita
const ALTURA_INTERNA = ALTURA - MARGEM.cima - MARGEM.baixo

/**
 * Gráfico interativo de evolução por sessão concluída:
 * - Modo Combinado: barras para repetições (eixo esq.) + linha para amplitude (eixo dir.)
 * - Modos individuais: linha com área preenchida + linha de referência inicial
 * Escalas iniciam sempre em 0 para leitura clínica honesta.
 */
export function GraficoEvolucao({
  pontos,
  alcanceInicial = null,
}: {
  pontos: PontoEvolucao[]
  alcanceInicial?: number | null
}) {
  const [modo, definirModo] = useState<ModoGrafico>('combinado')
  const [indiceSelecionado, definirIndiceSelecionado] = useState<number>(() =>
    Math.max(0, pontos.length - 1),
  )

  if (pontos.length === 0) return null

  const indiceSeguro = Math.min(indiceSelecionado, pontos.length - 1)
  const pontoSelecionado = pontos[indiceSeguro]
  const pontoAnterior = indiceSeguro > 0 ? pontos[indiceSeguro - 1] : undefined

  const maxRepsObservado = Math.max(...pontos.map((p) => p.repeticoes), 0)
  const maxAmpObservado = Math.max(...pontos.map((p) => p.amplitude), alcanceInicial ?? 0, 0)

  const escalaReps = calcularTetoGrafico(maxRepsObservado, 10)
  const escalaAmp = calcularTetoGrafico(maxAmpObservado, 120)

  const larguraColuna = LARGURA_INTERNA / pontos.length
  const larguraBarra = Math.min(34, Math.max(12, larguraColuna * 0.48))

  const xCentro = (indice: number) => MARGEM.esquerda + larguraColuna * (indice + 0.5)
  const yReps = (v: number) => MARGEM.cima + ALTURA_INTERNA * (1 - v / escalaReps.teto)
  const yAmp = (v: number) => MARGEM.cima + ALTURA_INTERNA * (1 - v / escalaAmp.teto)

  const passoRotuloX = pontos.length > 9 ? Math.ceil(pontos.length / 6) : 1
  const mostrarRotuloX = (indice: number) =>
    indice === 0 || indice === pontos.length - 1 || indice % passoRotuloX === 0

  const coordsLinhaReps = pontos.map((p, i) => `${xCentro(i).toFixed(1)},${yReps(p.repeticoes).toFixed(1)}`).join(' ')
  const coordsLinhaAmp = pontos.map((p, i) => `${xCentro(i).toFixed(1)},${yAmp(p.amplitude).toFixed(1)}`).join(' ')

  const baseY = MARGEM.cima + ALTURA_INTERNA
  const primeiroX = xCentro(0).toFixed(1)
  const ultimoX = xCentro(pontos.length - 1).toFixed(1)
  const areaReps =
    pontos.length > 1 ? `${coordsLinhaReps} ${ultimoX},${baseY} ${primeiroX},${baseY}` : ''
  const areaAmp =
    pontos.length > 1 ? `${coordsLinhaAmp} ${ultimoX},${baseY} ${primeiroX},${baseY}` : ''

  const linhaBaseReps = pontos[0]?.repeticoes ?? null
  const linhaBaseAmp = alcanceInicial ?? pontos[0]?.amplitude ?? null

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Modo de exibição do gráfico de evolução"
          className="inline-flex rounded-lg border border-line bg-paper p-0.5"
        >
          {MODOS.map((m) => {
            const ativo = modo === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => definirModo(m.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  ativo ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                {m.rotulo}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted">
          Passe o cursor ou clique em uma sessão para comparar os números.
        </p>
      </div>

      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Gráfico de evolução: repetições válidas e amplitude máxima por sessão concluída"
      >
        {/* Grade horizontal + eixo primário à esquerda */}
        {(modo === 'amplitude' ? escalaAmp.passos : escalaReps.passos).map((valor, i) => {
          const proporcao = i / 4
          const y = MARGEM.cima + ALTURA_INTERNA * (1 - proporcao)
          return (
            <g key={`grade-${valor}`}>
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
                className={`numero ${modo === 'amplitude' ? 'text-signal' : 'text-muted'}`}
              >
                {formatarMedida(valor)}
              </text>
            </g>
          )
        })}

        {/* Eixo direito de amplitude no modo Combinado */}
        {modo === 'combinado'
          ? escalaAmp.passos.map((valor, i) => {
              const proporcao = i / 4
              const y = MARGEM.cima + ALTURA_INTERNA * (1 - proporcao)
              return (
                <text
                  key={`amp-dir-${valor}`}
                  x={LARGURA - MARGEM.direita + 8}
                  y={y + 4}
                  textAnchor="start"
                  fontSize={11}
                  fill="currentColor"
                  className="numero text-signal"
                >
                  {formatarMedida(valor)}
                </text>
              )
            })
          : null}

        {/* Eixo X */}
        <line
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={baseY}
          y2={baseY}
          stroke="var(--color-muted)"
          strokeWidth={1}
          opacity={0.7}
        />

        {/* Destaque da coluna selecionada */}
        {pontoSelecionado ? (
          <line
            x1={xCentro(indiceSeguro)}
            x2={xCentro(indiceSeguro)}
            y1={MARGEM.cima}
            y2={baseY}
            stroke="var(--color-brand)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.45}
          />
        ) : null}

        {/* Linha de referência da avaliação/sessão inicial nos modos individuais */}
        {modo === 'repeticoes' && linhaBaseReps !== null && pontos.length >= 2 ? (
          <g>
            <line
              x1={MARGEM.esquerda}
              x2={LARGURA - MARGEM.direita}
              y1={yReps(linhaBaseReps)}
              y2={yReps(linhaBaseReps)}
              stroke="var(--color-muted)"
              strokeWidth={1.2}
              strokeDasharray="4 4"
              opacity={0.75}
            />
            <text
              x={LARGURA - MARGEM.direita}
              y={yReps(linhaBaseReps) - 5}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              className="numero text-muted"
            >
              1ª sessão: {linhaBaseReps} reps
            </text>
          </g>
        ) : null}

        {modo === 'amplitude' && linhaBaseAmp !== null ? (
          <g>
            <line
              x1={MARGEM.esquerda}
              x2={LARGURA - MARGEM.direita}
              y1={yAmp(linhaBaseAmp)}
              y2={yAmp(linhaBaseAmp)}
              stroke="var(--color-muted)"
              strokeWidth={1.2}
              strokeDasharray="4 4"
              opacity={0.75}
            />
            <text
              x={LARGURA - MARGEM.direita}
              y={yAmp(linhaBaseAmp) - 5}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              className="numero text-muted"
            >
              linha de base: {formatarMedida(linhaBaseAmp)}
            </text>
          </g>
        ) : null}

        {/* Modo COMBINADO: barras de repetições + linha de amplitude */}
        {modo === 'combinado' ? (
          <>
            {pontos.map((ponto, i) => {
              const cx = xCentro(i)
              const bx = cx - larguraBarra / 2
              const by = yReps(ponto.repeticoes)
              const bh = Math.max(3, baseY - by)
              const sel = i === indiceSeguro
              return (
                <rect
                  key={`barra-${ponto.inicio}-${i}`}
                  x={bx}
                  y={by}
                  width={larguraBarra}
                  height={bh}
                  rx={5}
                  fill="var(--color-brand)"
                  opacity={sel ? 0.5 : 0.24}
                />
              )
            })}
            {pontos.length > 1 ? (
              <polyline
                points={coordsLinhaAmp}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {pontos.map((ponto, i) => {
              const cx = xCentro(i)
              const cy = yAmp(ponto.amplitude)
              const sel = i === indiceSeguro
              return (
                <circle
                  key={`pt-amp-${ponto.inicio}-${i}`}
                  cx={cx}
                  cy={cy}
                  r={sel ? 5 : 3.5}
                  fill={sel ? 'var(--color-signal)' : 'var(--color-card)'}
                  stroke="var(--color-signal)"
                  strokeWidth={2}
                />
              )
            })}
          </>
        ) : null}

        {/* Modo REPETIÇÕES */}
        {modo === 'repeticoes' ? (
          <>
            {areaReps ? <polygon points={areaReps} fill="var(--color-brand)" fillOpacity={0.14} /> : null}
            {pontos.length > 1 ? (
              <polyline
                points={coordsLinhaReps}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth={2.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {pontos.map((ponto, i) => {
              const cx = xCentro(i)
              const cy = yReps(ponto.repeticoes)
              const sel = i === indiceSeguro
              return (
                <g key={`pt-rep-${ponto.inicio}-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={sel ? 5.5 : 4}
                    fill={sel ? 'var(--color-brand-strong)' : 'var(--color-card)'}
                    stroke="var(--color-brand)"
                    strokeWidth={2.2}
                  />
                  {pontos.length <= 10 || sel ? (
                    <text
                      x={cx}
                      y={Math.max(14, cy - 9)}
                      textAnchor="middle"
                      fontSize={10.5}
                      fontWeight={sel ? 700 : 500}
                      fill="currentColor"
                      className="numero text-ink"
                    >
                      {ponto.repeticoes}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </>
        ) : null}

        {/* Modo AMPLITUDE */}
        {modo === 'amplitude' ? (
          <>
            {areaAmp ? <polygon points={areaAmp} fill="var(--color-signal)" fillOpacity={0.14} /> : null}
            {pontos.length > 1 ? (
              <polyline
                points={coordsLinhaAmp}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth={2.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {pontos.map((ponto, i) => {
              const cx = xCentro(i)
              const cy = yAmp(ponto.amplitude)
              const sel = i === indiceSeguro
              return (
                <g key={`pt-only-amp-${ponto.inicio}-${i}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={sel ? 5.5 : 4}
                    fill={sel ? 'var(--color-signal)' : 'var(--color-card)'}
                    stroke="var(--color-signal)"
                    strokeWidth={2.2}
                  />
                  {pontos.length <= 10 || sel ? (
                    <text
                      x={cx}
                      y={Math.max(14, cy - 9)}
                      textAnchor="middle"
                      fontSize={10.5}
                      fontWeight={sel ? 700 : 500}
                      fill="currentColor"
                      className="numero text-ink"
                    >
                      {formatarMedida(ponto.amplitude)}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </>
        ) : null}

        {/* Rótulos do eixo X + alvos interativos */}
        {pontos.map((ponto, i) => {
          const cx = xCentro(i)
          const sel = i === indiceSeguro
          return (
            <g key={`x-${ponto.inicio}-${i}`}>
              {mostrarRotuloX(i) || sel ? (
                <text
                  x={cx}
                  y={baseY + 18}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={sel ? 700 : 400}
                  fill="currentColor"
                  className={`numero ${sel ? 'text-ink' : 'text-muted'}`}
                >
                  {formatarDiaMes(ponto.inicio)}
                </text>
              ) : null}
              <rect
                x={MARGEM.esquerda + larguraColuna * i}
                y={MARGEM.cima - 4}
                width={larguraColuna}
                height={ALTURA_INTERNA + 32}
                fill="transparent"
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-pressed={sel}
                aria-label={`Sessão ${i + 1} de ${formatarDataHora(ponto.inicio)}: ${ponto.repeticoes} repetições, amplitude ${formatarMedida(ponto.amplitude)}`}
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

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        {modo !== 'amplitude' ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block rounded ${
                modo === 'combinado' ? 'h-2.5 w-2.5 bg-brand/45' : 'h-0.5 w-4 bg-brand'
              }`}
            />
            Repetições válidas {modo === 'combinado' ? '(barras · eixo esquerdo)' : ''}
          </span>
        ) : null}
        {modo !== 'repeticoes' ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-signal" />
            Amplitude máxima {modo === 'combinado' ? '(linha · eixo direito)' : ''}
          </span>
        ) : null}
      </figcaption>

      {pontoSelecionado ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-paper/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="etiqueta">Sessão #{indiceSeguro + 1}</p>
              <p className="numero mt-0.5 text-sm font-medium text-ink">
                {formatarDataHora(pontoSelecionado.inicio)}
              </p>
            </div>
            <div>
              <p className="etiqueta">Repetições válidas</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="numero text-sm font-semibold">{pontoSelecionado.repeticoes}</span>
                {pontoAnterior ? (
                  <Tendencia delta={pontoSelecionado.repeticoes - pontoAnterior.repeticoes} />
                ) : null}
              </div>
            </div>
            <div>
              <p className="etiqueta">Amplitude máxima</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="numero text-sm font-semibold">
                  {formatarMedida(pontoSelecionado.amplitude)} unid.
                </span>
                {pontoAnterior ? (
                  <Tendencia
                    delta={
                      Math.round((pontoSelecionado.amplitude - pontoAnterior.amplitude) * 10) / 10
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>

          {pontoSelecionado.sessaoId ? (
            <Link
              href={`/sessao/${pontoSelecionado.sessaoId}/resultado`}
              className="no-print text-xs font-semibold text-brand-strong hover:underline"
            >
              Ver resultado completo →
            </Link>
          ) : null}
        </div>
      ) : null}
    </figure>
  )
}
