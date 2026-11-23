/**
 * Marca do JoyForce: um arco de movimento sobre uma linha de repouso.
 * Desenho geométrico único. Sobre fundo claro usa o retângulo verde (padrão);
 * sobre o painel verde da entrada, use `invertida` para virar um ladrilho
 * branco com o arco na cor da marca.
 */
export function MarcaJoyforce({
  className = '',
  invertida = false,
}: {
  className?: string
  invertida?: boolean
}) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        width="28"
        height="28"
        rx="8"
        fill={invertida ? 'var(--color-card)' : 'var(--color-brand-strong)'}
      />
      <path
        d="M7 18.5c0-4.7 3.1-8.5 7-8.5s7 3.8 7 8.5"
        stroke={invertida ? 'var(--color-brand-strong)' : 'var(--color-paper)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2.6 3.2"
      />
      <path
        d="M7 18.5c0-4.7 3.1-8.5 7-8.5"
        stroke={invertida ? 'var(--color-brand-strong)' : 'var(--color-paper)'}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="14" cy="10" r="1.8" fill="var(--color-signal)" />
      <path
        d="M5.5 18.5h17"
        stroke={invertida ? 'var(--color-brand-strong)' : 'var(--color-paper)'}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  )
}
