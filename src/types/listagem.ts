/**
 * Tipos auxiliares de servidor (backend → frontend).
 *
 * `PacienteListagemDTO` é um SUPERCONJUNTO de `PacienteDTO`: mantém todos os
 * campos do contrato e adiciona o que a listagem de pacientes
 * (`/fisio/pacientes`) precisa para as colunas "última sessão", "repetições"
 * e "tendência". Usado por `listarPacientes()` em src/lib/server/consultas.ts
 * (Server Components) e devolvido também por GET /api/pacientes.
 */
import type { PacienteDTO, StatusSessao } from '@/lib/domain/contratos'

/** Recorte da última sessão concluída exibido na listagem. */
export type SessaoResumoListagemDTO = {
  id: string
  status: StatusSessao
  /** ISO 8601 */
  inicio: string
  totalRepeticoesValidas: number
  amplitudeMaxima: number
}

export type PacienteListagemDTO = PacienteDTO & {
  /** Última sessão CONCLUIDA do paciente; null quando nunca concluiu uma. */
  ultimaSessao: SessaoResumoListagemDTO | null
  /**
   * Tendência: repetições válidas da última sessão concluída menos a média
   * das 3 anteriores (mesma regra de ResumoPacienteDTO.variacaoRepeticoes).
   * null quando não há base (menos de 3 anteriores + a última).
   */
  variacaoRepeticoes: number | null
}
