'use client'

import { useState } from 'react'
import type { SemanaPainelDTO } from '@/types/painel'
import { formatarMedida } from '@/lib/domain/constantes'
import { calcularTetoGrafico } from '@/lib/ui-format'
import { Card } from '@/components/Card'
import { EstadoVazio } from '@/components/EstadoVazio'

type MetricaSemanal = 'repeticoes' | 'sessoes' | 'amplitude'

const ABAS: { id: MetricaSemanal; rotulo: string; unidade: string }[] = [
  { id: 'repeticoes', rotulo: 'Repetições válidas', unidade: 'reps' },
  { id: 'sessoes', rotulo: 'Sessões concluídas', unidade: 'sessões' },
  { id: 'amplitude', rotulo: 'Amplitude média', unidade: 'unid.' },
]

function valorDaSemana(semana: SemanaPainelDTO, metrica: MetricaSemanal): number {
  switch (metrica) {
    case 'repeticoes':
      return semana.repeticoesValidas
    case 'sessoes':
      return semana.sessoesConcluidas
    case 'amplitude':
      return semana.amplitudeMedia ?? 0
  }
}

const LARGURA = 560
const ALTURA = 216
const MARGEM = { cima: 24, direita: 14, baixo: 34, esquerda: 42 }
const LARGURA_INTERNA = LARGURA - MARGEM.esquerda - MARGEM.direita
const ALTURA_INTERNA = ALTURA - MARGEM.cima - MARGEM.baixo

/**
 * Gráfico de barras interativo das últimas 6 semanas ISO para o painel do
 * fisioterapeuta, com alternância entre volume (repetições), adesão (sessões)
 * e alcance médio (amplitude).
 */
export function GraficoAtividadeSemanal({ semanas }: { semanas: SemanaPainelDTO[] }) {
  const [metrica, definirMetrica] = useState<MetricaSemanal>('repeticoes')
  const [indiceSelecionado, definirIndiceSelecionado] = useState<number>(() =>
    Math.max(0, semanas.length - 1),
  )

  const totalSessoesPeriodo = semanas.reduce((acc, s) => acc + s.sessoesConcluidas, 0)
  const semanaSelecionada = semanas[indiceSelecionado] ?? semanas[semanas.length - 1]

  const valores = semanas.map((s) => valorDaSemana(s, metrica))
  const maximoObservado = valores.length > 0 ? Math.max(...valores) : 0
  const minimoEscala = metrica === 'sessoes' ? 4 : metrica === 'amplitude' ? 100 : 12
  const { teto, passos } = calcularTetoGrafico(maximoObservado, minimoEscala)

  const semanasComAtividade = semanas.filter((s) => s.sessoesConcluidas > 0)
  const mediaAtivas =
    semanasComAtividade.length > 0
      ? semanasComAtividade.reduce((acc, s) => acc + valorDaSemana(s, metrica), 0) /
        semanasComAtividade.length
      : null

  const yDe = (valor: number) => MARGEM.cima + ALTURA_INTERNA * (1 - valor / teto)
  const corPrincipal = metrica === 'amplitude' ? 'var(--color-signal)' : 'var(--color-brand)'
  const corDestaque = metrica === 'amplitude' ? 'var(--color-signal)' : 'var(--color-brand-strong)'

  const larguraColuna = semanas.length > 0 ? LARGURA_INTERNA / semanas.length : LARGURA_INTERNA
  const larguraBarra = Math.min(44, Math.max(22, larguraColuna * 0.56))

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Atividade nas últimas 6 semanas</h2>
          <p className="text-xs text-muted">
            Passe o cursor ou selecione uma semana para detalhar sessões e alcance.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Métrica do gráfico semanal"
          className="inline-flex flex-wrap rounded-lg border border-line bg-paper p-0.5"
        >
          {ABAS.map((aba) => {
            const ativa = metrica === aba.id
            return (
              <button
                key={aba.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => definirMetrica(aba.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  ativa ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                {aba.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {totalSessoesPeriodo === 0 ? (
        <div className="mt-4">
          <EstadoVazio
            titulo="Nenhuma sessão concluída nas últimas 6 semanas"
            descricao="Assim que seus pacientes concluírem sessões, o ritmo semanal aparece aqui automaticamente."
          />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <svg
              viewBox={`0 0 ${LARGURA} ${ALTURA}`}
              className="h-auto w-full select-none"
              role="img"
              aria-label={`Gráfico semanal de ${ABAS.find((a) => a.id === metrica)?.rotulo ?? ''}`}
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
                      {formatarMedida(passo)}
                    </text>
                  </g>
                )
              })}

              {mediaAtivas !== null && mediaAtivas > 0 ? (
                <g>
                  <line
                    x1={MARGEM.esquerda}
                    x2={LARGURA - MARGEM.direita}
                    y1={yDe(mediaAtivas)}
                    y2={yDe(mediaAtivas)}
                    stroke="var(--color-muted)"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                    opacity={0.7}
                  />
                  <text
                    x={LARGURA - MARGEM.direita}
                    y={yDe(mediaAtivas) - 5}
                    textAnchor="end"
                    fontSize={10}
                    fill="currentColor"
                    className="numero text-muted"
                  >
                    média {formatarMedida(mediaAtivas)}
                  </text>
                </g>
              ) : null}

              {semanas.map((semana, indice) => {
                const valor = valorDaSemana(semana, metrica)
                const selecionada = indice === indiceSelecionado
                const centroX = MARGEM.esquerda + larguraColuna * (indice + 0.5)
                const barraX = centroX - larguraBarra / 2
                const barraY = yDe(valor)
                const alturaBarra = Math.max(0, MARGEM.cima + ALTURA_INTERNA - barraY)
                const temValor = valor > 0

                return (
                  <g key={semana.semanaInicio}>
                    {selecionada ? (
                      <rect
                        x={MARGEM.esquerda + larguraColuna * indice + 4}
                        y={MARGEM.cima - 4}
                        width={Math.max(0, larguraColuna - 8)}
                        height={ALTURA_INTERNA + 8}
                        rx={8}
                        fill="var(--color-brand-soft)"
                        opacity={0.45}
                      />
                    ) : null}

                    {temValor ? (
                      <rect
                        x={barraX}
                        y={barraY}
                        width={larguraBarra}
                        height={Math.max(4, alturaBarra)}
                        rx={6}
                        fill={selecionada ? corDestaque : corPrincipal}
                        opacity={selecionada ? 1 : 0.72}
                      />
                    ) : (
                      <rect
                        x={barraX}
                        y={MARGEM.cima + ALTURA_INTERNA - 3}
                        width={larguraBarra}
                        height={3}
                        rx={1.5}
                        fill="var(--color-line)"
                      />
                    )}

                    <text
                      x={centroX}
                      y={temValor ? Math.max(13, barraY - 6) : MARGEM.cima + ALTURA_INTERNA - 9}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={selecionada ? 700 : 500}
                      fill="currentColor"
                      className={`numero ${selecionada ? 'text-ink' : 'text-muted'}`}
                    >
                      {metrica === 'amplitude' && semana.amplitudeMedia === null
                        ? '—'
                        : formatarMedida(valor)}
                    </text>

                    <text
                      x={centroX}
                      y={MARGEM.cima + ALTURA_INTERNA + 18}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={semana.atual || selecionada ? 600 : 400}
                      fill="currentColor"
                      className={semana.atual ? 'text-brand-strong' : 'text-muted'}
                    >
                      {semana.rotulo}
                    </text>

                    <rect
                      x={MARGEM.esquerda + larguraColuna * indice}
                      y={MARGEM.cima - 6}
                      width={larguraColuna}
                      height={ALTURA_INTERNA + 34}
                      fill="transparent"
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-pressed={selecionada}
                      aria-label={`${semana.atual ? 'Semana atual' : `Semana de ${semana.rotulo}`}: ${semana.sessoesConcluidas} sessões, ${semana.repeticoesValidas} repetições válidas`}
                      onMouseEnter={() => definirIndiceSelecionado(indice)}
                      onFocus={() => definirIndiceSelecionado(indice)}
                      onClick={() => definirIndiceSelecionado(indice)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault()
                          definirIndiceSelecionado(indice)
                        }
                      }}
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {semanaSelecionada ? (
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-line bg-paper/70 px-3.5 py-2.5 sm:grid-cols-4">
              <div>
                <p className="etiqueta">
                  {semanaSelecionada.atual ? 'Semana atual' : `Semana ${semanaSelecionada.rotulo}`}
                </p>
                <p className="numero mt-0.5 text-sm font-semibold">
                  {semanaSelecionada.sessoesConcluidas}{' '}
                  {semanaSelecionada.sessoesConcluidas === 1 ? 'sessão' : 'sessões'}
                </p>
              </div>
              <div>
                <p className="etiqueta">Pacientes ativos</p>
                <p className="numero mt-0.5 text-sm font-semibold">
                  {semanaSelecionada.pacientesAtivos}
                </p>
              </div>
              <div>
                <p className="etiqueta">Repetições válidas</p>
                <p className="numero mt-0.5 text-sm font-semibold">
                  {semanaSelecionada.repeticoesValidas}
                </p>
              </div>
              <div>
                <p className="etiqueta">Amplitude média</p>
                <p className="numero mt-0.5 text-sm font-semibold">
                  {semanaSelecionada.amplitudeMedia !== null
                    ? `${formatarMedida(semanaSelecionada.amplitudeMedia)} unid.`
                    : '—'}
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}
