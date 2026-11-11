/**
 * Conversão das linhas do Prisma para os DTOs do contrato
 * (src/lib/domain/contratos.ts). Onde o banco guarda Date/Float e o DTO pede
 * string ISO / number, a conversão é feita aqui, de forma explícita.
 */
import type { Avaliacao, Exercicio, Paciente, Repeticao, Sessao } from '@prisma/client'
import type {
  AvaliacaoDTO,
  ExercicioDTO,
  PacienteDTO,
  RepeticaoDTO,
  SessaoDTO,
} from '@/lib/domain/contratos'

/** DateTime @db.Date volta como meia-noite UTC; recorta AAAA-MM-DD. */
function dataSimplesISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function mapearPaciente(paciente: Paciente): PacienteDTO {
  return {
    id: paciente.id,
    nome: paciente.nome,
    dataNascimento: dataSimplesISO(paciente.dataNascimento),
    lesaoDiagnostico: paciente.lesaoDiagnostico,
    telefone: paciente.telefone,
    criadoEm: paciente.criadoEm.toISOString(),
  }
}

export function mapearAvaliacao(avaliacao: Avaliacao): AvaliacaoDTO {
  return {
    id: avaliacao.id,
    pacienteId: avaliacao.pacienteId,
    tipo: avaliacao.tipo,
    dataHora: avaliacao.dataHora.toISOString(),
    alcanceFrente: avaliacao.alcanceFrente,
    alcanceTras: avaliacao.alcanceTras,
    alcanceEsquerda: avaliacao.alcanceEsquerda,
    alcanceDireita: avaliacao.alcanceDireita,
    sessaoId: avaliacao.sessaoId,
  }
}

export function mapearSessao(sessao: Sessao): SessaoDTO {
  return {
    id: sessao.id,
    pacienteId: sessao.pacienteId,
    status: sessao.status,
    inicio: sessao.inicio.toISOString(),
    fim: sessao.fim ? sessao.fim.toISOString() : null,
    totalRepeticoesValidas: sessao.totalRepeticoesValidas,
    amplitudeMaxima: sessao.amplitudeMaxima,
    calibracaoAceita: sessao.calibracaoAceita,
    ultimaSequencia: sessao.ultimaSequencia,
  }
}

/** ExercicioDTO.pacienteId vem da sessão (a tabela Exercicio só guarda sessaoId). */
export function mapearExercicio(exercicio: Exercicio, pacienteId: string): ExercicioDTO {
  return {
    id: exercicio.id,
    pacienteId,
    direcao: exercicio.direcao,
    zonaNeutraMin: exercicio.zonaNeutraMin,
    zonaNeutraMax: exercicio.zonaNeutraMax,
    limiar: exercicio.limiar,
    tempoMaxMs: exercicio.tempoMaxMs,
  }
}

export function mapearRepeticao(repeticao: Repeticao): RepeticaoDTO {
  return {
    id: repeticao.id,
    sessaoId: repeticao.sessaoId,
    ordem: repeticao.ordem,
    tInicioMs: repeticao.tInicioMs,
    duracaoMs: repeticao.duracaoMs,
    amplitude: repeticao.amplitude,
    valida: repeticao.valida,
  }
}
