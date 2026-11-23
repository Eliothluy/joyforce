import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterPainel } from '@/lib/server/consultas'
import { formatarData, formatarMedida } from '@/lib/domain/constantes'
import { formatarTempoRelativoDias } from '@/lib/ui-format'
import { CabecalhoApp } from '@/components/CabecalhoApp'
import { MarcaJoyforce } from '@/components/MarcaJoyforce'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { Tendencia } from '@/components/Tendencia'
import { GraficoAtividadeSemanal } from '@/components/GraficoAtividadeSemanal'
import { ResumoStatusSessoes } from '@/components/ResumoStatusSessoes'
import { PainelPacientesResumo } from '@/components/PainelPacientesResumo'
import { FeedAtividades, type GrupoFeedDia } from '@/components/FeedAtividades'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { classesBotao } from '@/components/Botao'
import {
  IconeAtividade,
  IconeCalendario,
  IconeGrafico,
  IconeUsuarios,
} from '@/components/Icones'
import type { ItemFeedDTO } from '@/types/painel'

const fuso = 'America/Sao_Paulo'

function horaLocal(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: fuso }).format(
    new Date(iso),
  )
}

function saudacao(agora: Date): string {
  const hora = Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: fuso }).format(agora),
  )
  if (hora < 5) return 'Boa madrugada'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function rotuloDia(iso: string, hoje: Date): string {
  const data = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: fuso,
  }).format(new Date(iso))
  const diaHoje = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: fuso,
  }).format(hoje)
  if (data === diaHoje) return 'Hoje'
  const ontem = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: fuso,
  }).format(new Date(hoje.getTime() - 24 * 60 * 60 * 1000))
  if (data === ontem) return 'Ontem'
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: fuso }).format(
    new Date(iso),
  )
}

function agruparPorDia(itens: ItemFeedDTO[], hoje: Date): GrupoFeedDia[] {
  const grupos: GrupoFeedDia[] = []
  for (const item of itens) {
    const dia = rotuloDia(item.dataHora, hoje)
    const entrada = { item, hora: horaLocal(item.dataHora) }
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(entrada)
    else grupos.push({ dia, itens: [entrada] })
  }
  return grupos
}

/**
 * Painel inicial do fisioterapeuta: visão geral dos últimos 7 dias, tendência
 * semanal de 6 semanas, aproveitamento das sessões, panorama comparativo dos
 * pacientes e feed de atividades.
 */
export default async function PaginaInicial() {
  const usuario = await obterUsuarioAtual()
  if (!usuario) redirect('/login')

  const painel = await obterPainel(usuario.id)
  const { resumo } = painel
  const agora = new Date()
  const gruposFeed = agruparPorDia(painel.itens, agora)
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: fuso,
  }).format(agora)

  const percentualAtivos =
    resumo.pacientes > 0 ? Math.round((resumo.pacientesAtivosSemana / resumo.pacientes) * 100) : 0

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <PageHeader
          contexto={dataHoje}
          titulo={`${saudacao(agora)}, ${usuario.nome}.`}
          descricao="Panorama clínico das últimas semanas, adesão ao tratamento e atividade recente dos seus pacientes."
          acoes={
            <div className="no-print flex flex-wrap items-center gap-2">
              <BotaoImprimir rotulo="Imprimir painel" />
              <Link href="/fisio/pacientes" className={classesBotao('secundario')}>
                Ver pacientes
              </Link>
              <Link href="/fisio/pacientes/novo" className={classesBotao('primario')}>
                Novo paciente
              </Link>
            </div>
          }
        />

        {/* Faixa de 4 KPIs principais */}
        <section aria-label="Resumo dos últimos 7 dias" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col justify-between py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="etiqueta">Pacientes ativos (7d)</p>
              <IconeUsuarios className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <p className="numero text-3xl font-semibold tracking-tight text-brand-strong">
                {resumo.pacientesAtivosSemana}
              </p>
              <span className="numero text-sm text-muted">de {resumo.pacientes}</span>
            </div>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${percentualAtivos}%` }}
                />
              </div>
              <p className="numero mt-1 text-xs text-muted">{percentualAtivos}% com sessão na semana</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="etiqueta">Sessões concluídas</p>
              <IconeCalendario className="h-4 w-4 text-brand" />
            </div>
            <p className="numero mt-2 text-3xl font-semibold tracking-tight text-brand-strong">
              {resumo.sessoesSemana}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">últimos 7 dias</span>
              {resumo.variacaoSessoesSemana !== null ? (
                <Tendencia delta={resumo.variacaoSessoesSemana} />
              ) : null}
            </div>
          </Card>

          <Card className="flex flex-col justify-between py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="etiqueta">Repetições válidas</p>
              <IconeAtividade className="h-4 w-4 text-brand" />
            </div>
            <p className="numero mt-2 text-3xl font-semibold tracking-tight text-brand-strong">
              {resumo.repeticoesSemana}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">últimos 7 dias</span>
              {resumo.variacaoRepeticoesSemana !== null ? (
                <Tendencia delta={resumo.variacaoRepeticoesSemana} />
              ) : null}
            </div>
          </Card>

          <Card className="flex flex-col justify-between py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="etiqueta">Amplitude média (7d)</p>
              <IconeGrafico className="h-4 w-4 text-signal" />
            </div>
            <p className="numero mt-2 text-3xl font-semibold tracking-tight text-ink">
              {resumo.amplitudeMediaSemana !== null
                ? formatarMedida(resumo.amplitudeMediaSemana)
                : '—'}
              {resumo.amplitudeMediaSemana !== null ? (
                <span className="ml-1 text-xs font-normal text-muted">unid.</span>
              ) : null}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">média da semana</span>
              {resumo.variacaoAmplitudeSemana !== null ? (
                <Tendencia delta={resumo.variacaoAmplitudeSemana} />
              ) : null}
            </div>
          </Card>
        </section>

        {/* Sessões em andamento retomáveis (lista todas individualmente) */}
        {painel.sessoesAbertas.length > 0 ? (
          <Card className="mt-4 border-warn/30 bg-warn-soft/60">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-semibold">Sessões em andamento</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Retome de onde parou, com a calibração e as repetições preservadas.
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-warn/20">
                {painel.sessoesAbertas.map((sessao) => (
                  <li
                    key={sessao.sessaoId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-ink">{sessao.pacienteNome}</span>
                      <span className="ml-2 text-xs text-muted">
                        ({sessao.status === 'PREPARANDO' ? 'preparando' : 'em andamento'})
                      </span>
                    </div>
                    <Link
                      href={`/sessao/${sessao.sessaoId}/preparar`}
                      className="shrink-0 text-sm font-semibold text-brand-strong underline-offset-2 hover:underline"
                    >
                      Retomar sessão →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ) : null}

        {/* Gráficos principais: Atividade semanal + Aproveitamento e Constância */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_1fr]">
          <GraficoAtividadeSemanal semanas={painel.semanas} />

          <div className="flex flex-col gap-6">
            <ResumoStatusSessoes distribuicao={resumo.distribuicaoStatus} />

            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold tracking-tight">Constância (atenção &gt; 7 dias)</h2>
                  <p className="text-xs text-muted">
                    Pacientes sem sessão concluída nos últimos 7 dias.
                  </p>
                </div>
                {painel.pacientesSemSessaoRecente.length > 0 ? (
                  <span className="numero rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">
                    {painel.pacientesSemSessaoRecente.length}
                  </span>
                ) : null}
              </div>

              {painel.pacientesSemSessaoRecente.length === 0 ? (
                <p className="mt-3 rounded-xl bg-brand-soft/60 px-3 py-2.5 text-sm text-brand-strong">
                  Todos os pacientes concluíram sessão nos últimos 7 dias.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col">
                  {painel.pacientesSemSessaoRecente.map((p) => (
                    <li key={p.pacienteId} className="border-t border-line/60 first:border-t-0">
                      <Link
                        href={`/fisio/pacientes/${p.pacienteId}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand-strong"
                      >
                        <span className="min-w-0 truncate font-medium">{p.pacienteNome}</span>
                        <span className="numero shrink-0 text-xs text-muted">
                          {p.ultimaSessao
                            ? `${formatarTempoRelativoDias(p.diasSemSessao)} (${formatarData(p.ultimaSessao)})`
                            : 'sem sessões'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Quadro comparativo de evolução por paciente */}
        <section aria-label="Panorama dos pacientes" className="mt-6">
          <PainelPacientesResumo pacientes={painel.panoramaPacientes} />
        </section>

        {/* Feed cronológico com filtros */}
        <div className="mt-6">
          <FeedAtividades grupos={gruposFeed} />
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted">
          <span className="opacity-50">
            <MarcaJoyforce className="h-4 w-4" />
          </span>
          JoyForce · reabilitação de membro superior com medição real
        </p>
      </main>
    </div>
  )
}
