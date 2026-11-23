'use client'

import { useEffect, useRef } from 'react'
import type { Amostra } from '@/lib/device/tipos'

type PropriedadesGraficoSinal = {
  /**
   * Fonte de amostras: registra um callback e devolve a função de cancelamento.
   * Passe uma função estável (ex.: `device.emAmostra` amarrado) — a inscrição
   * é feita uma única vez e o desenho roda em requestAnimationFrame (RNF-01:
   * o traço é redesenhado na cadência do navegador, não na da amostragem).
   */
  inscrever: (aoReceberAmostra: (amostra: Amostra) => void) => () => void
  zonaNeutraMin: number
  zonaNeutraMax: number
  limiar: number
  altura?: number
  /** Quantidade de amostras visíveis (padrão: ~4 s a 50 Hz). */
  janela?: number
  /** Cores invertidas para o modo kiosk da execução. */
  escuro?: boolean
}

/**
 * Osciloscópio leve em canvas: uma janela deslizante de amostras com a zona
 * neutra sombreada e o limiar pontilhado. Sem bibliotecas externas.
 */
export function GraficoSinal({
  inscrever,
  zonaNeutraMin,
  zonaNeutraMax,
  limiar,
  altura = 160,
  janela = 200,
  escuro = false,
}: PropriedadesGraficoSinal) {
  const referenciaCanvas = useRef<HTMLCanvasElement | null>(null)
  const referenciaBuffer = useRef<Amostra[]>([])
  const referenciaSujo = useRef(true)
  const referenciaInscrever = useRef(inscrever)
  referenciaInscrever.current = inscrever

  useEffect(() => {
    const tela = referenciaCanvas.current
    if (!tela) return

    // Cores dos tokens lidas uma única vez (o tema não muda em tempo de uso).
    const estilo = getComputedStyle(tela)
    const corTinta = estilo.getPropertyValue('--color-ink').trim() || '#10202a'
    const corPapel = estilo.getPropertyValue('--color-paper').trim() || '#f7f6f2'
    const corLinha = estilo.getPropertyValue('--color-line').trim() || '#dfe3e2'
    const corMarca = estilo.getPropertyValue('--color-brand').trim() || '#0e6a55'
    const corMarcaSuave = estilo.getPropertyValue('--color-brand-soft').trim() || '#e4f1ec'
    const corSinal = estilo.getPropertyValue('--color-signal').trim() || '#b8622a'

    const fundo = escuro ? 'transparent' : corPapel
    const corTraco = escuro ? corPapel : corTinta
    const corZona = escuro ? 'rgba(228, 241, 236, 0.14)' : corMarcaSuave
    const corGrade = escuro ? 'rgba(223, 227, 226, 0.25)' : corLinha

    const referenciaBase = Math.max(
      Math.abs(zonaNeutraMin),
      Math.abs(zonaNeutraMax),
      Math.abs(limiar) * 2.25,
      270,
    )
    let limiteDinamico = referenciaBase

    const cancelar = referenciaInscrever.current((amostra) => {
      const buffer = referenciaBuffer.current
      buffer.push(amostra)
      if (buffer.length > janela) buffer.splice(0, buffer.length - janela)
      const pico = Math.abs(amostra.valor) * 1.12
      if (pico > limiteDinamico) limiteDinamico = pico
      referenciaSujo.current = true
    })

    let quadro = 0
    const desenhar = () => {
      quadro = requestAnimationFrame(desenhar)
      const telaAtual = referenciaCanvas.current
      if (!telaAtual || !referenciaSujo.current) return
      referenciaSujo.current = false

      const contexto = telaAtual.getContext('2d')
      if (!contexto) return

      const dpr = window.devicePixelRatio || 1
      const largura = telaAtual.clientWidth
      const alturaCss = telaAtual.clientHeight
      if (
        telaAtual.width !== Math.round(largura * dpr) ||
        telaAtual.height !== Math.round(alturaCss * dpr)
      ) {
        telaAtual.width = Math.round(largura * dpr)
        telaAtual.height = Math.round(alturaCss * dpr)
      }
      contexto.setTransform(dpr, 0, 0, dpr, 0, 0)

      contexto.clearRect(0, 0, largura, alturaCss)
      contexto.fillStyle = fundo
      contexto.fillRect(0, 0, largura, alturaCss)

      const limite = limiteDinamico
      const yDe = (valor: number) => alturaCss / 2 - (valor / limite) * (alturaCss / 2 - 8)
      const xDe = (indice: number, total: number) =>
        total <= 1 ? largura : (indice / (total - 1)) * largura

      // Zona neutra sombreada.
      const yZonaTopo = yDe(zonaNeutraMax)
      const yZonaBase = yDe(zonaNeutraMin)
      contexto.fillStyle = corZona
      contexto.fillRect(0, yZonaTopo, largura, yZonaBase - yZonaTopo)

      // Linha do zero.
      contexto.strokeStyle = corGrade
      contexto.lineWidth = 1
      contexto.beginPath()
      contexto.moveTo(0, yDe(0))
      contexto.lineTo(largura, yDe(0))
      contexto.stroke()

      // Limiares (+ e −) tracejados em laranja.
      contexto.strokeStyle = corSinal
      contexto.setLineDash([5, 4])
      for (const nivel of [limiar, -limiar]) {
        contexto.beginPath()
        contexto.moveTo(0, yDe(nivel))
        contexto.lineTo(largura, yDe(nivel))
        contexto.stroke()
      }
      contexto.setLineDash([])

      // Traço do sinal.
      const buffer = referenciaBuffer.current
      if (buffer.length > 1) {
        contexto.strokeStyle = corTraco
        contexto.lineWidth = 2
        contexto.lineJoin = 'round'
        contexto.beginPath()
        buffer.forEach((amostra, indice) => {
          const px = xDe(indice, buffer.length)
          const py = yDe(amostra.valor)
          if (indice === 0) contexto.moveTo(px, py)
          else contexto.lineTo(px, py)
        })
        contexto.stroke()
        // Ponto mais recente em destaque.
        const ultima = buffer[buffer.length - 1]
        if (ultima) {
          contexto.fillStyle = corMarca
          contexto.beginPath()
          contexto.arc(largura - 1, yDe(ultima.valor), 3, 0, Math.PI * 2)
          contexto.fill()
        }
      }
    }
    quadro = requestAnimationFrame(desenhar)

    return () => {
      cancelAnimationFrame(quadro)
      cancelar()
      referenciaBuffer.current = []
      referenciaSujo.current = true
    }
  }, [janela, zonaNeutraMax, zonaNeutraMin, limiar, escuro])

  return (
    <canvas
      ref={referenciaCanvas}
      role="img"
      aria-label="Sinal do dispositivo ao vivo, com zona neutra sombreada e limiares tracejados"
      style={{ height: altura, width: '100%', display: 'block', borderRadius: 10 }}
    />
  )
}
