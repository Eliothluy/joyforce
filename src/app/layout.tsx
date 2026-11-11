import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'JoyForce',
  description:
    'Registro de amplitude de movimento na reabilitação de membro superior: sessões comparáveis e evolução clara para o fisioterapeuta e o paciente.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
