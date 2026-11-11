/**
 * Seed idempotente do JoyForce (npm run db:seed → prisma db seed → tsx).
 *
 * Apaga todos os dados do JoyForce e recria as duas contas de demonstração,
 * os pacientes e as sessões mockadas do contrato (docs/CONTRATO-API.md).
 * Datas são RELATIVAS a hoje e as repetições seguem o RF-05: tInicioMs
 * crescentes, duração < 10 s nas válidas, amplitudes plausíveis (120–260).
 *
 * Consistência obrigatória garantida aqui:
 * - totalRepeticoesValidas = contagem de Repeticao.valida da sessão;
 * - amplitudeMaxima = máximo das amplitudes da sessão;
 * - a primeira sessão CONCLUIDA de cada paciente gera a Avaliacao INICIAL
 *   (com sessaoId); as seguintes geram ACOMPANHAMENTO;
 * - Ana Costa Ferreira fica SEM sessões e SEM avaliações (estado vazio).
 */
import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

const SENHA_DEMONSTRACAO = 'joyforce123'
const ROUNDS_BCRYPT = 10

/** Exercicio padrão de toda sessão (contrato API; tempoMaxMs = RF-05). */
const EXERCICIO_PADRAO = {
  direcao: 'FRENTE' as const,
  zonaNeutraMin: -30,
  zonaNeutraMax: 30,
  limiar: 120,
  tempoMaxMs: 10_000,
}

/** PRNG determinístico (mulberry32): o seed é reprodutível entre execuções. */
function criarAleatorio(semente: number): () => number {
  let estado = semente >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

/** Data relativa a hoje, sempre no mesmo horário UTC para estabilizar semanas ISO. */
function dataRelativa(diasAtras: number, horaUTC = 14, minutoUTC = 0): Date {
  const data = new Date()
  data.setUTCDate(data.getUTCDate() - diasAtras)
  data.setUTCHours(horaUTC, minutoUTC, 0, 0)
  return data
}

type LinhaRepeticao = {
  ordem: number
  tInicioMs: number
  duracaoMs: number
  amplitude: number
  valida: boolean
}

/**
 * Gera as repetições de uma sessão. Tentativas falhas (valida=false) ficam
 * espalhadas entre as válidas: metade por amplitude abaixo do limiar (120) e
 * metade por duração acima de 10 s (RF-05). tInicioMs é sempre crescente.
 */
function gerarRepeticoes(
  semente: number,
  qtdValidas: number,
  qtdFalhas: number,
  amplitudeBase: number,
): LinhaRepeticao[] {
  const aleatorio = criarAleatorio(semente)
  const total = qtdValidas + qtdFalhas
  const indicesFalha = new Set<number>()
  for (let k = 0; k < qtdFalhas; k += 1) {
    indicesFalha.add(Math.round(((k + 1) * total) / (qtdFalhas + 1)) - 1)
  }

  const linhas: LinhaRepeticao[] = []
  let tInicio = 1500
  for (let i = 0; i < total; i += 1) {
    const falha = indicesFalha.has(i)
    const falhaPorTempo = falha && aleatorio() < 0.5
    const duracaoMs = falhaPorTempo
      ? 10_100 + Math.floor(aleatorio() * 900) // estoura os 10 s (RF-05)
      : 2600 + Math.floor(aleatorio() * 1800) // 2,6 s–4,4 s: ida e volta confortável
    const amplitude = falha && !falhaPorTempo
      ? arredondar(60 + aleatorio() * 45) // não atinge o limiar 120
      : arredondar(Math.min(260, Math.max(125, amplitudeBase - 20 + aleatorio() * 40)))
    linhas.push({ ordem: i + 1, tInicioMs: tInicio, duracaoMs, amplitude, valida: !falha })
    tInicio += duracaoMs + 900 + Math.floor(aleatorio() * 1600) // pausa entre repetições
  }
  return linhas
}

type PlanoSessao = {
  id: string
  diasAtras: number
  concluida: boolean
  repeticoesValidas: number
  tentativasFalhas: number
  amplitudeBase: number
}

type PlanoPaciente = {
  id: string
  nome: string
  nascimento: string
  diagnostico: string
  telefone: string
  criadoEmDiasAtras: number
  sessoes: PlanoSessao[]
}

const PACIENTES_ANA: PlanoPaciente[] = [
  {
    id: 'pac_maria',
    nome: 'Maria das Graças Silva',
    nascimento: '1958-03-14',
    diagnostico: 'AVC isquêmico — hemiparesia à direita',
    telefone: '9133224455',
    criadoEmDiasAtras: 60,
    // 8 sessões em 6 semanas, progressão consistente 8 → 22 repetições.
    sessoes: [
      { id: 'ses_maria_01', diasAtras: 42, concluida: true, repeticoesValidas: 8, tentativasFalhas: 1, amplitudeBase: 148 },
      { id: 'ses_maria_02', diasAtras: 36, concluida: true, repeticoesValidas: 10, tentativasFalhas: 1, amplitudeBase: 158 },
      { id: 'ses_maria_03', diasAtras: 30, concluida: true, repeticoesValidas: 12, tentativasFalhas: 1, amplitudeBase: 168 },
      { id: 'ses_maria_04', diasAtras: 23, concluida: true, repeticoesValidas: 14, tentativasFalhas: 2, amplitudeBase: 180 },
      { id: 'ses_maria_05', diasAtras: 16, concluida: true, repeticoesValidas: 16, tentativasFalhas: 1, amplitudeBase: 192 },
      { id: 'ses_maria_06', diasAtras: 11, concluida: true, repeticoesValidas: 18, tentativasFalhas: 2, amplitudeBase: 205 },
      { id: 'ses_maria_07', diasAtras: 6, concluida: true, repeticoesValidas: 20, tentativasFalhas: 1, amplitudeBase: 220 },
      { id: 'ses_maria_08', diasAtras: 2, concluida: true, repeticoesValidas: 22, tentativasFalhas: 1, amplitudeBase: 235 },
    ],
  },
  {
    id: 'pac_joao',
    nome: 'João Pereira Lima',
    nascimento: '1949-07-02',
    diagnostico: 'Fratura de úmero proximal — pós-cirúrgico',
    telefone: '9133224466',
    criadoEmDiasAtras: 58,
    // 6 sessões em platô em torno de 10 repetições.
    sessoes: [
      { id: 'ses_joao_01', diasAtras: 35, concluida: true, repeticoesValidas: 10, tentativasFalhas: 1, amplitudeBase: 162 },
      { id: 'ses_joao_02', diasAtras: 28, concluida: true, repeticoesValidas: 9, tentativasFalhas: 1, amplitudeBase: 160 },
      { id: 'ses_joao_03', diasAtras: 21, concluida: true, repeticoesValidas: 11, tentativasFalhas: 2, amplitudeBase: 165 },
      { id: 'ses_joao_04', diasAtras: 14, concluida: true, repeticoesValidas: 10, tentativasFalhas: 1, amplitudeBase: 163 },
      { id: 'ses_joao_05', diasAtras: 9, concluida: true, repeticoesValidas: 10, tentativasFalhas: 2, amplitudeBase: 164 },
      { id: 'ses_joao_06', diasAtras: 3, concluida: true, repeticoesValidas: 10, tentativasFalhas: 1, amplitudeBase: 166 },
    ],
  },
  {
    id: 'pac_ana_costa',
    nome: 'Ana Costa Ferreira',
    nascimento: '1981-11-23',
    diagnostico: 'Lesão de plexo braquial',
    telefone: '9133224477',
    criadoEmDiasAtras: 55,
    // Estado vazio: sem sessões e sem avaliações (primeira avaliação pela frente).
    sessoes: [],
  },
  {
    id: 'pac_carlos',
    nome: 'Carlos Mendes Rocha',
    nascimento: '1954-01-09',
    diagnostico: 'Artroplastia de ombro',
    telefone: '9133224488',
    criadoEmDiasAtras: 52,
    // 4 sessões, uma ABORTADA (não gera avaliação nem entra no resumo).
    sessoes: [
      { id: 'ses_carlos_01', diasAtras: 30, concluida: true, repeticoesValidas: 6, tentativasFalhas: 1, amplitudeBase: 170 },
      { id: 'ses_carlos_02', diasAtras: 24, concluida: false, repeticoesValidas: 2, tentativasFalhas: 1, amplitudeBase: 160 },
      { id: 'ses_carlos_03', diasAtras: 15, concluida: true, repeticoesValidas: 8, tentativasFalhas: 1, amplitudeBase: 185 },
      { id: 'ses_carlos_04', diasAtras: 5, concluida: true, repeticoesValidas: 9, tentativasFalhas: 2, amplitudeBase: 195 },
    ],
  },
  {
    id: 'pac_rita',
    nome: 'Rita Nascimento Alves',
    nascimento: '1967-05-30',
    diagnostico: 'Tendinite crônica de manguito rotador',
    telefone: '9133224499',
    criadoEmDiasAtras: 50,
    sessoes: [
      { id: 'ses_rita_01', diasAtras: 21, concluida: true, repeticoesValidas: 6, tentativasFalhas: 1, amplitudeBase: 150 },
      { id: 'ses_rita_02', diasAtras: 12, concluida: true, repeticoesValidas: 7, tentativasFalhas: 1, amplitudeBase: 165 },
      { id: 'ses_rita_03', diasAtras: 4, concluida: true, repeticoesValidas: 9, tentativasFalhas: 1, amplitudeBase: 180 },
    ],
  },
]

const PACIENTES_BRUNO: PlanoPaciente[] = [
  {
    id: 'pac_paulo',
    nome: 'Paulo Henrique Souza',
    nascimento: '1970-02-18',
    diagnostico: 'Lesão por esforço repetitivo',
    telefone: '9133224400',
    criadoEmDiasAtras: 40,
    // Prova de isolamento entre contas: só Bruno enxerga este paciente.
    sessoes: [
      { id: 'ses_paulo_01', diasAtras: 14, concluida: true, repeticoesValidas: 5, tentativasFalhas: 1, amplitudeBase: 175 },
      { id: 'ses_paulo_02', diasAtras: 4, concluida: true, repeticoesValidas: 7, tentativasFalhas: 1, amplitudeBase: 190 },
    ],
  },
]

/** Semente estável por id de sessão (mesmas repetições em toda execução do seed). */
function sementeDoId(id: string): number {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma = (soma * 31 + id.charCodeAt(i)) >>> 0
  return soma
}

async function criarPacienteComSessoes(usuarioId: string, plano: PlanoPaciente): Promise<void> {
  await prisma.paciente.create({
    data: {
      id: plano.id,
      nome: plano.nome,
      dataNascimento: new Date(`${plano.nascimento}T00:00:00Z`),
      lesaoDiagnostico: plano.diagnostico,
      telefone: plano.telefone,
      criadoPorId: usuarioId,
      criadoEm: dataRelativa(plano.criadoEmDiasAtras, 12),
    },
  })

  let concluidasAnteriores = 0
  for (const sessaoPlano of plano.sessoes) {
    const inicio = dataRelativa(sessaoPlano.diasAtras)
    const fim = new Date(inicio.getTime() + 40 * 60 * 1000) // sessão de ~40 min
    const repeticoes = gerarRepeticoes(
      sementeDoId(sessaoPlano.id),
      sessaoPlano.repeticoesValidas,
      sessaoPlano.tentativasFalhas,
      sessaoPlano.amplitudeBase,
    )
    const totalRepeticoesValidas = repeticoes.filter((r) => r.valida).length
    const amplitudeMaxima = Math.max(...repeticoes.map((r) => r.amplitude))

    await prisma.sessao.create({
      data: {
        id: sessaoPlano.id,
        pacienteId: plano.id,
        status: sessaoPlano.concluida ? 'CONCLUIDA' : 'ABORTADA',
        inicio,
        fim,
        calibracaoAceita: true,
        totalRepeticoesValidas,
        amplitudeMaxima,
        ultimaSequencia: 1,
        exercicio: { create: { id: `exe_${sessaoPlano.id}`, ...EXERCICIO_PADRAO } },
        repeticoes: {
          create: repeticoes.map((r) => ({ id: `${sessaoPlano.id}_rep_${r.ordem}`, ...r })),
        },
      },
    })

    // A primeira sessão concluída gera a avaliação INICIAL; as demais, ACOMPANHAMENTO.
    // Sessões ABORTADAS não geram avaliação.
    if (sessaoPlano.concluida) {
      const alcances = Math.round(amplitudeMaxima)
      await prisma.avaliacao.create({
        data: {
          id: `avl_${sessaoPlano.id}`,
          pacienteId: plano.id,
          tipo: concluidasAnteriores === 0 ? 'INICIAL' : 'ACOMPANHAMENTO',
          dataHora: fim,
          alcanceFrente: alcances,
          alcanceTras: alcances,
          alcanceEsquerda: alcances,
          alcanceDireita: alcances,
          sessaoId: sessaoPlano.id,
        },
      })
      concluidasAnteriores += 1
    }
  }
}

async function main(): Promise<void> {
  // Idempotência: apaga tudo do JoyForce (ordem que respeita as FKs) e recria.
  await prisma.repeticao.deleteMany()
  await prisma.exercicio.deleteMany()
  await prisma.avaliacao.deleteMany()
  await prisma.sessao.deleteMany()
  await prisma.paciente.deleteMany()
  await prisma.sessaoAcesso.deleteMany()
  await prisma.usuario.deleteMany()

  // Hash calculado uma vez e reutilizado nas duas contas (seed rápido).
  const senhaHash = hashSync(SENHA_DEMONSTRACAO, ROUNDS_BCRYPT)
  const ana = await prisma.usuario.create({
    data: { id: 'usr_ana', nome: 'Dra. Ana Ribeiro', email: 'ana.ribeiro@joyforce.app', senhaHash },
  })
  const bruno = await prisma.usuario.create({
    data: { id: 'usr_bruno', nome: 'Dr. Bruno Souza', email: 'bruno.souza@joyforce.app', senhaHash },
  })

  for (const plano of PACIENTES_ANA) await criarPacienteComSessoes(ana.id, plano)
  for (const plano of PACIENTES_BRUNO) await criarPacienteComSessoes(bruno.id, plano)

  const [usuarios, pacientes, sessoes, repeticoes, avaliacoes] = await Promise.all([
    prisma.usuario.count(),
    prisma.paciente.count(),
    prisma.sessao.count(),
    prisma.repeticao.count(),
    prisma.avaliacao.count(),
  ])
  console.log(
    `Seed concluído: ${usuarios} usuários, ${pacientes} pacientes, ${sessoes} sessões, ${repeticoes} repetições, ${avaliacoes} avaliações.`,
  )
}

main()
  .catch((erro) => {
    console.error('Falha no seed:', erro)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
