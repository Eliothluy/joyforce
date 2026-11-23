'use client'

import { useState } from 'react'
import type { ItemFeedDTO, TipoItemFeed } from '@/types/painel'
import { Card } from '@/components/Card'
import { ItemFeed } from '@/components/ItemFeed'
import { EstadoVazio } from '@/components/EstadoVazio'

export type GrupoFeedDia = {
  dia: string
  itens: { item: ItemFeedDTO; hora: string }[]
}

type FiltroFeed = 'tudo' | 'sessoes' | 'cadastros'

const FILTROS: { id: FiltroFeed; rotulo: string }[] = [
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'sessoes', rotulo: 'Sessões' },
  { id: 'cadastros', rotulo: 'Cadastros' },
]

function correspondeFiltro(tipo: TipoItemFeed, filtro: FiltroFeed): boolean {
  if (filtro === 'tudo') return true
  if (filtro === 'sessoes') return tipo === 'SESSAO_CONCLUIDA' || tipo === 'SESSAO_ABORTADA'
  return tipo === 'PACIENTE_CADASTRADO' || tipo === 'AVALIACAO_INICIAL'
}

const LIMITE_INICIAL = 8

/**
 * Feed cronológico agrupado por dia (datas pré-formatadas no servidor)
 * com filtro por tipo de evento e expansão gradual.
 */
export function FeedAtividades({ grupos }: { grupos: GrupoFeedDia[] }) {
  const [filtro, definirFiltro] = useState<FiltroFeed>('tudo')
  const [expandido, definirExpandido] = useState(false)

  const gruposFiltrados: GrupoFeedDia[] = []
  let totalFiltrado = 0

  for (const grupo of grupos) {
    const itensDoDia = grupo.itens.filter((entry) => correspondeFiltro(entry.item.tipo, filtro))
    if (itensDoDia.length > 0) {
      gruposFiltrados.push({ dia: grupo.dia, itens: itensDoDia })
      totalFiltrado += itensDoDia.length
    }
  }

  let restantes = expandido ? Number.POSITIVE_INFINITY : LIMITE_INICIAL
  const gruposVisiveis: GrupoFeedDia[] = []
  for (const grupo of gruposFiltrados) {
    if (restantes <= 0) break
    const fatia = grupo.itens.slice(0, restantes)
    if (fatia.length > 0) {
      gruposVisiveis.push({ dia: grupo.dia, itens: fatia })
      restantes -= fatia.length
    }
  }

  return (
    <section aria-label="Atividade recente">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Atividade dos pacientes</h2>
        {grupos.length > 0 ? (
          <div
            role="tablist"
            aria-label="Filtrar eventos do feed"
            className="inline-flex rounded-lg border border-line bg-card p-0.5"
          >
            {FILTROS.map((f) => {
              const ativo = filtro === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => {
                    definirFiltro(f.id)
                    definirExpandido(false)
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    ativo ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:text-ink'
                  }`}
                >
                  {f.rotulo}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {grupos.length === 0 ? (
        <EstadoVazio
          titulo="Nada por aqui ainda"
          descricao="Assim que você registrar a primeira sessão, o progresso de cada paciente aparece neste feed."
        />
      ) : gruposVisiveis.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum evento neste filtro"
          descricao="Altere o filtro acima para visualizar os demais registros."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {gruposVisiveis.map((grupo) => (
            <Card key={grupo.dia} className="px-2 py-3">
              <p className="etiqueta px-3 pb-1 pt-1">{grupo.dia}</p>
              <div className="flex flex-col divide-y divide-line/60">
                {grupo.itens.map((entry) => (
                  <ItemFeed key={entry.item.id} item={entry.item} hora={entry.hora} />
                ))}
              </div>
            </Card>
          ))}

          {totalFiltrado > LIMITE_INICIAL ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => definirExpandido((atual) => !atual)}
                className="rounded-lg border border-line bg-card px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-brand-soft"
              >
                {expandido
                  ? 'Mostrar menos'
                  : `Ver mais atividades (${totalFiltrado - LIMITE_INICIAL} restantes)`}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
