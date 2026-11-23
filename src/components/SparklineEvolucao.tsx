import { formatarMedida } from '@/lib/domain/constantes'

type PropriedadesSparkline = {
  valores: number[]
  largura?: number
  altura?: number
  rotulo?: string
}

/**
 * Mini gráfico de linha/área em SVG para resumir tendência em tabelas e cartões.
 * Escala vertical sempre começa em 0 para não exagerar oscilações em platô.
 */
export function SparklineEvolucao({
  valores,
  largura = 96,
  altura = 30,
  rotulo,
}: PropriedadesSparkline) {
  const padX = 4
  const padY = 4
  const utilW = largura - padX * 2
  const utilH = altura - padY * 2

  if (valores.length === 0) {
    return (
      <svg
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        className="shrink-0 overflow-visible"
        role="img"
        aria-label={rotulo ?? 'Sem sessões concluídas'}
      >
        <line
          x1={padX}
          y1={altura / 2}
          x2={largura - padX}
          y2={altura / 2}
          stroke="var(--color-line)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const maxValor = Math.max(...valores, 1) * 1.15
  const yDe = (valor: number) => padY + utilH * (1 - valor / maxValor)

  if (valores.length === 1) {
    const unico = valores[0] ?? 0
    const cy = yDe(unico)
    return (
      <svg
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        className="shrink-0 overflow-visible"
        role="img"
        aria-label={rotulo ?? `1 sessão: ${formatarMedida(unico)}`}
      >
        <line
          x1={padX}
          y1={cy}
          x2={largura - padX}
          y2={cy}
          stroke="var(--color-line)"
          strokeWidth={1.25}
          strokeDasharray="2 3"
        />
        <circle cx={largura / 2} cy={cy} r={3} fill="var(--color-muted)" />
      </svg>
    )
  }

  const primeiro = valores[0] ?? 0
  const ultimo = valores[valores.length - 1] ?? 0
  const cor = ultimo >= primeiro ? 'var(--color-brand)' : 'var(--color-signal)'

  const pontos = valores.map((valor, indice) => {
    const px = padX + (indice / (valores.length - 1)) * utilW
    const py = yDe(valor)
    return { x: px, y: py }
  })

  const linha = pontos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const primeiroPonto = pontos[0]
  const ultimoPonto = pontos[pontos.length - 1]
  const area =
    primeiroPonto && ultimoPonto
      ? `${linha} ${ultimoPonto.x.toFixed(1)},${(padY + utilH).toFixed(1)} ${primeiroPonto.x.toFixed(1)},${(padY + utilH).toFixed(1)}`
      : ''

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={
        rotulo ??
        `Evolução em ${valores.length} sessões: de ${formatarMedida(primeiro)} para ${formatarMedida(ultimo)}`
      }
    >
      {area ? <polygon points={area} fill={cor} fillOpacity={0.14} /> : null}
      <polyline
        points={linha}
        fill="none"
        stroke={cor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {ultimoPonto ? <circle cx={ultimoPonto.x} cy={ultimoPonto.y} r={2.8} fill={cor} /> : null}
    </svg>
  )
}
