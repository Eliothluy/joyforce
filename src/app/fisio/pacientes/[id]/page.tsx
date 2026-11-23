import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { gerarSemanasConstancia, obterPacienteDetalhe } from '@/lib/server/consultas'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { EstadoVazio } from '@/components/EstadoVazio'
import { StatusBadge } from '@/components/StatusBadge'
import { Tendencia } from '@/components/Tendencia'
import { GraficoEvolucao } from '@/components/GraficoEvolucao'
import { GradeAlcances } from '@/components/GradeAlcances'
import { RadarAlcances } from '@/components/RadarAlcances'
import { CalendarioConstancia } from '@/components/CalendarioConstancia'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { formatarDataHora, formatarMedida, idadeEmAnos } from '@/lib/domain/constantes'
import { formatarDuracaoMinutos, formatarTelefone } from '@/lib/ui-format'
import { BotaoIniciarSessao } from './botao-iniciar-sessao'

function porInicio(a: { inicio: string }, b: { inicio: string }): number {
  return new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
}

export default async function PaginaFichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return null

  const { id } = await params
  const detalhe = await obterPacienteDetalhe(usuario.id, id)
  if (!detalhe) notFound()

  const { paciente, avaliacoes, sessoes, resumo } = detalhe

  const inicial = avaliacoes.find((avaliacao) => avaliacao.tipo === 'INICIAL') ?? null
  const ultimaAvaliacao = avaliacoes.at(-1) ?? null
  const concluidas = sessoes.filter((sessao) => sessao.status === 'CONCLUIDA').sort(porInicio)
  const primeiraSessao = concluidas[0] ?? null
  const ultimaSessao = concluidas.at(-1) ?? null

  const pontosEvolucao = concluidas.map((sessao) => ({
    inicio: sessao.fim ?? sessao.inicio,
    repeticoes: sessao.totalRepeticoesValidas,
    amplitude: sessao.amplitudeMaxima,
    sessaoId: sessao.id,
  }))

  const semanasConstancia = gerarSemanasConstancia(concluidas, 8)

  const sessoesComNumero = [...sessoes].sort(porInicio).map((sessao, indice) => ({
    sessao,
    numero: indice + 1,
  }))
  const historico = sessoesComNumero.reverse()
  const maxAmplitudeHistorico = Math.max(...sessoes.map((s) => s.amplitudeMaxima), 1)

  const ganhoRepsDesdeInicio =
    concluidas.length >= 2 && primeiraSessao && ultimaSessao
      ? ultimaSessao.totalRepeticoesValidas - primeiraSessao.totalRepeticoesValidas
      : null
  const ganhoAmpDesdeInicio =
    concluidas.length >= 2 && primeiraSessao && ultimaSessao
      ? Math.round((ultimaSessao.amplitudeMaxima - primeiraSessao.amplitudeMaxima) * 10) / 10
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print print:hidden">
        <Link
          href="/fisio/pacientes"
          className="text-xs font-medium text-muted hover:text-brand-strong hover:underline"
        >
          ← Todos os pacientes
        </Link>
      </div>

      <PageHeader
        contexto="Ficha do paciente"
        titulo={paciente.nome}
        descricao={`${idadeEmAnos(paciente.dataNascimento)} anos · ${paciente.lesaoDiagnostico} · telefone ${formatarTelefone(paciente.telefone)}`}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <BotaoImprimir />
            <BotaoIniciarSessao pacienteId={paciente.id} />
          </div>
        }
      />

      {avaliacoes.length === 0 ? (
        <div className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand-strong">
          <p className="font-semibold">Primeira sessão</p>
          <p className="mt-0.5">
            Este paciente ainda não tem avaliações. Ao concluir a primeira sessão, o JoyForce gera
            a Avaliação inicial automaticamente — é ela que serve de linha de base para a evolução.
          </p>
        </div>
      ) : null}

      {/* KPIs de resumo da ficha */}
      <section aria-label="Resumo do paciente" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="py-4">
          <p className="etiqueta">Sessões concluídas</p>
          <p className="numero mt-1.5 text-3xl font-semibold text-brand-strong">
            {resumo.totalSessoes}
          </p>
          <p className="mt-1 text-xs text-muted">
            {sessoes.length > resumo.totalSessoes
              ? `${sessoes.length} iniciadas no total`
              : 'aproveitamento completo'}
          </p>
        </Card>

        <Card className="py-4">
          <p className="etiqueta">Repetições válidas</p>
          <p className="numero mt-1.5 text-3xl font-semibold text-ink">{resumo.totalRepeticoes}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {resumo.repeticoesUltimaSessao !== null
                ? `última: ${resumo.repeticoesUltimaSessao}`
                : 'sem sessões'}
            </span>
            {resumo.variacaoRepeticoes !== null ? (
              <Tendencia delta={resumo.variacaoRepeticoes} />
            ) : null}
          </div>
        </Card>

        <Card className="py-4">
          <p className="etiqueta">Amplitude média</p>
          <p className="numero mt-1.5 text-3xl font-semibold text-ink">
            {resumo.totalSessoes > 0 ? formatarMedida(resumo.amplitudeMedia) : '—'}
            {resumo.totalSessoes > 0 ? (
              <span className="ml-1 text-xs font-normal text-muted">unid.</span>
            ) : null}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">vs. 3 anteriores</span>
            {resumo.variacaoAmplitude !== null ? (
              <Tendencia delta={resumo.variacaoAmplitude} />
            ) : null}
          </div>
        </Card>

        <Card className="py-4">
          <p className="etiqueta">Semanas seguidas</p>
          <p className="numero mt-1.5 text-3xl font-semibold text-brand-strong">
            {resumo.semanasConsecutivas}
          </p>
          <p className="mt-1 text-xs text-muted">constância ISO</p>
        </Card>
      </section>

      {/* Evolução desde o início (quando há ≥ 2 sessões concluídas) */}
      {concluidas.length >= 2 && primeiraSessao && ultimaSessao ? (
        <Card className="border-brand/25 bg-brand-soft/45">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="etiqueta text-brand-strong">Evolução desde o início</p>
              <p className="mt-0.5 text-sm text-muted">
                Comparação direta da 1ª sessão ({formatarDataHora(primeiraSessao.inicio)}) até a
                mais recente ({formatarDataHora(ultimaSessao.inicio)}).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="etiqueta">Repetições</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="numero text-base font-semibold">
                    {primeiraSessao.totalRepeticoesValidas} → {ultimaSessao.totalRepeticoesValidas}
                  </span>
                  <Tendencia delta={ganhoRepsDesdeInicio} />
                </div>
              </div>
              <div>
                <p className="etiqueta">Amplitude máxima</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="numero text-base font-semibold">
                    {formatarMedida(primeiraSessao.amplitudeMaxima)} →{' '}
                    {formatarMedida(ultimaSessao.amplitudeMaxima)}
                  </span>
                  <Tendencia delta={ganhoAmpDesdeInicio} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Gráfico principal interativo de evolução */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Evolução por sessão</h2>
          {concluidas.length > 0 ? (
            <span className="numero text-xs text-muted">
              {concluidas.length} {concluidas.length === 1 ? 'sessão concluída' : 'sessões concluídas'}
            </span>
          ) : null}
        </div>
        {pontosEvolucao.length === 0 ? (
          <EstadoVazio
            titulo="Sem sessões concluídas ainda"
            descricao="Cada sessão concluída vira um ponto no gráfico: repetições válidas e amplitude máxima, semana a semana."
          />
        ) : (
          <GraficoEvolucao
            pontos={pontosEvolucao}
            alcanceInicial={inicial ? inicial.alcanceFrente : null}
          />
        )}
      </Card>

      {/* Alcances direcionais (Radar + Grade) e Constância semanal */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">Alcances direcionais</h2>
              <p className="text-xs text-muted">
                {inicial && ultimaAvaliacao && ultimaAvaliacao.id !== inicial.id
                  ? 'Comparação entre a avaliação inicial e a última avaliação registrada.'
                  : 'Medidas de alcance registradas na avaliação inicial (RF-04).'}
              </p>
            </div>
          </div>
          {inicial ? (
            <div className="flex flex-col gap-4">
              <RadarAlcances inicial={inicial} atual={ultimaAvaliacao} />
              <GradeAlcances avaliacao={ultimaAvaliacao ?? inicial} referencia={inicial} />
              <p className="text-xs text-muted">
                Inicial: {formatarDataHora(inicial.dataHora)}
                {ultimaAvaliacao && ultimaAvaliacao.id !== inicial.id
                  ? ` · Mais recente: ${formatarDataHora(ultimaAvaliacao.dataHora)}`
                  : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Ainda sem avaliação inicial. As medidas de alcance aparecem aqui depois da primeira
              sessão concluída.
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <CalendarioConstancia
            semanas={semanasConstancia}
            semanasConsecutivas={resumo.semanasConsecutivas}
          />

          <Card>
            <h2 className="mb-2 font-semibold">Resumo clínico rápido</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="etiqueta">Última sessão</dt>
                <dd className="numero mt-0.5 font-medium">
                  {ultimaSessao ? formatarDataHora(ultimaSessao.inicio) : '—'}
                </dd>
              </div>
              <div>
                <dt className="etiqueta">Maior amplitude</dt>
                <dd className="numero mt-0.5 font-medium">
                  {concluidas.length > 0
                    ? `${formatarMedida(Math.max(...concluidas.map((s) => s.amplitudeMaxima)))} unid.`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="etiqueta">Recorde de repetições</dt>
                <dd className="numero mt-0.5 font-medium">
                  {concluidas.length > 0
                    ? `${Math.max(...concluidas.map((s) => s.totalRepeticoesValidas))} reps`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="etiqueta">Avaliações registradas</dt>
                <dd className="numero mt-0.5 font-medium">{avaliacoes.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Histórico de sessões */}
      <Card>
        <h2 className="mb-3 font-semibold">Histórico de sessões</h2>
        {historico.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma sessão registrada"
            descricao="Use “Iniciar sessão” para começar: conectar o dispositivo, calibrar e registrar os movimentos."
          />
        ) : (
          <ul className="divide-y divide-line">
            {historico.map(({ sessao, numero }) => {
              const duracao = formatarDuracaoMinutos(sessao.inicio, sessao.fim)
              const barraPct =
                sessao.amplitudeMaxima > 0
                  ? Math.max(6, Math.round((sessao.amplitudeMaxima / maxAmplitudeHistorico) * 100))
                  : 0

              return (
                <li key={sessao.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <span className="numero w-8 shrink-0 text-xs font-semibold text-muted">
                    #{numero}
                  </span>
                  <div className="min-w-44 flex-1">
                    <p className="numero text-sm font-medium">
                      {formatarDataHora(sessao.inicio)}
                      {duracao ? <span className="ml-2 text-xs text-muted">· {duracao}</span> : null}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="numero text-xs text-muted">
                        {sessao.totalRepeticoesValidas} repetições · amplitude{' '}
                        {formatarMedida(sessao.amplitudeMaxima)}
                      </span>
                      {barraPct > 0 ? (
                        <span
                          aria-hidden="true"
                          className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line/70 sm:inline-block"
                        >
                          <span
                            className="block h-full rounded-full bg-brand/70"
                            style={{ width: `${barraPct}%` }}
                          />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={sessao.status} />
                  {sessao.status === 'CONCLUIDA' ? (
                    <Link
                      href={`/sessao/${sessao.id}/resultado`}
                      className="no-print text-sm font-medium text-brand hover:underline"
                    >
                      Ver resultado
                    </Link>
                  ) : sessao.status === 'EM_ANDAMENTO' || sessao.status === 'PREPARANDO' ? (
                    <Link
                      href={`/sessao/${sessao.id}/preparar`}
                      className="no-print text-sm font-medium text-brand hover:underline"
                    >
                      Retomar
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
