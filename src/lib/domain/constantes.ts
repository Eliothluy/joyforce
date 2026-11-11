/**
 * Números do ERS (P2, v0.1) em um só lugar.
 * Alterar qualquer valor aqui exige atualizar o documento de requisitos.
 */
import type { Direcao, TipoAvaliacao } from './contratos'

/** RNF-02 — taxa nominal de amostragem do dispositivo. */
export const TAXA_AMOSTRAGEM_HZ = 50
/** RNF-02 — intervalo entre amostras (20 ms). */
export const INTERVALO_AMOSTRA_MS = 1000 / TAXA_AMOSTRAGEM_HZ
/** RF-02 / HU-02 CA3 — confirmação de conexão em até 3 s. */
export const TIMEOUT_CONEXAO_MS = 3_000
/** RF-03 — janela de repouso para calibrar. */
export const JANELA_CALIBRACAO_MS = 3_000
/** RF-03 — variação máxima aceita na calibração (inclusive). */
export const LIMIAR_CALIBRACAO_UNIDADES = 50
/** RF-05 — ida e volta completas em até 10 s (inclusive). */
export const TEMPO_MAX_REPETICAO_MS = 10_000
/** RNF-01 — p95 entre amostra e atualização visual. */
export const META_P95_MS = 100
/** RNF-03 — perda máxima de amostras em sessão contínua. */
export const PERDA_MAXIMA_SESSAO = 0.02
/** RNF-03 — duração da sessão de referência. */
export const DURACAO_SESSAO_REFERENCIA_MS = 10 * 60 * 1000
/** HU-01 CA3 — telefone com exatamente 10 dígitos. */
export const TELEFONE_DIGITOS = 10

export const rotuloDirecao: Record<Direcao, string> = {
  FRENTE: 'Frente',
  TRAS: 'Trás',
  ESQUERDA: 'Esquerda',
  DIREITA: 'Direita',
}

export const rotuloTipoAvaliacao: Record<TipoAvaliacao, string> = {
  INICIAL: 'Avaliação inicial',
  ACOMPANHAMENTO: 'Avaliação de acompanhamento',
}

/** Precisão usada na UI para não exibir 12.3333333. */
export function formatarMedida(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor)
}

export function formatarData(iso: string): string {
  // Datas "só dia" (AAAA-MM-DD) são interpretadas em UTC para não deslocar o dia
  // entre servidor e navegador.
  const data = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(data)
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))
}

export function idadeEmAnos(dataNascimento: string, referencia = new Date()): number {
  const nascimento = new Date(`${dataNascimento}T00:00:00`)
  let idade = referencia.getFullYear() - nascimento.getFullYear()
  const mes = referencia.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) idade -= 1
  return idade
}
