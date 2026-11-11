import { INTERVALO_AMOSTRA_MS } from '@/lib/domain/constantes'
import { comLimiteDeTempo } from './tipos'
import type { Amostra, Dispositivo, ParametrosExercicio } from './tipos'

function aleatorioEntre(minimo: number, maximo: number): number {
  return minimo + Math.random() * (maximo - minimo)
}

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10
}

/**
 * Dispositivo de demonstração: funciona sem hardware nenhum.
 *
 * - Repouso: ruído leve em torno de 0 (variação bem abaixo de 50 → a
 *   calibração do RF-03 é aceita com o aparelho parado).
 * - Exercício: movimentos com amplitude entre 120 e 260 unidades; a cada ~8
 *   movimentos um vem "fraco" (abaixo do limiar), para gerar repetições
 *   inválidas de vez em quando e a UI poder mostrar o que não vale.
 * - Amostragem nominal de 50 Hz (INTERVALO_AMOSTRA_MS), com timer
 *   auto-compensado para não acumular desvio.
 */
export class FakeDevice implements Dispositivo {
  readonly nome = 'Demonstração'

  private conectado = false
  private fase: 'repouso' | 'exercicio' = 'repouso'
  private tMs = 0
  private indiceAmostra = 0
  private inicioRealMs = 0
  private temporizador: ReturnType<typeof setTimeout> | null = null
  private parametros: ParametrosExercicio | null = null

  private movimento: { inicioMs: number; duracaoMs: number; alvo: number } | null = null
  private proximoMovimentoMs = 0
  private contadorMovimentos = 0

  private observadores = new Set<(amostra: Amostra) => void>()

  async conectar(): Promise<void> {
    if (this.conectado) return
    // Resolve em 300–800 ms: sempre dentro do prazo do RF-02 (3 s).
    const atrasoMs = aleatorioEntre(300, 800)
    await comLimiteDeTempo(
      new Promise<void>((resolver) => setTimeout(resolver, atrasoMs)),
      'O dispositivo de demonstração não respondeu a tempo.',
    )
    this.conectado = true
    this.iniciarFluxo()
  }

  async desconectar(): Promise<void> {
    this.conectado = false
    this.pararTemporizador()
    this.fase = 'repouso'
    this.movimento = null
  }

  emAmostra(aoReceberAmostra: (amostra: Amostra) => void): () => void {
    this.observadores.add(aoReceberAmostra)
    return () => {
      this.observadores.delete(aoReceberAmostra)
    }
  }

  iniciarExercicio(parametros: ParametrosExercicio): void {
    this.parametros = parametros
    this.fase = 'exercicio'
    this.zerarRelogio()
    this.movimento = null
    this.contadorMovimentos = 0
    this.proximoMovimentoMs = 400
  }

  parar(): void {
    this.fase = 'repouso'
    this.movimento = null
    this.parametros = null
  }

  /* --------------------------------------------------------------- internos */

  private iniciarFluxo(): void {
    this.pararTemporizador()
    this.zerarRelogio()
    this.agendarProxima()
  }

  private zerarRelogio(): void {
    this.tMs = 0
    this.indiceAmostra = 0
    this.inicioRealMs = performance.now()
  }

  private pararTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador)
      this.temporizador = null
    }
  }

  /** Agenda a próxima amostra compensando o desvio do setTimeout. */
  private agendarProxima(): void {
    const alvoReal = this.inicioRealMs + (this.indiceAmostra + 1) * INTERVALO_AMOSTRA_MS
    const atraso = Math.max(0, alvoReal - performance.now())
    this.temporizador = setTimeout(() => {
      this.tMs += INTERVALO_AMOSTRA_MS
      this.indiceAmostra += 1
      this.emitir({ t: this.tMs, valor: this.gerarValor() })
      if (this.conectado) this.agendarProxima()
    }, atraso)
  }

  private gerarValor(): number {
    if (this.fase === 'exercicio') return arredondar(this.gerarValorExercicio())
    // Repouso: ruído leve + oscilação mínima, longe do limiar de calibração (50).
    return arredondar(2.5 * Math.sin(this.tMs / 420) + aleatorioEntre(-3, 3))
  }

  private gerarValorExercicio(): number {
    const agora = this.tMs
    if (this.movimento !== null) {
      const progresso = (agora - this.movimento.inicioMs) / this.movimento.duracaoMs
      if (progresso >= 1) {
        this.movimento = null
        this.proximoMovimentoMs = agora + aleatorioEntre(500, 1100)
        return aleatorioEntre(-2, 2)
      }
      return this.movimento.alvo * Math.sin(Math.PI * progresso) + aleatorioEntre(-2, 2)
    }

    if (agora >= this.proximoMovimentoMs) {
      this.contadorMovimentos += 1
      // 1 em ~8 movimentos fica abaixo do limiar → repetição inválida.
      const fraco = this.contadorMovimentos % 8 === 0
      const limiteFraco = this.parametros ? Math.max(55, this.parametros.limiar - 10) : 110
      const alvo = fraco ? aleatorioEntre(50, limiteFraco) : aleatorioEntre(120, 260)
      const duracaoMs = aleatorioEntre(1500, 2600)
      this.movimento = { inicioMs: agora, duracaoMs, alvo }
      return aleatorioEntre(-2, 2)
    }

    return aleatorioEntre(-3, 3)
  }

  private emitir(amostra: Amostra): void {
    for (const observador of this.observadores) {
      observador(amostra)
    }
  }
}
