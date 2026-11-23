import Link from 'next/link'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { listarPacientes } from '@/lib/server/consultas'
import { PageHeader } from '@/components/PageHeader'
import { ListaPacientesInterativa } from '@/components/ListaPacientesInterativa'
import { classesBotao } from '@/components/Botao'
import { BuscaPacientes } from './busca-pacientes'

/**
 * Lista de pacientes. O servidor entrega PacienteListagemDTO (superconjunto
 * do contrato) já com a última sessão concluída, tendência e série recente.
 * Busca por nome recarrega a página via searchParams.
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        contexto={`Pacientes · ${pacientes.length} ${pacientes.length === 1 ? 'ficha' : 'fichas'}`}
        titulo="Seus pacientes"
        descricao="Cada ficha reúne a linha de base, a evolução por sessão, constância semanal e o histórico de medidas."
        acoes={
          <Link href="/fisio/pacientes/novo" className={classesBotao('primario')}>
            Novo paciente
          </Link>
        }
      />

      <BuscaPacientes buscaInicial={busca} />

      <ListaPacientesInterativa pacientes={pacientes} busca={busca} />
    </div>
  )
}
