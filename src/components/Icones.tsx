/**
 * Ícones SVG mínimos (traço simples, sem biblioteca externa).
 * Serve tanto em Server quanto em Client Components.
 */

const propriedadesBase = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function IconeSetaCima({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M8 13V3" />
      <path d="M3.5 7.5 8 3l4.5 4.5" />
    </svg>
  )
}

export function IconeSetaBaixo({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M8 3v10" />
      <path d="M3.5 8.5 8 13l4.5-4.5" />
    </svg>
  )
}

export function IconeSetaLado({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M3 8h10" />
      <path d="M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  )
}

export function IconeCheck({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  )
}

export function IconeAlerta({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
      <path d="M8 6.5v3.2" />
      <path d="M8 11.6v.2" />
    </svg>
  )
}

export function IconeSair({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M6 3H3v10h3" />
      <path d="M10 5.5 12.5 8 10 10.5" />
      <path d="M12.5 8H6" />
    </svg>
  )
}
