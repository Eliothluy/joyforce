'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { sair, mensagemDeErro } from '@/lib/api-client'

export function BotaoSair() {
  const navegador = useRouter()
  const [saindo, definirSaindo] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)

  async function aoSair() {
    definirSaindo(true)
    definirErro(null)
    try {
      await sair()
      navegador.replace('/login')
      navegador.refresh()
    } catch (falha) {
      definirErro(mensagemDeErro(falha))
      definirSaindo(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <Botao variante="secundario" onClick={aoSair} carregando={saindo} aria-label="Sair da conta">
        Sair
      </Botao>
      {erro ? (
        <span role="alert" className="text-xs text-danger">
          {erro}
        </span>
      ) : null}
    </span>
  )
}
