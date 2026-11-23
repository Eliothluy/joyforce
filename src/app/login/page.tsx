import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'
import { FormularioLogin } from './formulario-login'
import { MarcaJoyforce } from '@/components/MarcaJoyforce'
import { IconeCheck } from '@/components/Icones'

const promessas = [
  {
    titulo: 'Medição real',
    texto: 'Amplitude e repetições válidas capturadas pelo dispositivo durante o exercício.',
  },
  {
    titulo: 'Evolução comparada',
    texto: 'Cada sessão registrada ao lado da anterior e da linha de base do paciente.',
  },
  {
    titulo: 'Constância',
    texto: 'Acompanhamento semana a semana, o que mantém o paciente no tratamento.',
  },
]

/**
 * Entrada do JoyForce: painel de marca à esquerda (desktop) e formulário
 * à direita. No mobile o painel de marca vira uma faixa compacta.
 */
export default async function PaginaLogin() {
  const usuario = await obterUsuarioAtual()
  if (usuario) redirect('/')

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section
        aria-label="Sobre o JoyForce"
        className="relative hidden flex-col justify-between overflow-hidden bg-brand-strong p-10 text-white lg:flex xl:p-14"
      >
        {/* Arco de amplitude em escala, referência visual ao exercício medido. */}
        <svg
          aria-hidden
          viewBox="0 0 480 480"
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.14]"
          fill="none"
          stroke="currentColor"
          strokeWidth="24"
          strokeLinecap="round"
        >
          <path d="M60 420 A 180 180 0 0 1 420 420" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 480 480"
          className="pointer-events-none absolute -bottom-32 -left-20 h-[340px] w-[340px] opacity-[0.1]"
          fill="none"
          stroke="currentColor"
          strokeWidth="20"
          strokeLinecap="round"
        >
          <path d="M40 440 A 200 200 0 0 1 440 440" />
        </svg>

        <div className="relative flex items-center gap-2.5">
          <MarcaJoyforce className="h-8 w-8" invertida />
          <span className="text-lg font-semibold tracking-tight">JoyForce</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            O esforço invisível vira progresso visível.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-white/85">
            O JoyForce registra os movimentos do braço do paciente e mostra a evolução em linguagem
            simples, para o fisioterapeuta e para quem está em tratamento.
          </p>
          <ul className="mt-8 flex flex-col gap-5">
            {promessas.map((promessa) => (
              <li key={promessa.titulo} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <IconeCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{promessa.titulo}</p>
                  <p className="text-sm text-white/80">{promessa.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">Reabilitação de membro superior com medição real.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <MarcaJoyforce />
            <span className="text-base font-semibold tracking-tight text-brand-strong">JoyForce</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Entrar no JoyForce</h2>
            <p className="mt-1 text-sm text-muted">
              Área do fisioterapeuta: registre sessões e acompanhe a evolução de cada paciente.
            </p>
          </div>

          <FormularioLogin />
        </div>
      </section>
    </main>
  )
}
