'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { GraficoSinal } from '@/components/GraficoSinal'
import { formatarMedida, rotuloDirecao } from '@/lib/domain/constantes'
import { enviarLoteRepeticoes, concluirSessao, abortarSessao, mensagemDeErro } from '@/lib/api-client'
import { FakeDevice } from '@/lib/device/fake-device'
import { criarBarramento } from '@/lib/device/barramento'
import { criarMaquinaRepeticao } from '@/lib/device/maquina-repeticao'
import type { EstadoCiclo, MaquinaRepeticao, RepeticaoDetectada } from '@/lib/device/maquina-repeticao'
import type { Dispositivo, ParametrosExercicio } from '@/lib/device/tipos'
import type { ExercicioDTO, SessaoDTO } from '@/lib/domain/contratos'

type EstadoConexao = 'conectando' | 'conectado' | 'falhou'
type Tela = 'exercendo' | 'pausado' | 'confirmando-concluir' | 'confirmando-abortar'

type AmplitudeRecente = { amplitude: number; valida: boolean }

function mensagemGuia(estado: EstadoCiclo, limiar: number): string {
  switch (estado) {
    case 'DENTRO_ZONA':
      return 'Posição neutra — pronto para iniciar o movimento'
    case 'FORA_ZONA':
      return `Continue avançando até atingir o limiar (${limiar} unid.)`
    case 'LIMIAR_ATINGIDO':
      return 'Limiar atingido! Volte à zona neutra para contar'
  }
}

export function ExecucaoSessao({
  sessao,
  exercicio,
  pacienteNome = null,
}: {
  sessao: SessaoDTO
  exercicio: ExercicioDTO
  pacienteNome?: string | null
}) {
  const navegador = useRouter()

  const parametros: ParametrosExercicio = {
    zonaNeutraMin: exercicio.zonaNeutraMin,
    zonaNeutraMax: exercicio.zonaNeutraMax,
    limiar: exercicio.limiar,
    tempoMaxMs: exercicio.tempoMaxMs,
  }

  const barramentoRef = useRef<ReturnType<typeof criarBarramento> | null>(null)
  if (barramentoRef.current === null) barramentoRef.current = criarBarramento()

  const dispositivoRef = useRef<Dispositivo | null>(null)
  const cancelarRepassoRef = useRef<(() => void) | null>(null)
  const maquinaRef = useRef<MaquinaRepeticao>(criarMaquinaRepeticao(parametros))
  const ultimoTRef = useRef(0)

  // Fila de envio (RNF-03): lote com sequência crescente; se a rede oscilar,
  // o lote fica retido e é reenviado — a API é idempotente por sequência.
  const bufferRef = useRef<RepeticaoDetectada[]>([])
  const sequenciaRef = useRef(sessao.ultimaSequencia)
  const enviandoRef = useRef(false)
  const cronReenvioRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [estadoConexao, definirEstadoConexao] = useState<EstadoConexao>('conectando')
  const [erroConexao, definirErroConexao] = useState<string | null>(null)
  const [tela, definirTela] = useState<Tela>('exercendo')
  const [contadorValidas, definirContadorValidas] = useState(sessao.totalRepeticoesValidas)
  const [amplitudeMaxSessao, definirAmplitudeMaxSessao] = useState(sessao.amplitudeMaxima)
  const [pendentes, definirPendentes] = useState(0)
  const [amplitudesRecentes, definirAmplitudesRecentes] = useState<AmplitudeRecente[]>([])
  const [tempoCicloMs, definirTempoCicloMs] = useState(0)
  const [estadoCiclo, definirEstadoCiclo] = useState<EstadoCiclo>('DENTRO_ZONA')
  const [amplitudeCicloAtual, definirAmplitudeCicloAtual] = useState(0)
  const [estourouTempo, definirEstourouTempo] = useState(false)
  const [erroRede, definirErroRede] = useState<string | null>(null)
  const [erroConclusao, definirErroConclusao] = useState<string | null>(null)
  const [encerrando, definirEncerrando] = useState(false)

  function registrarRepeticao(repeticao: RepeticaoDetectada) {
    bufferRef.current.push({
      tInicioMs: repeticao.tInicioMs,
      duracaoMs: repeticao.duracaoMs,
      amplitude: repeticao.amplitude,
      valida: repeticao.valida,
    })
    definirPendentes(bufferRef.current.length)
    definirAmplitudesRecentes((atual) =>
      [{ amplitude: repeticao.amplitude, valida: repeticao.valida }, ...atual].slice(0, 6),
    )
    definirAmplitudeMaxSessao((atual) => Math.max(atual, repeticao.amplitude))
    if (repeticao.valida) definirContadorValidas((valor) => valor + 1)
    void despachar()
  }

  async function despachar() {
    if (enviandoRef.current) return
    const lote = bufferRef.current.slice(0, 500)
    if (lote.length === 0) return
    enviandoRef.current = true
    const sequencia = sequenciaRef.current + 1
    let falhou = false
    try {
      await enviarLoteRepeticoes(sessao.id, { sequencia, repeticoes: lote })
      bufferRef.current = bufferRef.current.slice(lote.length)
      sequenciaRef.current = sequencia
      definirPendentes(bufferRef.current.length)
    } catch {
      // Rede oscilou: retém o lote e tenta de novo; a sequência garante
      // idempotência (o servidor ignora lote com sequência já processada).
      falhou = true
    } finally {
      enviandoRef.current = false
    }

    if (falhou) {
      definirErroRede('Sem contato com o servidor — as repetições ficam na fila e serão reenviadas.')
      if (cronReenvioRef.current === null) {
        cronReenvioRef.current = setTimeout(() => {
          cronReenvioRef.current = null
          void despachar()
        }, 2000)
      }
      return
    }

    if (bufferRef.current.length === 0) {
      definirErroRede(null)
    } else {
      void despachar()
    }
  }

  async function conectarEIniciar() {
    const dispositivo = dispositivoRef.current
    if (!dispositivo) return
    definirEstadoConexao('conectando')
    definirErroConexao(null)
    try {
      await dispositivo.conectar()
      dispositivo.iniciarExercicio(parametros)
      maquinaRef.current.reiniciar()
      definirEstadoConexao('conectado')
    } catch (falha) {
      definirEstadoConexao('falhou')
      definirErroConexao(mensagemDeErro(falha))
    }
  }

  useEffect(() => {
    const barramento = barramentoRef.current
    if (!barramento) return

    const dispositivo: Dispositivo = new FakeDevice()
    dispositivoRef.current = dispositivo
    cancelarRepassoRef.current = dispositivo.emAmostra((amostra) => barramento.emitir(amostra))

    const cancelarObservacao = barramento.inscrever((amostra) => {
      ultimoTRef.current = amostra.t
      const repeticao = maquinaRef.current.processar(amostra)
      if (repeticao !== null) registrarRepeticao(repeticao)
    })

    void conectarEIniciar()

    return () => {
      cancelarObservacao()
      if (cancelarRepassoRef.current !== null) {
        cancelarRepassoRef.current()
        cancelarRepassoRef.current = null
      }
      if (cronReenvioRef.current !== null) {
        clearTimeout(cronReenvioRef.current)
        cronReenvioRef.current = null
      }
      dispositivoRef.current = null
      void dispositivo.desconectar()
    }
    // A inscrição acontece uma única vez: as funções usadas aqui só leem refs
    // e atualizam estado na forma funcional, então não dependem do render.
  }, [])

  // Relógio e orientação do ciclo corrente: lidos no requestAnimationFrame
  // (RNF-01), nunca dentro do callback de 50 Hz do dispositivo.
  useEffect(() => {
    let quadro = 0
    let ultimaMarcacao = 0
    const passo = (agora: number) => {
      quadro = requestAnimationFrame(passo)
      if (agora - ultimaMarcacao < 100) return
      ultimaMarcacao = agora
      const maquina = maquinaRef.current
      definirEstadoCiclo(maquina.estado)
      definirAmplitudeCicloAtual(maquina.amplitudeCiclo)
      if (maquina.estado === 'DENTRO_ZONA') {
        definirTempoCicloMs(0)
        definirEstourouTempo(false)
      } else {
        const tempo = maquina.tempoCorrente(ultimoTRef.current)
        definirTempoCicloMs(tempo)
        definirEstourouTempo(tempo > exercicio.tempoMaxMs)
      }
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [exercicio.tempoMaxMs])

  /* --------------------------------------------------------- pausa/fim */

  function pausar() {
    dispositivoRef.current?.parar()
    maquinaRef.current.reiniciar()
    definirTela('pausado')
  }

  function continuar() {
    dispositivoRef.current?.iniciarExercicio(parametros)
    maquinaRef.current.reiniciar()
    definirTela('exercendo')
  }

  async function concluir() {
    definirEncerrando(true)
    definirErroConclusao(null)
    // Esgota a fila de lotes antes de pedir o fechamento: o servidor recalcula
    // os agregados no concluir, e repetição que ainda está na fila não entraria.
    for (let tentativa = 0; tentativa < 10 && bufferRef.current.length > 0; tentativa += 1) {
      await despachar()
      if (bufferRef.current.length > 0) {
        await new Promise((resolver) => setTimeout(resolver, 250))
      }
    }
    try {
      await concluirSessao(sessao.id)
      navegador.replace(`/sessao/${sessao.id}/resultado`)
    } catch (falha) {
      definirErroConclusao(mensagemDeErro(falha))
      definirEncerrando(false)
    }
  }

  async function abortar() {
    definirEncerrando(true)
    definirErroConclusao(null)
    try {
      await abortarSessao(sessao.id)
      navegador.push(`/fisio/pacientes/${sessao.pacienteId}`)
    } catch (falha) {
      definirErroConclusao(mensagemDeErro(falha))
      definirEncerrando(false)
    }
  }

  /* ------------------------------------------------------------ visual */

  const conectado = estadoConexao === 'conectado'
  const tempoCicloTexto =
    tela === 'exercendo' && tempoCicloMs > 0 ? `${(tempoCicloMs / 1000).toFixed(1)} s` : '—'
  const progressoTempoPct =
    tela === 'exercendo' ? Math.min(100, Math.round((tempoCicloMs / exercicio.tempoMaxMs) * 100)) : 0
  const progressoLimiarPct =
    tela === 'exercendo'
      ? Math.min(100, Math.round((amplitudeCicloAtual / Math.max(exercicio.limiar, 1)) * 100))
      : 0

  const escalaMiniBarras = Math.max(
    exercicio.limiar * 1.4,
    ...amplitudesRecentes.map((r) => r.amplitude),
    260,
  )
  const recentesCronologico = [...amplitudesRecentes].reverse()

  return (
    <div className="kiosk flex min-h-dvh flex-col p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold tracking-tight">
            Exercício — {rotuloDirecao[exercicio.direcao]}
            {pacienteNome ? <span className="ml-2 font-normal text-paper/70">· {pacienteNome}</span> : null}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              conectado ? 'bg-brand-soft text-brand-strong' : 'bg-warn-soft text-warn'
            }`}
          >
            {estadoConexao === 'conectado'
              ? 'Conectado'
              : estadoConexao === 'conectando'
                ? 'Conectando…'
                : 'Desconectado'}
          </span>
          {erroRede ? (
            <span role="status" className="text-xs text-signal-soft">
              {erroRede} ({pendentes} na fila)
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Botao variante="secundario" onClick={pausar} disabled={!conectado || tela !== 'exercendo'}>
            Pausar
          </Botao>
        </div>
      </div>

      {estadoConexao === 'falhou' ? (
        <div className="mt-3 rounded-lg border border-signal/40 bg-signal-soft px-4 py-3 text-sm text-signal">
          <p className="font-semibold">Não foi possível conectar ao dispositivo.</p>
          <p className="mt-0.5">{erroConexao}</p>
          <div className="mt-2">
            <Botao variante="secundario" onClick={() => void conectarEIniciar()}>
              Tentar de novo
            </Botao>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid flex-1 gap-3 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col justify-between rounded-[14px] border border-line/30 p-3 sm:p-4">
          {/* Orientação ao vivo do movimento */}
          <div
            aria-live="polite"
            className={`mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 ${
              estadoCiclo === 'LIMIAR_ATINGIDO'
                ? 'border-brand/60 bg-brand/20 text-paper'
                : estadoCiclo === 'FORA_ZONA'
                  ? 'border-signal/60 bg-signal/20 text-paper'
                  : 'border-line/20 bg-paper/5 text-paper/85'
            }`}
          >
            <p className="text-sm font-medium">{mensagemGuia(estadoCiclo, exercicio.limiar)}</p>
            <span className="numero text-xs text-paper/80">
              {estadoCiclo === 'DENTRO_ZONA'
                ? 'Em repouso'
                : `${formatarMedida(amplitudeCicloAtual)} / ${exercicio.limiar} unid.`}
            </span>
          </div>

          <GraficoSinal
            inscrever={(aoReceber) => {
              const barramento = barramentoRef.current
              if (!barramento) return () => undefined
              return barramento.inscrever(aoReceber)
            }}
            zonaNeutraMin={exercicio.zonaNeutraMin}
            zonaNeutraMax={exercicio.zonaNeutraMax}
            limiar={exercicio.limiar}
            altura={240}
            escuro
          />

          <div className="mt-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-paper/75">
              <span>Progresso até o limiar ({exercicio.limiar} unid.)</span>
              <span className="numero">{progressoLimiarPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-paper/15">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  estadoCiclo === 'LIMIAR_ATINGIDO' ? 'bg-brand' : 'bg-signal'
                }`}
                style={{ width: `${progressoLimiarPct}%` }}
              />
            </div>
            <p className="text-xs text-paper/70">
              Faixa clara: zona neutra ({exercicio.zonaNeutraMin} a {exercicio.zonaNeutraMax}). Linhas
              tracejadas: limiar de {exercicio.limiar} unidades.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-[14px] border border-line/30 px-4 py-3.5 text-center">
            <p className="etiqueta text-paper/70">Repetições válidas</p>
            <div className="numero-gigante mt-1" aria-live="polite" aria-atomic="true">
              {contadorValidas}
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 border-t border-line/20 pt-2.5 text-xs text-paper/80">
              <span>
                Amplitude máx.:{' '}
                <strong className="numero text-paper">
                  {amplitudeMaxSessao > 0 ? `${formatarMedida(amplitudeMaxSessao)} unid.` : '—'}
                </strong>
              </span>
            </div>
          </div>

          <div className="rounded-[14px] border border-line/30 px-4 py-3 text-center">
            <p className="etiqueta text-paper/70">Tempo da repetição corrente</p>
            <p className="numero mt-1 text-2xl font-semibold">{tempoCicloTexto}</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper/15">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  estourouTempo
                    ? 'bg-danger'
                    : progressoTempoPct >= 75
                      ? 'bg-signal'
                      : 'bg-brand'
                }`}
                style={{ width: `${progressoTempoPct}%` }}
              />
            </div>
            <div aria-live="polite" className="mt-1.5 min-h-5">
              {estourouTempo ? (
                <span className="inline-flex rounded-full bg-signal-soft px-2.5 py-0.5 text-xs font-semibold text-signal">
                  Passou de {exercicio.tempoMaxMs / 1000} s — esta repetição não vale
                </span>
              ) : (
                <span className="text-xs text-paper/65">
                  Limite: {exercicio.tempoMaxMs / 1000} s por ida e volta
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-line/30 px-4 py-3">
            <p className="etiqueta text-paper/70">Últimas amplitudes</p>
            {recentesCronologico.length === 0 ? (
              <p className="mt-2 text-sm text-paper/70">Nenhuma repetição concluída ainda.</p>
            ) : (
              <>
                {/* Mini barras proporcionais com linha tracejada do limiar */}
                <div className="relative mt-2 flex h-12 items-end gap-2 rounded-lg bg-paper/5 px-2.5 pb-1 pt-2">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-signal/80"
                    style={{
                      bottom: `${Math.min(95, Math.round((exercicio.limiar / escalaMiniBarras) * 100))}%`,
                    }}
                  />
                  {recentesCronologico.map((registro, indice) => {
                    const alturaPct = Math.max(
                      10,
                      Math.round((registro.amplitude / escalaMiniBarras) * 100),
                    )
                    return (
                      <div
                        key={`mini-${indice}-${registro.amplitude}`}
                        className="flex h-full flex-1 flex-col items-center justify-end"
                        title={
                          registro.valida
                            ? `${formatarMedida(registro.amplitude)} unid. — válida`
                            : `${formatarMedida(registro.amplitude)} unid. — não contou`
                        }
                      >
                        <div
                          className={`w-full max-w-8 rounded-t ${
                            registro.valida ? 'bg-brand' : 'border border-dashed border-signal bg-signal/45'
                          }`}
                          style={{ height: `${alturaPct}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {amplitudesRecentes.map((registro, indice) => (
                    <li
                      key={`${indice}-${registro.amplitude}`}
                      className={`numero rounded-lg border px-2 py-0.5 text-xs ${
                        registro.valida
                          ? 'border-brand/50 text-paper'
                          : 'border-signal/50 text-signal-soft'
                      }`}
                      title={
                        registro.valida
                          ? 'Repetição válida'
                          : 'Não atingiu o limiar ou estourou o tempo'
                      }
                    >
                      {formatarMedida(registro.amplitude)}
                      {registro.valida ? '' : ' · não vale'}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {tela !== 'exercendo' ? (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-ink/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={
            tela === 'pausado'
              ? 'Sessão pausada'
              : tela === 'confirmando-concluir'
                ? 'Encerrar sessão'
                : 'Abortar sessão'
          }
        >
          <div className="card w-full max-w-md p-6">
            {tela === 'pausado' ? (
              <>
                <h2 className="text-xl font-semibold">Sessão pausada</h2>
                <p className="mt-1 text-sm text-muted">
                  O sinal está parado. Continue o exercício, encerre com resultado ou aborte a
                  sessão.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Botao tamanho="grande" onClick={continuar}>
                    Continuar exercício
                  </Botao>
                  <Botao variante="secundario" onClick={() => definirTela('confirmando-concluir')}>
                    Encerrar sessão
                  </Botao>
                  <Botao variante="perigoso" onClick={() => definirTela('confirmando-abortar')}>
                    Abortar sessão
                  </Botao>
                </div>
              </>
            ) : null}

            {tela === 'confirmando-concluir' ? (
              <>
                <h2 className="text-xl font-semibold">Encerrar e gerar o resultado?</h2>
                <p className="mt-1 text-sm text-muted">
                  O JoyForce registra {contadorValidas} repetições válidas desta sessão, gera a
                  avaliação correspondente e mostra a evolução comparada.
                </p>
                {erroConclusao ? (
                  <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                    {erroConclusao}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2">
                  <Botao tamanho="grande" onClick={() => void concluir()} carregando={encerrando}>
                    Confirmar encerramento
                  </Botao>
                  <Botao variante="secundario" onClick={() => definirTela('pausado')} disabled={encerrando}>
                    Voltar
                  </Botao>
                </div>
              </>
            ) : null}

            {tela === 'confirmando-abortar' ? (
              <>
                <h2 className="text-xl font-semibold">Abortar esta sessão?</h2>
                <p className="mt-1 text-sm text-muted">
                  Nada será registrado como resultado e você volta para a ficha do paciente.
                </p>
                {erroConclusao ? (
                  <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                    {erroConclusao}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2">
                  <Botao variante="perigoso" tamanho="grande" onClick={() => void abortar()} carregando={encerrando}>
                    Abortar mesmo assim
                  </Botao>
                  <Botao variante="secundario" onClick={() => definirTela('pausado')} disabled={encerrando}>
                    Voltar
                  </Botao>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
