'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Botao } from '@/components/Botao'
import { Card } from '@/components/Card'
import { GraficoSinal } from '@/components/GraficoSinal'
import { formatarMedida, rotuloDirecao } from '@/lib/domain/constantes'
import {
  JANELA_CALIBRACAO_MS,
  LIMIAR_CALIBRACAO_UNIDADES,
  TIMEOUT_CONEXAO_MS,
} from '@/lib/domain/constantes'
import { calibrar, mensagemDeErro } from '@/lib/api-client'
import { FakeDevice } from '@/lib/device/fake-device'
import { DispositivoSerial, serialDisponivel } from '@/lib/device/dispositivo-serial'
import { criarBarramento } from '@/lib/device/barramento'
import type { Amostra, Dispositivo } from '@/lib/device/tipos'
import type { ExercicioDTO } from '@/lib/domain/contratos'

type EstadoConexao = 'desconectado' | 'conectando' | 'conectado' | 'falhou'
type FaseCalibracao = 'aguardando' | 'coletando' | 'verificando' | 'aceita' | 'rejeitada'

function Chip({ tom, children }: { tom: 'ok' | 'ativo' | 'parado' | 'erro'; children: string }) {
  const classes = {
    ok: 'bg-brand-soft text-brand-strong',
    ativo: 'bg-warn-soft text-warn',
    parado: 'bg-paper text-muted border border-line',
    erro: 'bg-danger-soft text-danger',
  }[tom]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  )
}

type PropriedadesPreparacao = {
  sessaoId: string
  pacienteId: string
  exercicio: ExercicioDTO
  /** Sessão retomada já com calibração aceita (RF-03 cumprido antes). */
  calibracaoAceita: boolean
}

export function PreparacaoSessao({ sessaoId, pacienteId, exercicio, calibracaoAceita }: PropriedadesPreparacao) {
  const navegador = useRouter()

  const barramentoRef = useRef<ReturnType<typeof criarBarramento> | null>(null)
  if (barramentoRef.current === null) barramentoRef.current = criarBarramento()

  const dispositivoRef = useRef<Dispositivo | null>(null)
  const cancelarRepassoRef = useRef<(() => void) | null>(null)

  const [tipoDispositivo, definirTipoDispositivo] = useState<'demo' | 'serial'>('demo')
  const [estadoConexao, definirEstadoConexao] = useState<EstadoConexao>('desconectado')
  const [contagemConexao, definirContagemConexao] = useState(0)
  const [erroConexao, definirErroConexao] = useState<string | null>(null)

  const [faseCalibracao, definirFaseCalibracao] = useState<FaseCalibracao>(
    calibracaoAceita ? 'aceita' : 'aguardando',
  )
  const [progressoCalibracao, definirProgressoCalibracao] = useState(0)
  const [variacaoAoVivo, definirVariacaoAoVivo] = useState<number | null>(null)
  const [variacaoMedida, definirVariacaoMedida] = useState<number | null>(null)

  const dadosCalibracaoRef = useRef({ minimo: Infinity, maximo: -Infinity, soma: 0, contador: 0 })
  const cancelarCalibracaoRef = useRef<(() => void) | null>(null)
  const cronCalibracaoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cronConexaoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const limparCrons = useCallback(() => {
    if (cronCalibracaoRef.current !== null) {
      clearInterval(cronCalibracaoRef.current)
      cronCalibracaoRef.current = null
    }
    if (cronConexaoRef.current !== null) {
      clearInterval(cronConexaoRef.current)
      cronConexaoRef.current = null
    }
    if (cancelarCalibracaoRef.current !== null) {
      cancelarCalibracaoRef.current()
      cancelarCalibracaoRef.current = null
    }
  }, [])

  const trocarDispositivo = useCallback(
    (tipo: 'demo' | 'serial') => {
      limparCrons()
      if (cancelarRepassoRef.current !== null) {
        cancelarRepassoRef.current()
        cancelarRepassoRef.current = null
      }
      const anterior = dispositivoRef.current
      if (anterior) void anterior.desconectar()

      const barramento = barramentoRef.current
      if (!barramento) return
      const novo: Dispositivo = tipo === 'demo' ? new FakeDevice() : new DispositivoSerial()
      dispositivoRef.current = novo
      cancelarRepassoRef.current = novo.emAmostra((amostra) => barramento.emitir(amostra))
      definirTipoDispositivo(tipo)
      definirEstadoConexao('desconectado')
      definirErroConexao(null)
      definirContagemConexao(0)
      if (!calibracaoAceita) {
        definirFaseCalibracao('aguardando')
        definirVariacaoAoVivo(null)
        definirVariacaoMedida(null)
      }
    },
    [calibracaoAceita, limparCrons],
  )

  useEffect(() => {
    trocarDispositivo('demo')
    return () => {
      limparCrons()
      if (cancelarRepassoRef.current !== null) {
        cancelarRepassoRef.current()
        cancelarRepassoRef.current = null
      }
      const dispositivo = dispositivoRef.current
      dispositivoRef.current = null
      if (dispositivo) void dispositivo.desconectar()
    }
  }, [trocarDispositivo, limparCrons])

  const inscreverNoSinal = useCallback((aoReceber: (amostra: Amostra) => void) => {
    const barramento = barramentoRef.current
    if (!barramento) return () => undefined
    return barramento.inscrever(aoReceber)
  }, [])

  /* ------------------------------------------------------------ conexão */

  async function conectar() {
    const dispositivo = dispositivoRef.current
    if (!dispositivo || estadoConexao === 'conectando') return
    definirEstadoConexao('conectando')
    definirErroConexao(null)
    const inicio = performance.now()
    cronConexaoRef.current = setInterval(() => {
      definirContagemConexao(performance.now() - inicio)
    }, 100)
    try {
      await dispositivo.conectar()
      definirEstadoConexao('conectado')
    } catch (falha) {
      definirEstadoConexao('falhou')
      definirErroConexao(mensagemDeErro(falha))
    } finally {
      if (cronConexaoRef.current !== null) {
        clearInterval(cronConexaoRef.current)
        cronConexaoRef.current = null
      }
    }
  }

  /* ---------------------------------------------------------- calibração */

  function iniciarCalibracao() {
    const barramento = barramentoRef.current
    if (!barramento || faseCalibracao === 'coletando' || faseCalibracao === 'verificando') return
    dadosCalibracaoRef.current = { minimo: Infinity, maximo: -Infinity, soma: 0, contador: 0 }
    definirFaseCalibracao('coletando')
    definirProgressoCalibracao(0)
    definirVariacaoAoVivo(null)
    definirVariacaoMedida(null)

    cancelarCalibracaoRef.current = barramento.inscrever((amostra) => {
      const dados = dadosCalibracaoRef.current
      dados.minimo = Math.min(dados.minimo, amostra.valor)
      dados.maximo = Math.max(dados.maximo, amostra.valor)
      dados.soma += amostra.valor
      dados.contador += 1
    })

    const inicio = performance.now()
    cronCalibracaoRef.current = setInterval(() => {
      const decorrido = performance.now() - inicio
      definirProgressoCalibracao(decorrido)
      const dados = dadosCalibracaoRef.current
      if (dados.contador > 0 && Number.isFinite(dados.minimo)) {
        definirVariacaoAoVivo(dados.maximo - dados.minimo)
      }
      if (decorrido >= JANELA_CALIBRACAO_MS) {
        limparCrons()
        void concluirCalibracao(decorrido)
      }
    }, 100)
  }

  async function concluirCalibracao(decorridoMs: number) {
    const dados = dadosCalibracaoRef.current
    const minimo = Number.isFinite(dados.minimo) ? dados.minimo : 0
    const maximo = Number.isFinite(dados.maximo) ? dados.maximo : 0
    const variacaoMax = Math.max(0, maximo - minimo)
    const referencia = dados.contador > 0 ? dados.soma / dados.contador : 0
    definirFaseCalibracao('verificando')
    definirVariacaoMedida(variacaoMax)
    try {
      const resultado = await calibrar(sessaoId, {
        referencia: Math.round(referencia * 10) / 10,
        variacaoMax: Math.round(variacaoMax * 10) / 10,
        duracaoMs: Math.round(decorridoMs),
      })
      definirFaseCalibracao(resultado.aceita ? 'aceita' : 'rejeitada')
    } catch (falha) {
      definirFaseCalibracao('rejeitada')
      definirVariacaoMedida(null)
      definirErroConexao(mensagemDeErro(falha))
    }
  }

  /* ------------------------------------------------------------- derivação */

  const conectado = estadoConexao === 'conectado'
  const calibrada = faseCalibracao === 'aceita'
  const podeIniciarExercicio = conectado && calibrada
  const podeCalibrar = conectado && !calibrada

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="etiqueta">Sessão</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Preparar o exercício</h1>
          <p className="mt-1 text-sm text-muted">
            Conecte o dispositivo, mantenha-o em repouso para calibrar e só então inicie.
          </p>
        </div>
        <Link
          href={`/fisio/pacientes/${pacienteId}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          Cancelar e voltar para a ficha
        </Link>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Sinal do dispositivo</h2>
          <Chip tom={conectado ? 'ok' : 'parado'}>{conectado ? 'Transmitindo' : 'Sem sinal'}</Chip>
        </div>
        <GraficoSinal
          inscrever={inscreverNoSinal}
          zonaNeutraMin={exercicio.zonaNeutraMin}
          zonaNeutraMax={exercicio.zonaNeutraMax}
          limiar={exercicio.limiar}
          altura={150}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            <span className="numero mr-2 text-muted">1</span>Conectar
          </h2>
          <Chip
            tom={
              estadoConexao === 'conectado'
                ? 'ok'
                : estadoConexao === 'falhou'
                  ? 'erro'
                  : estadoConexao === 'conectando'
                    ? 'ativo'
                    : 'parado'
            }
          >
            {estadoConexao === 'conectado'
              ? 'Conectado'
              : estadoConexao === 'conectando'
                ? 'Conectando…'
                : estadoConexao === 'falhou'
                  ? 'Desconectado'
                  : 'Desconectado'}
          </Chip>
        </div>

        <p className="mt-2 text-sm text-muted">
          A confirmação tem {TIMEOUT_CONEXAO_MS / 1000} s (RF-02). Estourou o prazo, a sessão fica
          bloqueada até conectar de novo.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Botao onClick={conectar} disabled={conectado} carregando={estadoConexao === 'conectando'}>
            {conectado ? 'Conectado' : 'Conectar dispositivo'}
          </Botao>
          {estadoConexao === 'conectando' ? (
            <span className="numero text-sm text-muted">
              {(contagemConexao / 1000).toFixed(1)} s de {TIMEOUT_CONEXAO_MS / 1000} s
            </span>
          ) : null}
        </div>

        {erroConexao ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {erroConexao}
          </p>
        ) : null}

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm text-muted">
            Fonte do sinal:{' '}
            <span className="font-medium text-ink">
              {tipoDispositivo === 'demo' ? 'dispositivo de demonstração' : 'porta serial'}
            </span>
            {tipoDispositivo === 'demo' ? ' (funciona sem hardware)' : ''}
          </p>
          {serialDisponivel() ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {tipoDispositivo === 'demo' ? (
                <Botao variante="secundario" onClick={() => trocarDispositivo('serial')}>
                  Usar dispositivo real
                </Botao>
              ) : (
                <Botao variante="secundario" onClick={() => trocarDispositivo('demo')}>
                  Voltar para a demonstração
                </Botao>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            <span className="numero mr-2 text-muted">2</span>Calibrar
          </h2>
          <Chip
            tom={
              faseCalibracao === 'aceita'
                ? 'ok'
                : faseCalibracao === 'rejeitada'
                  ? 'erro'
                  : faseCalibracao === 'aguardando'
                    ? 'parado'
                    : 'ativo'
            }
          >
            {faseCalibracao === 'aceita'
              ? 'Calibração aceita'
              : faseCalibracao === 'rejeitada'
                ? 'Calibração rejeitada'
                : faseCalibracao === 'aguardando'
                  ? 'Aguardando'
                  : faseCalibracao === 'verificando'
                    ? 'Verificando…'
                    : 'Coletando…'}
          </Chip>
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-sm text-muted"
        >
          {faseCalibracao === 'coletando'
            ? 'Mantenha o dispositivo em repouso — coletando a janela de 3 s.'
            : faseCalibracao === 'aceita'
              ? 'Referência aceita: a variação em repouso ficou dentro do limite.'
              : faseCalibracao === 'rejeitada'
                ? 'A variação em repouso passou do limite. Afaste interferências e tente de novo.'
                : 'Durante a calibração, o dispositivo deve ficar parado sobre a mesa.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="etiqueta">Variação ao vivo</p>
            <p className="numero mt-0.5 text-xl font-semibold">
              {variacaoAoVivo !== null ? formatarMedida(variacaoAoVivo) : '—'}
              <span className="ml-1 text-xs font-normal text-muted">unid.</span>
            </p>
          </div>
          <div>
            <p className="etiqueta">Janela</p>
            <p className="numero mt-0.5 text-xl font-semibold">
              {Math.min(JANELA_CALIBRACAO_MS, progressoCalibracao) / 1000 > 0
                ? `${(Math.min(JANELA_CALIBRACAO_MS, progressoCalibracao) / 1000).toFixed(1)} s`
                : '—'}
              <span className="ml-1 text-xs font-normal text-muted">
                de {JANELA_CALIBRACAO_MS / 1000} s
              </span>
            </p>
          </div>
          <div>
            <p className="etiqueta">Limite aceito</p>
            <p className="numero mt-0.5 text-xl font-semibold">
              ≤ {LIMIAR_CALIBRACAO_UNIDADES}
              <span className="ml-1 text-xs font-normal text-muted">unid.</span>
            </p>
          </div>
        </div>

        {faseCalibracao === 'rejeitada' && variacaoMedida !== null ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            Variação medida: {formatarMedida(variacaoMedida)} unidades — acima de{' '}
            {LIMIAR_CALIBRACAO_UNIDADES}.
          </p>
        ) : null}

        <div className="mt-3">
          <Botao onClick={iniciarCalibracao} disabled={!podeCalibrar} carregando={faseCalibracao === 'verificando'}>
            {faseCalibracao === 'aceita'
              ? 'Calibração concluída'
              : faseCalibracao === 'rejeitada'
                ? 'Tentar calibrar de novo'
                : 'Iniciar calibração'}
          </Botao>
          {!conectado && !calibrada ? (
            <p className="mt-2 text-xs text-muted">Conecte o dispositivo para liberar a calibração.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            <span className="numero mr-2 text-muted">3</span>Exercício
          </h2>
          <Chip tom={podeIniciarExercicio ? 'ok' : 'parado'}>
            {podeIniciarExercicio ? 'Pronto' : 'Bloqueado'}
          </Chip>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="etiqueta">Direção</dt>
            <dd className="mt-0.5 font-semibold">{rotuloDirecao[exercicio.direcao]}</dd>
          </div>
          <div>
            <dt className="etiqueta">Zona neutra</dt>
            <dd className="numero mt-0.5 font-semibold">
              {exercicio.zonaNeutraMin} a {exercicio.zonaNeutraMax}
            </dd>
          </div>
          <div>
            <dt className="etiqueta">Limiar</dt>
            <dd className="numero mt-0.5 font-semibold">{exercicio.limiar} unid.</dd>
          </div>
          <div>
            <dt className="etiqueta">Tempo por repetição</dt>
            <dd className="numero mt-0.5 font-semibold">{exercicio.tempoMaxMs / 1000} s</dd>
          </div>
        </dl>

        <div className="mt-4">
          <Botao
            tamanho="grande"
            disabled={!podeIniciarExercicio}
            onClick={() => navegador.push(`/sessao/${sessaoId}/executar`)}
          >
            Iniciar exercício
          </Botao>
          {!podeIniciarExercicio ? (
            <p className="mt-2 text-xs text-muted" aria-live="polite">
              {calibracaoAceita
                ? 'Conecte o dispositivo para retomar esta sessão.'
                : 'O botão libera com conexão confirmada e calibração aceita.'}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
