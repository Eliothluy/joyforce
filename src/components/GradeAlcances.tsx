import type { AvaliacaoDTO, Direcao } from '@/lib/domain/contratos'
import { formatarMedida, rotuloDirecao } from '@/lib/domain/constantes'

const DIRECOES: readonly Direcao[] = ['FRENTE', 'TRAS', 'ESQUERDA', 'DIREITA']

/** Alcance registrado de uma avaliação para uma direção (RF-04). */
export function alcancePorDirecao(avaliacao: AvaliacaoDTO, direcao: Direcao): number {
  switch (direcao) {
    case 'FRENTE':
      return avaliacao.alcanceFrente
    case 'TRAS':
      return avaliacao.alcanceTras
    case 'ESQUERDA':
      return avaliacao.alcanceEsquerda
    case 'DIREITA':
      return avaliacao.alcanceDireita
  }
}

/**
 * As quatro medidas de alcance de uma avaliação (frente, trás, esquerda,
 * direita), usadas na linha de base da ficha e no registro da avaliação
 * gerada no resultado da sessão. Quando recebe `referencia` diferente,
 * exibe o delta por direção.
 */
export function GradeAlcances({
  avaliacao,
  referencia = null,
}: {
  avaliacao: AvaliacaoDTO
  referencia?: AvaliacaoDTO | null
}) {
  const temComparacao = referencia !== null && referencia.id !== avaliacao.id

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DIRECOES.map((direcao) => {
        const valor = alcancePorDirecao(avaliacao, direcao)
        const ref = temComparacao && referencia ? alcancePorDirecao(referencia, direcao) : null
        const delta = ref !== null ? valor - ref : null

        return (
          <div key={direcao} className="rounded-lg border border-line px-3 py-2.5">
            <dt className="etiqueta">{rotuloDirecao[direcao]}</dt>
            <dd className="numero mt-1 text-lg font-semibold">
              {formatarMedida(valor)}
              <span className="ml-1 text-xs font-normal text-muted">unid.</span>
            </dd>
            {delta !== null ? (
              <dd
                className={`numero mt-0.5 text-xs font-semibold ${
                  delta > 0 ? 'text-brand-strong' : delta < 0 ? 'text-signal' : 'text-muted'
                }`}
              >
                {delta > 0 ? `+${formatarMedida(delta)}` : delta < 0 ? `−${formatarMedida(Math.abs(delta))}` : '0'}{' '}
                vs. inicial
              </dd>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}
