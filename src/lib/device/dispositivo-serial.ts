import { TIMEOUT_CONEXAO_MS } from '@/lib/domain/constantes'
import { comLimiteDeTempo, ErroConexao } from './tipos'
import type { Amostra, Dispositivo, ParametrosExercicio } from './tipos'

/*
 * O TypeScript instalado (lib.dom 5.9) ainda não traz os tipos de Web Serial.
 * Definimos aqui o mínimo estrutural de que precisamos, verificado em tempo de
 * execução — sem `any` e sem `as` para calar erro (a estreiteza vem do
 * operador `in` sobre `unknown`).
 */

type PortaSerial = {
  open(opcoes: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}

type EntradaSerial = {
  requestPort(opcoes?: { filters?: readonly unknown[] }): Promise<PortaSerial>
}

function ehEntradaSerial(valor: unknown): valor is EntradaSerial {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'requestPort' in valor &&
    typeof valor.requestPort === 'function'
  )
}

/** Há acesso a Web Serial neste navegador? (controla o botão "usar dispositivo real") */
export function serialDisponivel(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!('serial' in navigator)) return false
  return ehEntradaSerial(navigator.serial)
}

function obterEntradaSerial(): EntradaSerial {
  if (typeof navigator === 'undefined' || !('serial' in navigator) || !ehEntradaSerial(navigator.serial)) {
    throw new ErroConexao('Este navegador não oferece acesso a dispositivos seriais.')
  }
  return navigator.serial
}

/**
 * Dispositivo real via Web Serial. O protocolo esperado é uma linha por
 * amostra: `valor` em unidades, terminada em "\n" (ex.: "132.5\n"). O tempo
 * `t` é medido pelo navegador (performance.now) desde o início do fluxo.
 */
export class DispositivoSerial implements Dispositivo {
  readonly nome = 'Porta serial'

  private porta: PortaSerial | null = null
  private lendo = false
  private t0RealMs = 0
  private observadores = new Set<(amostra: Amostra) => void>()

  async conectar(): Promise<void> {
    if (this.porta) return
    const entrada = obterEntradaSerial()
    const porta = await comLimiteDeTempo(
      entrada.requestPort().then(async (portaEscolhida) => {
        await portaEscolhida.open({ baudRate: 115200 })
        return portaEscolhida
      }),
      `O dispositivo não confirmou a conexão em até ${TIMEOUT_CONEXAO_MS / 1000} s.`,
    )
    this.porta = porta
    this.t0RealMs = performance.now()
    this.lendo = true
    void this.lerAteOFim(porta)
  }

  async desconectar(): Promise<void> {
    this.lendo = false
    const porta = this.porta
    this.porta = null
    if (!porta) return
    // Se a porta já foi fechada pelo sistema, o erro sobe para a UI decidir
    // (não engolimos falhas em silêncio).
    await porta.close()
  }

  emAmostra(aoReceberAmostra: (amostra: Amostra) => void): () => void {
    this.observadores.add(aoReceberAmostra)
    return () => {
      this.observadores.delete(aoReceberAmostra)
    }
  }

  iniciarExercicio(_parametros: ParametrosExercicio): void {
    // O hardware real define o próprio sinal; aqui só zeramos o relógio `t`
    // para que tInicioMs das repetições comece do zero.
    this.t0RealMs = performance.now()
  }

  parar(): void {
    // Nada a fazer: o sinal real continua chegando; a UI simplesmente para
    // de interpretá-lo como exercício.
  }

  private async lerAteOFim(porta: PortaSerial): Promise<void> {
    const decodificador = new TextDecoder()
    let pendente = ''
    while (this.lendo && porta.readable) {
      const leitor = porta.readable.getReader()
      try {
        for (;;) {
          const { value, done } = await leitor.read()
          if (done) break
          pendente += decodificador.decode(value, { stream: true })
          const linhas = pendente.split('\n')
          pendente = linhas.pop() ?? ''
          for (const linha of linhas) {
            const valor = Number.parseFloat(linha.trim())
            if (Number.isFinite(valor)) {
              this.emitir({
                t: Math.round(performance.now() - this.t0RealMs),
                valor,
              })
            }
          }
        }
      } catch {
        if (this.lendo) throw new ErroConexao('A leitura do dispositivo foi interrompida.')
      } finally {
        leitor.releaseLock()
      }
    }
  }

  private emitir(amostra: Amostra): void {
    for (const observador of this.observadores) {
      observador(amostra)
    }
  }
}
