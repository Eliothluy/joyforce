'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PacienteListagemDTO } from '@/types/listagem'
import { formatarDataHora, formatarMedida, idadeEmAnos } from '@/lib/domain/constantes'
import { formatarTelefone, formatarTempoRelativoDias, iniciaisNome } from '@/lib/ui-format'
import { classesBotao } from '@/components/Botao'
import { EstadoVazio } from '@/components/EstadoVazio'
import { SparklineEvolucao } from '@/components/SparklineEvolucao'
import { Tendencia } from '@/components/Tendencia'

type FiltroLista = 'todos' | 'ativos' | 'parados' | 'sem-avaliacao'
type OrdemLista = 'nome' | 'ultima' | 'sessoes'

function correspondeFiltro(p: PacienteListagemDTO, filtro: FiltroLista): boolean {
  switch (filtro) {
    case 'todos':
      return true
    case 'ativos':
      return p.diasSemSessao !== null && p.diasSemSessao <= 7
    case 'parados':
      return p.totalSessoesConcluidas > 0 && (p.diasSemSessao ?? 0) > 7
    case 'sem-avaliacao':
      return !p.temAvaliacaoInicial
  }
}

/**
 * Listagem interativa de pacientes com filtros clínicos rápidos, ordenação,
 * mini gráfico de tendência (sparkline) e selo de constância semanal.
 */
export function ListaPacientesInterativa({
  pacientes,
  busca,
}: {
  pacientes: PacienteListagemDTO[]
  busca: string
}) {
  const [filtro, definirFiltro] = useState<FiltroLista>('todos')
  const [ordem, definirOrdem] = useState<OrdemLista>('nome')

  const temBusca = busca.length > 0

  if (pacientes.length === 0) {
    return temBusca ? (
      <EstadoVazio
        titulo={`Nenhum paciente encontrado para “${busca}”`}
        descricao="Confira a grafia do nome ou limpe a busca para ver todos os seus pacientes."
        acao={
          <Link href="/fisio/pacientes" className={classesBotao('secundario')}>
            Limpar busca
          </Link>
        }
      />
    ) : (
      <EstadoVazio
        titulo="Nenhum paciente cadastrado"
        descricao="Comece cadastrando o primeiro paciente. A primeira sessão dele gerará a avaliação inicial, que servirá de linha de base para a evolução."
        acao={
          <Link href="/fisio/pacientes/novo" className={classesBotao('primario')}>
            Cadastrar paciente
          </Link>
        }
      />
    )
  }

  const contadores: Record<FiltroLista, number> = {
    todos: pacientes.length,
    ativos: pacientes.filter((p) => correspondeFiltro(p, 'ativos')).length,
    parados: pacientes.filter((p) => correspondeFiltro(p, 'parados')).length,
    'sem-avaliacao': pacientes.filter((p) => correspondeFiltro(p, 'sem-avaliacao')).length,
  }

  const filtrados = pacientes
    .filter((p) => correspondeFiltro(p, filtro))
    .sort((a, b) => {
      if (ordem === 'sessoes') {
        return b.totalSessoesConcluidas - a.totalSessoesConcluidas || a.nome.localeCompare(b.nome)
      }
      if (ordem === 'ultima') {
        const ta = a.ultimaSessao ? new Date(a.ultimaSessao.inicio).getTime() : -1
        const tb = b.ultimaSessao ? new Date(b.ultimaSessao.inicio).getTime() : -1
        return tb - ta || a.nome.localeCompare(b.nome)
      }
      return a.nome.localeCompare(b.nome)
    })

  const opcoesFiltro: { id: FiltroLista; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'ativos', rotulo: 'Ativos (7d)' },
    { id: 'parados', rotulo: 'Sem sessão >7d' },
    { id: 'sem-avaliacao', rotulo: 'Sem avaliação' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filtrar lista de pacientes"
          className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1"
        >
          {opcoesFiltro.map((op) => {
            const ativo = filtro === op.id
            return (
              <button
                key={op.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => definirFiltro(op.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  ativo ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:text-ink'
                }`}
              >
                <span>{op.rotulo}</span>
                <span className="numero text-[11px] opacity-80">{contadores[op.id]}</span>
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-xs text-muted">
          <span>Ordenar:</span>
          <select
            value={ordem}
            onChange={(evento) => definirOrdem(evento.target.value as OrdemLista)}
            className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-brand"
          >
            <option value="nome">Nome (A–Z)</option>
            <option value="ultima">Última sessão</option>
            <option value="sessoes">Mais sessões</option>
          </select>
        </label>
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum paciente neste filtro"
          descricao="Experimente selecionar outro filtro ou limpar a busca."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtrados.map((paciente) => {
            const ultima = paciente.ultimaSessao
            return (
              <li key={paciente.id}>
                <Link
                  href={`/fisio/pacientes/${paciente.id}`}
                  className="card card-interativo block p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong"
                      >
                        {iniciaisNome(paciente.nome)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-ink">{paciente.nome}</p>
                          {paciente.semanasConsecutivas >= 2 ? (
                            <span className="numero rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
                              {paciente.semanasConsecutivas} sem. seguidas
                            </span>
                          ) : !paciente.temAvaliacaoInicial ? (
                            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">
                              1ª avaliação pendente
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {paciente.lesaoDiagnostico}
                        </p>
                        <p className="numero mt-1 text-xs text-muted">
                          {idadeEmAnos(paciente.dataNascimento)} anos ·{' '}
                          {formatarTelefone(paciente.telefone)} · {paciente.totalSessoesConcluidas}{' '}
                          {paciente.totalSessoesConcluidas === 1 ? 'sessão' : 'sessões'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 border-t border-line pt-3 md:border-0 md:pt-0">
                      <div className="hidden sm:block">
                        <p className="etiqueta mb-1">Ritmo</p>
                        <SparklineEvolucao
                          valores={paciente.serieRepeticoes}
                          largura={86}
                          altura={26}
                          rotulo={`Evolução de repetições de ${paciente.nome}`}
                        />
                      </div>
                      <div>
                        <p className="etiqueta">Última sessão</p>
                        {ultima ? (
                          <>
                            <p className="numero mt-0.5 text-sm font-medium">
                              {formatarDataHora(ultima.inicio)}
                            </p>
                            <p className="numero text-xs text-muted">
                              {ultima.totalRepeticoesValidas} reps · amp.{' '}
                              {formatarMedida(ultima.amplitudeMaxima)} ·{' '}
                              {formatarTempoRelativoDias(paciente.diasSemSessao)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-muted">Nenhuma concluída</p>
                        )}
                      </div>
                      <div className="min-w-16">
                        <p className="etiqueta">Tendência</p>
                        <div className="mt-1">
                          <Tendencia delta={paciente.variacaoRepeticoes} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
