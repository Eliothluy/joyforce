'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PacientePainelDTO } from '@/types/painel'
import { formatarMedida } from '@/lib/domain/constantes'
import { formatarTempoRelativoDias, iniciaisNome } from '@/lib/ui-format'
import { Card } from '@/components/Card'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SparklineEvolucao } from '@/components/SparklineEvolucao'
import { Tendencia } from '@/components/Tendencia'

type FiltroPanorama = 'todos' | 'evolucao' | 'atencao'

function emEvolucao(p: PacientePainelDTO): boolean {
  return (p.ganhoRepeticoesDesdeInicio ?? 0) > 0 || (p.ganhoAmplitudeDesdeInicio ?? 0) > 0
}

function precisaAtencao(p: PacientePainelDTO): boolean {
  return (
    p.diasSemSessao === null ||
    p.diasSemSessao > 7 ||
    p.temSessaoAberta ||
    (p.variacaoRepeticoes !== null && p.variacaoRepeticoes <= 0)
  )
}

/**
 * Quadro comparativo de evolução por paciente no painel inicial:
 * mostra linha de base vs. sessão mais recente, sparkline e constância.
 */
export function PainelPacientesResumo({ pacientes }: { pacientes: PacientePainelDTO[] }) {
  const [filtro, definirFiltro] = useState<FiltroPanorama>('todos')

  const qtdEvolucao = pacientes.filter(emEvolucao).length
  const qtdAtencao = pacientes.filter(precisaAtencao).length

  const filtrados = pacientes.filter((p) => {
    if (filtro === 'evolucao') return emEvolucao(p)
    if (filtro === 'atencao') return precisaAtencao(p)
    return true
  })

  const filtros: { id: FiltroPanorama; rotulo: string; total: number }[] = [
    { id: 'todos', rotulo: 'Todos', total: pacientes.length },
    { id: 'evolucao', rotulo: 'Em evolução', total: qtdEvolucao },
    { id: 'atencao', rotulo: 'Atenção', total: qtdAtencao },
  ]

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Panorama dos pacientes</h2>
          <p className="text-xs text-muted">
            Evolução da primeira sessão até a última concluída, tendência recente e ritmo semanal.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filtrar panorama de pacientes"
          className="inline-flex flex-wrap rounded-lg border border-line bg-paper p-0.5"
        >
          {filtros.map((f) => {
            const ativo = filtro === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => definirFiltro(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  ativo ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                <span>{f.rotulo}</span>
                <span className="numero rounded-full bg-paper px-1.5 py-0.2 text-[11px] text-muted">
                  {f.total}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {pacientes.length === 0 ? (
        <div className="p-5">
          <EstadoVazio
            titulo="Nenhum paciente cadastrado ainda"
            descricao="Cadastre seu primeiro paciente para acompanhar repetições, amplitude e constância semana a semana."
            acao={
              <Link
                href="/fisio/pacientes/novo"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
              >
                Cadastrar paciente
              </Link>
            }
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="p-5">
          <EstadoVazio
            titulo="Nenhum paciente neste filtro"
            descricao="Todos os pacientes estão em outra condição no momento."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {filtrados.map((p) => {
            const parado = p.diasSemSessao === null || p.diasSemSessao > 7
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-paper/60 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong"
                  >
                    {iniciaisNome(p.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/fisio/pacientes/${p.id}`}
                        className="truncate text-sm font-semibold text-ink hover:text-brand-strong hover:underline"
                      >
                        {p.nome}
                      </Link>
                      {p.temSessaoAberta && p.sessaoAbertaId ? (
                        <Link
                          href={`/sessao/${p.sessaoAbertaId}/preparar`}
                          className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn hover:underline"
                        >
                          Sessão em aberto · retomar
                        </Link>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted">{p.lesaoDiagnostico}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end sm:gap-6">
                  <div className="flex items-center gap-3">
                    <SparklineEvolucao
                      valores={p.serieRepeticoes}
                      largura={88}
                      altura={28}
                      rotulo={`Série de repetições de ${p.nome}`}
                    />
                    <div className="min-w-28">
                      <p className="etiqueta">Repetições</p>
                      {p.totalSessoesConcluidas >= 2 &&
                      p.repeticoesIniciais !== null &&
                      p.repeticoesUltima !== null ? (
                        <p className="numero text-sm font-medium text-ink">
                          {p.repeticoesIniciais} → <span className="font-semibold">{p.repeticoesUltima}</span>
                          {p.ganhoRepeticoesDesdeInicio !== null && p.ganhoRepeticoesDesdeInicio !== 0 ? (
                            <span
                              className={`ml-1.5 text-xs font-semibold ${
                                p.ganhoRepeticoesDesdeInicio > 0 ? 'text-brand-strong' : 'text-signal'
                              }`}
                            >
                              ({p.ganhoRepeticoesDesdeInicio > 0 ? '+' : '−'}
                              {Math.abs(p.ganhoRepeticoesDesdeInicio)})
                            </span>
                          ) : null}
                        </p>
                      ) : p.repeticoesUltima !== null ? (
                        <p className="numero text-sm font-medium text-ink">{p.repeticoesUltima} reps</p>
                      ) : (
                        <p className="text-xs text-muted">Aguardando 1ª sessão</p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-28">
                    <p className="etiqueta">Amplitude</p>
                    {p.totalSessoesConcluidas >= 2 &&
                    p.amplitudeInicial !== null &&
                    p.amplitudeUltima !== null ? (
                      <p className="numero text-sm font-medium text-ink">
                        {formatarMedida(p.amplitudeInicial)} →{' '}
                        <span className="font-semibold">{formatarMedida(p.amplitudeUltima)}</span>
                      </p>
                    ) : p.amplitudeUltima !== null ? (
                      <p className="numero text-sm font-medium text-ink">
                        {formatarMedida(p.amplitudeUltima)} unid.
                      </p>
                    ) : (
                      <p className="text-xs text-muted">—</p>
                    )}
                  </div>

                  <div className="min-w-20">
                    <p className="etiqueta">Tendência</p>
                    <div className="mt-0.5">
                      <Tendencia delta={p.variacaoRepeticoes} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`numero rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.semanasConsecutivas >= 2
                          ? 'bg-brand-soft text-brand-strong'
                          : parado
                            ? 'bg-warn-soft text-warn'
                            : 'border border-line bg-paper text-muted'
                      }`}
                    >
                      {p.semanasConsecutivas >= 1
                        ? `${p.semanasConsecutivas} sem.`
                        : formatarTempoRelativoDias(p.diasSemSessao)}
                    </span>
                    <Link
                      href={`/fisio/pacientes/${p.id}`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Ficha
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
