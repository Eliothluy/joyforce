/**
 * Utilitários puros de formatação e escala visual para a interface.
 * Mantém `src/lib/domain/constantes.ts` intocado (fonte de verdade do ERS).
 */

const FUSO_BR = 'America/Sao_Paulo'

const PREPOSICOES_NOME = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/** Formata telefone de 10 dígitos (HU-01) como (DDD) XXXX-XXXX. */
export function formatarTelefone(digitos: string): string {
  const limpo = digitos.replace(/\D/g, '')
  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`
  }
  return digitos
}

/** Duas iniciais (primeiro e último nome relevante, ignorando preposições e títulos). */
export function iniciaisNome(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => {
      const baixa = parte.toLowerCase()
      return parte.length > 0 && !PREPOSICOES_NOME.has(baixa) && !baixa.endsWith('.')
    })
  const primeira = partes[0]
  if (!primeira) return '?'
  if (partes.length === 1) return primeira.slice(0, 2).toUpperCase()
  const ultima = partes[partes.length - 1]
  return `${primeira[0] ?? ''}${ultima?.[0] ?? ''}`.toUpperCase()
}

/** Duração entre início e fim em texto legível ("40 min" ou "< 1 min"). */
export function formatarDuracaoMinutos(inicioIso: string, fimIso: string | null): string | null {
  if (!fimIso) return null
  const inicioMs = new Date(inicioIso).getTime()
  const fimMs = new Date(fimIso).getTime()
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs < inicioMs) return null
  const minutos = Math.round((fimMs - inicioMs) / 60_000)
  if (minutos < 1) return '< 1 min'
  return `${minutos} min`
}

/** Formata data curta `dd/mm` no fuso de Brasília. */
export function formatarDiaMes(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: FUSO_BR,
  }).format(new Date(iso))
}

/** Formata dia + mês abreviado em UTC (para rótulos de início de semana ISO). */
export function formatarDiaMesCurto(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(iso))
    .replace('.', '')
}

/**
 * Calcula um teto "limpo" divisível por 4 e retorna 5 marcas redondas
 * [0, 0.25*teto, 0.5*teto, 0.75*teto, teto] evitando rótulos quebrados.
 */
export function calcularTetoGrafico(
  valorMaximo: number,
  minimo: number,
): { teto: number; passos: number[] } {
  const bruto = Math.max(valorMaximo, minimo) * 1.15
  let passo: number
  if (bruto <= 20) passo = 5
  else if (bruto <= 40) passo = 10
  else if (bruto <= 100) passo = 25
  else if (bruto <= 200) passo = 50
  else passo = 100

  const unidadeTeto = passo * 4
  const teto = Math.max(unidadeTeto, Math.ceil(bruto / unidadeTeto) * unidadeTeto)
  return {
    teto,
    passos: [0, teto * 0.25, teto * 0.5, teto * 0.75, teto],
  }
}

/** Texto relativo em dias pré-computado sem depender de Date.now() no cliente. */
export function formatarTempoRelativoDias(dias: number | null): string {
  if (dias === null) return 'sem sessões'
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}
