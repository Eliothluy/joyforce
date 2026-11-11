import Link from 'next/link'
import { classesBotao } from '@/components/Botao'

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="etiqueta">Endereço inexistente</p>
      <h1 className="text-2xl font-semibold tracking-tight">Esta página não foi encontrada</h1>
      <p className="text-muted">
        O endereço acessado não existe, ou o registro saiu do seu alcance. Nada foi alterado.
      </p>
      <Link href="/fisio/pacientes" className={classesBotao('primario', 'normal', 'mt-2')}>
        Ir para os pacientes
      </Link>
    </main>
  )
}
