'use client'

import { Botao } from '@/components/Botao'
import { IconeImprimir } from '@/components/Icones'

/** Botão discreto para imprimir ou salvar em PDF via janela nativa do navegador. */
export function BotaoImprimir({ rotulo = 'Imprimir resumo' }: { rotulo?: string }) {
  return (
    <Botao
      variante="secundario"
      className="no-print print:hidden"
      onClick={() => window.print()}
    >
      <IconeImprimir className="h-4 w-4" />
      <span>{rotulo}</span>
    </Botao>
  )
}
