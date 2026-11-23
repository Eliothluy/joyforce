import { notFound, redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { obterNomePaciente, obterSessaoDetalhe } from '@/lib/server/consultas'
import { CabecalhoApp } from '@/components/CabecalhoApp'
import { PreparacaoSessao } from './preparacao-sessao'

export default async function PaginaPrepararSessao({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obterUsuarioAtual()
  if (!usuario) return null

  const { id } = await params
  const detalhe = await obterSessaoDetalhe(usuario.id, id)
  if (!detalhe) notFound()
  if (detalhe.sessao.status === 'CONCLUIDA') redirect(`/sessao/${id}/resultado`)

  const pacienteNome = await obterNomePaciente(usuario.id, detalhe.sessao.pacienteId)

  return (
    <div className="min-h-dvh">
      <CabecalhoApp usuario={usuario} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <PreparacaoSessao
          sessaoId={detalhe.sessao.id}
          pacienteId={detalhe.sessao.pacienteId}
          pacienteNome={pacienteNome}
          exercicio={detalhe.exercicio}
          calibracaoAceita={detalhe.sessao.calibracaoAceita}
        />
      </main>
    </div>
  )
}
