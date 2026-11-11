'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { criarSessao, mensagemDeErro } from '@/lib/api-client'

/**
 * Cria a sessão (POST /api/sessoes) e leva para a preparação.
 * Se já houver sessão aberta para o paciente (409 com sessaoId), retoma a
 * sessão existente em vez de falhar.
 */
export function BotaoIniciarSessao({ pacienteId }: { pacienteId: string }) {
  const navegador = useRouter()
  const [iniciando, definirIniciando] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)

  async function aoClicar() {
    definirIniciando(true)
    definirErro(null)
    try {
      const resultado = await criarSessao(pacienteId)
      if (resultado.tipo === 'criada') {
        navegador.push(`/sessao/${resultado.sessao.sessao.id}/preparar`)
      } else {
        navegador.push(`/sessao/${resultado.sessaoId}/preparar`)
      }
    } catch (falha) {
      definirErro(mensagemDeErro(falha))
      definirIniciando(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Botao onClick={aoClicar} carregando={iniciando} tamanho="grande">
        Iniciar sessão
      </Botao>
      {erro ? (
        <span role="alert" className="max-w-xs text-right text-xs text-danger">
          {erro}
        </span>
      ) : null}
    </span>
  )
}
