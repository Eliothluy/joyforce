import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterPacienteDetalhe, obterSessaoDetalhe } from '@/lib/server/consultas'
import { CabecalhoApp } from '@/components/CabecalhoApp'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Tendencia } from '@/components/Tendencia'
import { GradeAlcances, alcancePorDirecao } from '@/components/GradeAlcances'
import { GraficoRepeticoesSessao } from '@/components/GraficoRepeticoesSessao'
import { ComparacaoVisualSessao } from '@/components/ComparacaoVisualSessao'
import { RadarAlcances } from '@/components/RadarAlcances'
import { BotaoImprimir } from '@/components/BotaoImprimir'
import { IconeCheck } from '@/components/Icones'
import {
  formatarDataHora,
  formatarMedida,
  rotuloDirecao,
  rotuloTipoAvaliacao,
} from '@/lib/domain/constantes'
import { formatarDuracaoMinutos } from '@/lib/ui-format'

/**
 * Resultado da sessão. O caminho normal chega aqui logo após o PATCH concluir;
 * ao recarregar, a comparação é recomposta pelo servidor a partir das consultas
 * (sessão + paciente): sessão anterior concluída e avaliação inicial.
 */
export default async function PaginaResultadoSessao({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return null

  const { id } = await params
  const detalhe = await obterSessaoDetalhe(usuario.id, id)
  if (!detalhe) notFound()
  const { sessao, exercicio, repeticoes } = detalhe
  if (sessao.status === 'PREPARANDO') redirect(`/sessao/${id}/preparar`)
  if (sessao.status === 'EM_ANDAMENTO') redirect(`/sessao/${id}/executar`)
  if (sessao.status === 'ABORTADA') redirect(`/fisio/pacientes/${sessao.pacienteId}`)

  const detalhePaciente = await obterPacienteDetalhe(usuario.id, sessao.pacienteId)
  const pacienteNome = detalhePaciente?.paciente.nome ?? null

  // --- recomposição da comparação (mesma regra do ResultadoSessaoDTO) -------
  const concluidasAnteriores = (detalhePaciente?.sessoes ?? [])
    .filter((outra) => outra.status === 'CONCLUIDA' && outra.id !== sessao.id)
    .filter((outra) => new Date(outra.inicio).getTime() < new Date(sessao.inicio).getTime())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
  const anterior = concluidasAnteriores[concluidasAnteriores.length - 1]

  const repeticoesAnterior = anterior ? anterior.totalRepeticoesValidas : null
  const amplitudeAnterior = anterior ? anterior.amplitudeMaxima : null
  const avaliacaoInicial = detalhePaciente?.avaliacoes.find((a) => a.tipo === 'INICIAL') ?? null
  const alcanceInicial = avaliacaoInicial
    ? alcancePorDirecao(avaliacaoInicial, exercicio.direcao)
    : null

  const avancouRepeticoes =
    repeticoesAnterior === null ? null : sessao.totalRepeticoesValidas - repeticoesAnterior
  const avancouAmplitude =
    amplitudeAnterior === null
      ? null
      : Math.round((sessao.amplitudeMaxima - amplitudeAnterior) * 10) / 10
  const avancouAlcance =
    alcanceInicial === null
      ? null
      : Math.round((sessao.amplitudeMaxima - alcanceInicial) * 10) / 10

  // Registro gerado por esta sessão (INICIAL na primeira, ACOMPANHAMENTO depois).
  const avaliacaoGerada = (detalhePaciente?.avaliacoes ?? []).find(
    (avaliacao) => avaliacao.sessaoId === sessao.id,
  )

  const repeticoesValidas = repeticoes.filter((r) => r.valida)
  const invalidas = repeticoes.length - repeticoesValidas.length
  const taxaAproveitamento =
    repeticoes.length > 0 ? Math.round((repeticoesValidas.length / repeticoes.length) * 100) : 100
  const duracaoMediaValidasSeg =
    repeticoesValidas.length > 0
      ? Math.round(
          (repeticoesValidas.reduce((acc, r) => acc + r.duracaoMs, 0) /
            repeticoesValidas.length /
            1000) *
            10,
        ) / 10
      : null
  const amplitudeMediaValidas =
    repeticoesValidas.length > 0
      ? Math.round(
          (repeticoesValidas.reduce((acc, r) => acc + r.amplitude, 0) / repeticoesValidas.length) *
            10,
        ) / 10
      : null
  const duracaoSessao = formatarDuracaoMinutos(sessao.inicio, sessao.fim)

  const dataReferencia = formatarDataHora(sessao.fim ?? sessao.inicio)

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="no-print print:hidden">
            <Link
              href={`/fisio/pacientes/${sessao.pacienteId}`}
              className="text-xs font-medium text-muted hover:text-brand-strong hover:underline"
            >
              ← Ficha de {pacienteNome ?? 'paciente'}
            </Link>
          </div>

          <PageHeader
            contexto={pacienteNome ? `Resultado da sessão · ${pacienteNome}` : 'Resultado da sessão'}
            titulo="Sessão concluída"
            descricao={`Registrada em ${dataReferencia}${anterior ? ` · anterior: ${formatarDataHora(anterior.fim ?? anterior.inicio)}` : ''}`}
            acoes={<BotaoImprimir />}
          />

          {/* Cartões heróis */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="text-center">
              <p className="etiqueta">Repetições válidas</p>
              <p className="numero mt-2 text-6xl font-semibold tracking-tight text-brand-strong">
                {sessao.totalRepeticoesValidas}
              </p>
              {repeticoes.length > 0 ? (
                <p className="numero mt-1.5 text-sm text-muted">
                  {sessao.totalRepeticoesValidas} de {repeticoes.length} movimentos válidos ({taxaAproveitamento}%)
                  {invalidas > 0
                    ? ` · ${invalidas} fora do padrão`
                    : ''}
                </p>
              ) : null}
            </Card>
            <Card className="text-center">
              <p className="etiqueta">Amplitude máxima</p>
              <p className="numero mt-2 text-6xl font-semibold tracking-tight text-ink">
                {formatarMedida(sessao.amplitudeMaxima)}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                unidades do dispositivo · direção {rotuloDirecao[exercicio.direcao]}
              </p>
            </Card>
          </div>

          {/* Bloco amigável ao paciente */}
          <div className="flex items-start gap-3.5 rounded-xl border border-brand/30 bg-brand-soft px-5 py-4 text-brand-strong">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white"
            >
              <IconeCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-semibold leading-snug">
                Você completou {sessao.totalRepeticoesValidas}{' '}
                {sessao.totalRepeticoesValidas === 1 ? 'movimento' : 'movimentos'} hoje.
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {anterior && avancouRepeticoes !== null && avancouRepeticoes > 0
                  ? `Foi um avanço: ${avancouRepeticoes} repetições a mais que na sessão de ${formatarDataHora(anterior.fim ?? anterior.inicio)}. Cada movimento dentro do padrão é um passo da reabilitação.`
                  : anterior && avancouRepeticoes !== null && avancouRepeticoes < 0
                    ? `Hoje foram ${Math.abs(avancouRepeticoes)} repetições a menos que na sessão de ${formatarDataHora(anterior.fim ?? anterior.inicio)}. Oscilações fazem parte — o importante é a constância das sessões.`
                    : anterior && avancouRepeticoes === 0
                      ? 'Você repetiu a mesma marca da sessão anterior — constância também é evolução.'
                      : 'Este é o seu ponto de partida: a próxima sessão será comparada com o registro de hoje.'}
              </p>
            </div>
          </div>

          {/* Métricas de ritmo da sessão */}
          <section aria-label="Métricas de ritmo da sessão" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="py-3.5">
              <p className="etiqueta">Aproveitamento</p>
              <p className="numero mt-1 text-2xl font-semibold text-brand-strong">
                {repeticoes.length > 0 ? `${taxaAproveitamento}%` : '—'}
              </p>
              <p className="text-xs text-muted">dentro do padrão</p>
            </Card>
            <Card className="py-3.5">
              <p className="etiqueta">Duração média</p>
              <p className="numero mt-1 text-2xl font-semibold">
                {duracaoMediaValidasSeg !== null ? `${duracaoMediaValidasSeg} s` : '—'}
              </p>
              <p className="text-xs text-muted">por repetição válida</p>
            </Card>
            <Card className="py-3.5">
              <p className="etiqueta">Amplitude média</p>
              <p className="numero mt-1 text-2xl font-semibold">
                {amplitudeMediaValidas !== null ? formatarMedida(amplitudeMediaValidas) : '—'}
                {amplitudeMediaValidas !== null ? (
                  <span className="ml-1 text-xs font-normal text-muted">unid.</span>
                ) : null}
              </p>
              <p className="text-xs text-muted">nas válidas</p>
            </Card>
            <Card className="py-3.5">
              <p className="etiqueta">Tempo da sessão</p>
              <p className="numero mt-1 text-2xl font-semibold">{duracaoSessao ?? '—'}</p>
              <p className="text-xs text-muted">início até conclusão</p>
            </Card>
          </section>

          {/* Gráfico movimento a movimento */}
          <GraficoRepeticoesSessao
            repeticoes={repeticoes}
            exercicio={exercicio}
            alcanceInicial={alcanceInicial}
          />

          {/* Comparação visual + Deltas */}
          <ComparacaoVisualSessao
            repeticoesHoje={sessao.totalRepeticoesValidas}
            repeticoesAnterior={repeticoesAnterior}
            amplitudeHoje={sessao.amplitudeMaxima}
            amplitudeAnterior={amplitudeAnterior}
            alcanceInicial={alcanceInicial}
            rotuloDirecao={rotuloDirecao[exercicio.direcao]}
          />

          <Card>
            <h2 className="mb-4 font-semibold">Resumo comparativo</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="etiqueta">vs. sessão anterior (repetições)</dt>
                <dd className="mt-1">
                  {avancouRepeticoes === null ? (
                    <span className="text-sm text-muted">Sem base de comparação</span>
                  ) : (
                    <Tendencia delta={avancouRepeticoes} />
                  )}
                </dd>
              </div>
              <div>
                <dt className="etiqueta">vs. sessão anterior (amplitude)</dt>
                <dd className="mt-1">
                  {avancouAmplitude === null ? (
                    <span className="text-sm text-muted">Sem base de comparação</span>
                  ) : (
                    <Tendencia delta={avancouAmplitude} />
                  )}
                </dd>
              </div>
              <div>
                <dt className="etiqueta">
                  vs. avaliação inicial ({rotuloDirecao[exercicio.direcao]})
                </dt>
                <dd className="mt-1">
                  {avancouAlcance === null ? (
                    <span className="text-sm text-muted">Sem avaliação inicial</span>
                  ) : (
                    <Tendencia delta={avancouAlcance} />
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {avaliacaoGerada ? (
            <Card>
              <div className="mb-4">
                <h2 className="font-semibold">{rotuloTipoAvaliacao[avaliacaoGerada.tipo]}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Gerada automaticamente ao concluir esta sessão, em{' '}
                  {formatarDataHora(avaliacaoGerada.dataHora)}.
                </p>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-[310px_1fr]">
                <RadarAlcances
                  inicial={avaliacaoInicial ?? avaliacaoGerada}
                  atual={avaliacaoGerada}
                  rotuloInicial="Avaliação inicial"
                  rotuloAtual="Esta sessão"
                />
                <GradeAlcances avaliacao={avaliacaoGerada} referencia={avaliacaoInicial} />
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="font-semibold">Avaliação da sessão</h2>
              <p className="mt-0.5 text-sm text-muted">
                O registro da avaliação desta sessão ainda não está disponível. Atualize a página
                em instantes.
              </p>
            </Card>
          )}

          <div className="no-print flex flex-wrap items-center gap-2 print:hidden">
            <Link
              href={`/fisio/pacientes/${sessao.pacienteId}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-base font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Voltar para a ficha do paciente
            </Link>
            <Link
              href="/fisio/pacientes"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-soft"
            >
              Ver todos os pacientes
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
