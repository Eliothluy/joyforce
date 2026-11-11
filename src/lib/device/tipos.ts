/**
 * Camada de dispositivo: contratos comuns entre o FakeDevice (demo sem
 * hardware) e o DispositivoSerial (Web Serial, quando o navegador oferece).
 * A UI só conhece esta interface — trocar a fonte do sinal não muda nada nela.
 */
import { TIMEOUT_CONEXAO_MS } from '@/lib/domain/constantes'

/** Uma leitura do sensor: `t` em ms desde o início do fluxo, `valor` em unidades. */
export type Amostra = {
  t: number
  valor: number
}

/** Parâmetros do exercício (vieram do ExercicioDTO criado pelo servidor). */
export type ParametrosExercicio = {
  zonaNeutraMin: number
  zonaNeutraMax: number
  limiar: number
  tempoMaxMs: number
}

/** Qualquer fonte de sinal cumpre esta interface. */
export interface Dispositivo {
  /** Nome curto para exibir na UI ("Demonstração", "Porta serial"). */
  readonly nome: string
  /**
   * Conecta ao dispositivo. Deve resolver em até TIMEOUT_CONEXAO_MS;
   * estourou, rejeita com ErroConexao (RF-02: estado "Desconectado").
   */
  conectar(): Promise<void>
  desconectar(): Promise<void>
  /** Registra um observador de amostras; devolve a função de cancelamento. */
  emAmostra(aoReceberAmostra: (amostra: Amostra) => void): () => void
  /** Começa a produzir movimentos de exercício (zera o relógio `t`). */
  iniciarExercicio(parametros: ParametrosExercicio): void
  /** Encerra movimentos e volta ao sinal de repouso. */
  parar(): void
}

/** Erro dedicado de conexão: a UI o distingue de outros falhes. */
export class ErroConexao extends Error {}

/**
 * Garante que `conectar()` responda em até TIMEOUT_CONEXAO_MS (RF-02).
 * Usada pelos dois dispositivos; estourou o prazo, rejeita com ErroConexao.
 */
export async function comLimiteDeTempo<T>(promessa: Promise<T>, mensagem: string): Promise<T> {
  let cronometro: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promessa,
      new Promise<never>((_, rejeitar) => {
        cronometro = setTimeout(() => rejeitar(new ErroConexao(mensagem)), TIMEOUT_CONEXAO_MS)
      }),
    ])
  } finally {
    if (cronometro !== undefined) clearTimeout(cronometro)
  }
}
