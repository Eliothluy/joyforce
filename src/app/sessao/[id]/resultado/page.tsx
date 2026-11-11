import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterPacienteDetalhe, obterSessaoDetalhe } from '@/lib/server/consultas'
import { CabecalhoApp } from '@/components/CabecalhoApp'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { Tendencia } from '@/components/Tendencia'
import { GradeAlcances, alcancePorDirecao } from '@/components/GradeAlcances'
import {
  formatarDataHora,
  formatarMedida,
  rotuloDirecao,
  rotuloTipoAvaliacao,
} from '@/lib/domain/constantes'

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
    amplitudeAnterior === null ? null : sessao.amplitudeMaxima - amplitudeAnterior
  const avancouAlcance = alcanceInicial === null ? null : sessao.amplitudeMaxima - alcanceInicial

  // Registro gerado por esta sessão (INICIAL na primeira, ACOMPANHAMENTO depois).
  const avaliacaoGerada = (detalhePaciente?.avaliacoes ?? []).find(
    (avaliacao) => avaliacao.sessaoId === sessao.id,
  )
  const invalidas = repeticoes.filter((repeticao) => !repeticao.valida).length

  const dataReferencia = formatarDataHora(sessao.fim ?? sessao.inicio)

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="flex flex-col gap-6">
          <PageHeader
            contexto="Resultado da sessão"
            titulo="Sessão concluída"
            descricao={`Registrada em ${dataReferencia}${anterior ? ` · anterior: ${formatarDataHora(anterior.fim ?? anterior.inicio)}` : ''}`}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="text-center">
              <p className="etiqueta">Repetições válidas</p>
              <p className="numero mt-2 text-6xl font-semibold tracking-tight">
                {sessao.totalRepeticoesValidas}
              </p>
              {invalidas > 0 ? (
                <p className="numero mt-1 text-sm text-muted">
                  {invalidas} movimento{invalidas > 1 ? 's' : ''} fora do padrão (não contam)
                </p>
              ) : null}
            </Card>
            <Card className="text-center">
              <p className="etiqueta">Amplitude máxima</p>
              <p className="numero mt-2 text-6xl font-semibold tracking-tight">
                {formatarMedida(sessao.amplitudeMaxima)}
              </p>
              <p className="mt-1 text-sm text-muted">unidades do dispositivo</p>
            </Card>
          </div>

          <div className="rounded-lg border border-brand/30 bg-brand-soft px-5 py-4 text-brand-strong">
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

          <Card>
            <h2 className="mb-4 font-semibold">Comparação</h2>
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
              <h2 className="font-semibold">{rotuloTipoAvaliacao[avaliacaoGerada.tipo]}</h2>
              <p className="mt-0.5 text-sm text-muted">
                Gerada automaticamente ao concluir esta sessão, em{' '}
                {formatarDataHora(avaliacaoGerada.dataHora)}.
              </p>
              <div className="mt-4">
                <GradeAlcances avaliacao={avaliacaoGerada} />
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

          <div className="flex flex-wrap items-center gap-2">
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
