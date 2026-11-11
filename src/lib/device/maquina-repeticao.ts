import type { Amostra, ParametrosExercicio } from './tipos'

/** Estados do ciclo de repetição (RF-05). */
export type EstadoCiclo = 'DENTRO_ZONA' | 'FORA_ZONA' | 'LIMIAR_ATINGIDO'

/** Um ciclo fechado: vale (valida=true) ou não vale (valida=false). */
export type RepeticaoDetectada = {
  tInicioMs: number
  duracaoMs: number
  amplitude: number
  valida: boolean
}

/**
 * Máquina de estados de repetição — pura e testável por leitura.
 *
 * Regra do ERS (RF-05): a repetição é contada quando o movimento sai da zona
 * neutra, atinge o limiar e volta à zona neutra em até TEMPO_MAX_REPETICAO_MS
 * (inclusive). Falhou o limiar ou estourou o tempo, o ciclo fecha como
 * inválido (é gravado com `valida: false`, mas não entra na contagem).
 *
 * Diagrama:
 *
 *   DENTRO_ZONA ──sai da zona──▶ FORA_ZONA ──|valor| ≥ limiar──▶ LIMIAR_ATINGIDO
 *       ▲                            │                              │
 *       └────────── volta à zona ────┴──────────────────────────────┘
 *                   (ciclo fecha: válida se atingiu o limiar e
 *                    duracao ≤ tempoMaxMs; inválida caso contrário)
 */
export function criarMaquinaRepeticao(parametros: ParametrosExercicio) {
  let estado: EstadoCiclo = 'DENTRO_ZONA'
  let tSaidaMs = 0
  let amplitudeMaxima = 0

  function saiuDaZona(valor: number): boolean {
    return valor < parametros.zonaNeutraMin || valor > parametros.zonaNeutraMax
  }

  return {
    /** Estado corrente do ciclo. */
    get estado(): EstadoCiclo {
      return estado
    },
    /** Instante (no relógio do dispositivo) em que o ciclo corrente começou. */
    get tSaidaMs(): number {
      return tSaidaMs
    },
    /** Amplitude máxima observada no ciclo corrente (0 se dentro da zona). */
    get amplitudeCiclo(): number {
      return amplitudeMaxima
    },
    /** Milissegundos decorridos no ciclo corrente (0 se dentro da zona). */
    tempoCorrente(tAtualMs: number): number {
      if (estado === 'DENTRO_ZONA') return 0
      return Math.max(0, tAtualMs - tSaidaMs)
    },
    /** O ciclo corrente já passou do tempo máximo? (aviso visual de "não vale") */
    estourouTempo(tAtualMs: number): boolean {
      return estado !== 'DENTRO_ZONA' && tAtualMs - tSaidaMs > parametros.tempoMaxMs
    },
    /** Zera a máquina (novo exercício ou retomada). */
    reiniciar(): void {
      estado = 'DENTRO_ZONA'
      tSaidaMs = 0
      amplitudeMaxima = 0
    },
    /**
     * Consome uma amostra. Devolve a repetição detectada quando o ciclo fecha
     * (válida ou inválida); devolve null enquanto o ciclo está em curso.
     */
    processar(amostra: Amostra): RepeticaoDetectada | null {
      const fora = saiuDaZona(amostra.valor)

      if (estado === 'DENTRO_ZONA') {
        if (fora) {
          estado = 'FORA_ZONA'
          tSaidaMs = amostra.t
          amplitudeMaxima = Math.abs(amostra.valor)
        }
        return null
      }

      amplitudeMaxima = Math.max(amplitudeMaxima, Math.abs(amostra.valor))

      if (!fora) {
        // Voltou à zona neutra: fecha o ciclo.
        const atingiuLimiar = estado === 'LIMIAR_ATINGIDO'
        const duracaoMs = Math.max(0, Math.round(amostra.t - tSaidaMs))
        estado = 'DENTRO_ZONA'
        const amplitude = Math.round(amplitudeMaxima * 10) / 10
        amplitudeMaxima = 0
        return {
          tInicioMs: Math.max(0, Math.round(tSaidaMs)),
          duracaoMs,
          amplitude,
          valida: atingiuLimiar && duracaoMs <= parametros.tempoMaxMs,
        }
      }

      if (Math.abs(amostra.valor) >= parametros.limiar) {
        estado = 'LIMIAR_ATINGIDO'
      }
      return null
    },
  }
}

export type MaquinaRepeticao = ReturnType<typeof criarMaquinaRepeticao>
