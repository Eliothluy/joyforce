import Link from 'next/link'
import type { UsuarioDTO } from '@/lib/domain/contratos'
import { BotaoSair } from '@/components/BotaoSair'

/** Cabeçalho discreto das áreas protegidas (o modo kiosk da execução não o usa). */
export function CabecalhoApp({ usuario }: { usuario: UsuarioDTO }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/fisio/pacientes"
          className="text-sm font-semibold tracking-tight text-brand-strong"
        >
          JoyForce
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{usuario.nome}</span>
          <BotaoSair />
        </div>
      </div>
    </header>
  )
}
