'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UsuarioDTO } from '@/lib/domain/contratos'
import { iniciaisNome } from '@/lib/ui-format'
import { BotaoSair } from '@/components/BotaoSair'
import { MarcaJoyforce } from '@/components/MarcaJoyforce'

const navegacao = [
  { href: '/', rotulo: 'Início' },
  { href: '/fisio/pacientes', rotulo: 'Pacientes' },
]

/**
 * Cabeçalho das áreas protegidas, com navegação principal e estado ativo.
 * O modo kiosk da execução não o usa.
 */
export function CabecalhoApp({ usuario }: { usuario: UsuarioDTO }) {
  const caminho = usePathname()
  const iniciais = iniciaisNome(usuario.nome)

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur-xs print:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="JoyForce, início">
            <MarcaJoyforce />
            <span className="text-sm font-semibold tracking-tight text-brand-strong">JoyForce</span>
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-1.5">
            {navegacao.map((item) => {
              const ativo = item.href === '/' ? caminho === '/' : caminho.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    ativo
                      ? 'bg-brand-soft font-semibold text-brand-strong'
                      : 'text-muted hover:bg-paper hover:text-ink'
                  }`}
                >
                  {item.rotulo}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong"
            >
              {iniciais}
            </span>
            <span className="text-sm font-medium text-ink">{usuario.nome}</span>
          </div>
          <BotaoSair />
        </div>
      </div>
    </header>
  )
}
