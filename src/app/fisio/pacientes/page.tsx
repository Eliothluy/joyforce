import Link from 'next/link'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { listarPacientes } from '@/lib/server/consultas'
import { PageHeader } from '@/components/PageHeader'
import { EstadoVazio } from '@/components/EstadoVazio'
import { Tendencia } from '@/components/Tendencia'
import { classesBotao } from '@/components/Botao'
import { idadeEmAnos, formatarDataHora } from '@/lib/domain/constantes'
import { BuscaPacientes } from './busca-pacientes'

/**
 * Lista de pacientes. O servidor entrega PacienteListagemDTO (superconjunto
 * do contrato) já com a última sessão concluída e a tendência — nada de
 * N+1 aqui. Busca por nome recarrega a página via searchParams.
 */
export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return null

  const filtros = await searchParams
  const bruto = filtros.q
  const busca = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim() ?? ''

  const pacientes = await listarPacientes(usuario.id, busca || undefined)
  const temBusca = busca.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        contexto="Pacientes"
        titulo="Seus pacientes"
        descricao="Cada ficha reúne a linha de base, a evolução por sessão e o histórico de medidas."
        acoes={
          <Link href="/fisio/pacientes/novo" className={classesBotao('primario')}>
            Novo paciente
          </Link>
        }
      />

      <BuscaPacientes buscaInicial={busca} />

      {pacientes.length === 0 ? (
        temBusca ? (
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
      ) : (
        <ul className="flex flex-col gap-3">
          {pacientes.map((paciente) => {
            const ultima = paciente.ultimaSessao
            return (
              <li key={paciente.id}>
                <Link
                  href={`/fisio/pacientes/${paciente.id}`}
                  className="card block p-4 transition-colors hover:border-brand"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{paciente.nome}</p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {paciente.lesaoDiagnostico}
                      </p>
                      <p className="numero mt-1 text-sm text-muted">
                        {idadeEmAnos(paciente.dataNascimento)} anos · {paciente.telefone}
                      </p>
                    </div>
                    <div className="flex items-center gap-8 border-t border-line pt-3 sm:border-0 sm:pt-0">
                      <div>
                        <p className="etiqueta">Última sessão</p>
                        {ultima ? (
                          <>
                            <p className="numero mt-0.5 text-sm font-medium">
                              {formatarDataHora(ultima.inicio)}
                            </p>
                            <p className="numero text-sm text-muted">
                              {ultima.totalRepeticoesValidas} repetições
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-muted">Nenhuma concluída</p>
                        )}
                      </div>
                      <div>
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
