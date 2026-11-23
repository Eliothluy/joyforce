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

export function IconePessoa({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <circle cx="8" cy="5" r="2.6" />
      <path d="M3 13.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" />
    </svg>
  )
}

export function IconeBandeira({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M4 14V3" />
      <path d="M4 3.5h7.5l-1.8 2.5 1.8 2.5H4" />
    </svg>
  )
}

export function IconeAtividade({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M1.5 8h2.6l1.7-4.5 3.4 9L11.2 8h3.3" />
    </svg>
  )
}

export function IconeCalendario({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <rect x="2" y="3.2" width="12" height="10.8" rx="2" />
      <path d="M5 1.8v2.6" />
      <path d="M11 1.8v2.6" />
      <path d="M2 6.5h12" />
    </svg>
  )
}

export function IconeRelogio({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.8V8l2.2 1.4" />
    </svg>
  )
}

export function IconeGrafico({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M2.5 13.5h11" />
      <path d="M4.5 13.5V9" />
      <path d="M8 13.5V5.5" />
      <path d="M11.5 13.5V3" />
    </svg>
  )
}

export function IconeImprimir({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M4.5 5.5V2.5h7v3" />
      <rect x="2" y="5.5" width="12" height="5.5" rx="1.4" />
      <path d="M4.5 9.5h7v4h-7z" fill="var(--color-card)" />
    </svg>
  )
}

export function IconeAlvo({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <circle cx="8" cy="8" r="5.8" />
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconeBusca({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.2 3.2" />
    </svg>
  )
}

export function IconeSetaDireita({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <path d="M3 8h10" />
      <path d="M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  )
}

export function IconeUsuarios({ className = '' }: { className?: string }) {
  return (
    <svg {...propriedadesBase} className={className}>
      <circle cx="6" cy="5.2" r="2.2" />
      <path d="M1.8 13.2c0-2.1 1.9-3.6 4.2-3.6s4.2 1.5 4.2 3.6" />
      <circle cx="11.2" cy="5.8" r="1.7" />
      <path d="M11 9.8c1.8.2 3.2 1.4 3.2 3.4" />
    </svg>
  )
}
