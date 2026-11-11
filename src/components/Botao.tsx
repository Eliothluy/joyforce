import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type VarianteBotao = 'primario' | 'secundario' | 'perigoso'
export type TamanhoBotao = 'normal' | 'grande'

/**
 * Classes de botão separadas do componente para reuso em <Link> (mesmo visual,
 * navegação real). Uma única fonte de verdade para os três estados.
 */
export function classesBotao(
  variante: VarianteBotao,
  tamanho: TamanhoBotao = 'normal',
  extra = '',
): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
    'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-brand'
  const tamanhoClasse =
    tamanho === 'grande' ? 'px-5 py-3 text-base min-h-12' : 'px-4 py-2 text-sm min-h-10'
  const varianteClasse: Record<VarianteBotao, string> = {
    primario: 'bg-brand text-white hover:bg-brand-strong',
    secundario: 'border border-line bg-card text-ink hover:bg-brand-soft',
    perigoso: 'border border-danger/40 bg-card text-danger hover:bg-danger-soft',
  }
  return `${base} ${tamanhoClasse} ${varianteClasse[variante]} ${extra}`.trimEnd()
}

type PropriedadesBotao = {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  carregando?: boolean
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export function Botao({
  variante = 'primario',
  tamanho = 'normal',
  carregando = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...resto
}: PropriedadesBotao) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={classesBotao(variante, tamanho, className)}
      {...resto}
    >
      {carregando ? <span aria-hidden className="animate-pulse">…</span> : null}
      {children}
    </button>
  )
}
