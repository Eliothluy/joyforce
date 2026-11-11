import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterPacienteDetalhe } from '@/lib/server/consultas'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { EstadoVazio } from '@/components/EstadoVazio'
import { StatusBadge } from '@/components/StatusBadge'
import { GraficoEvolucao } from '@/components/GraficoEvolucao'
import { GradeAlcances } from '@/components/GradeAlcances'
import { idadeEmAnos, formatarDataHora, formatarMedida } from '@/lib/domain/constantes'
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

  const inicial = avaliacoes.find((avaliacao) => avaliacao.tipo === 'INICIAL')
  const concluidas = sessoes
    .filter((sessao) => sessao.status === 'CONCLUIDA')
    .sort(porInicio)
  const pontosEvolucao = concluidas.map((sessao) => ({
    inicio: sessao.fim ?? sessao.inicio,
    repeticoes: sessao.totalRepeticoesValidas,
    amplitude: sessao.amplitudeMaxima,
  }))
  const historico = [...sessoes].sort(porInicio).reverse()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        contexto="Ficha do paciente"
        titulo={paciente.nome}
        descricao={`${idadeEmAnos(paciente.dataNascimento)} anos · ${paciente.lesaoDiagnostico} · telefone ${paciente.telefone}`}
        acoes={<BotaoIniciarSessao pacienteId={paciente.id} />}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Linha de base</h2>
          {inicial ? (
            <>
              <GradeAlcances avaliacao={inicial} />
              <p className="mt-3 text-sm text-muted">
                Avaliação inicial registrada em {formatarDataHora(inicial.dataHora)}.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              Ainda sem avaliação inicial. As medidas de alcance aparecem aqui depois da primeira
              sessão concluída.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Resumo</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="etiqueta">Sessões concluídas</dt>
              <dd className="numero mt-0.5 text-2xl font-semibold">{resumo.totalSessoes}</dd>
            </div>
            <div>
              <dt className="etiqueta">Repetições válidas</dt>
              <dd className="numero mt-0.5 text-2xl font-semibold">{resumo.totalRepeticoes}</dd>
            </div>
            <div>
              <dt className="etiqueta">Amplitude média</dt>
              <dd className="numero mt-0.5 text-2xl font-semibold">
                {formatarMedida(resumo.amplitudeMedia)}
              </dd>
            </div>
            <div>
              <dt className="etiqueta">Semanas seguidas</dt>
              <dd className="numero mt-0.5 text-2xl font-semibold">{resumo.semanasConsecutivas}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Evolução por sessão</h2>
        {pontosEvolucao.length === 0 ? (
          <EstadoVazio
            titulo="Sem sessões concluídas ainda"
            descricao="Cada sessão concluída vira um ponto no gráfico: repetições válidas e amplitude máxima, semana a semana."
          />
        ) : (
          <GraficoEvolucao pontos={pontosEvolucao} />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Histórico de sessões</h2>
        {historico.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma sessão registrada"
            descricao="Use “Iniciar sessão” para começar: conectar o dispositivo, calibrar e registrar os movimentos."
          />
        ) : (
          <ul className="divide-y divide-line">
            {historico.map((sessao) => (
              <li key={sessao.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-44">
                  <p className="numero text-sm font-medium">{formatarDataHora(sessao.inicio)}</p>
                  <p className="numero text-xs text-muted">
                    {sessao.totalRepeticoesValidas} repetições · amplitude{' '}
                    {formatarMedida(sessao.amplitudeMaxima)}
                  </p>
                </div>
                <StatusBadge status={sessao.status} />
                <span className="flex-1" aria-hidden />
                {sessao.status === 'CONCLUIDA' ? (
                  <Link
                    href={`/sessao/${sessao.id}/resultado`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Ver resultado
                  </Link>
                ) : sessao.status === 'EM_ANDAMENTO' || sessao.status === 'PREPARANDO' ? (
                  <Link
                    href={`/sessao/${sessao.id}/preparar`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Retomar
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
