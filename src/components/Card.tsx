import type { ReactNode } from 'react'

/**
 * Cartão branco com borda fina sobre o papel — unidade básica da interface.
 * O preenchimento padrão pode ser sobrescrito passando classes de espaçamento.
 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`card p-5 ${className}`.trimEnd()}>{children}</div>
}
