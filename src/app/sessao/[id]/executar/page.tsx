import { notFound, redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterNomePaciente, obterSessaoDetalhe } from '@/lib/server/consultas'
import { ExecucaoSessao } from './execucao-sessao'

export default async function PaginaExecutarSessao({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return null

  const { id } = await params
  const detalhe = await obterSessaoDetalhe(usuario.id, id)
  if (!detalhe) notFound()
  // Modo kiosk: sem cabeçalho, só o exercício.
  if (detalhe.sessao.status === 'CONCLUIDA') redirect(`/sessao/${id}/resultado`)
  if (detalhe.sessao.status === 'PREPARANDO') redirect(`/sessao/${id}/preparar`)

  const pacienteNome = await obterNomePaciente(usuario.id, detalhe.sessao.pacienteId)

  return (
    <ExecucaoSessao
      sessao={detalhe.sessao}
      exercicio={detalhe.exercicio}
      pacienteNome={pacienteNome}
    />
  )
}
