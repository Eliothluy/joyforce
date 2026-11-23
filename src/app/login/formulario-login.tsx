'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Campo } from '@/components/Campo'
import { entrar, mensagemDeErro } from '@/lib/api-client'
import { loginSchema } from '@/lib/domain/contratos'

const credenciaisDemo = [
  { nome: 'Dra. Ana Ribeiro', email: 'ana.ribeiro@joyforce.app', senha: 'joyforce123' },
  { nome: 'Dr. Bruno Souza', email: 'bruno.souza@joyforce.app', senha: 'joyforce123' },
]

export function FormularioLogin() {
  const navegador = useRouter()
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [erros, definirErros] = useState<{ email?: string; senha?: string }>({})
  const [erroGeral, definirErroGeral] = useState<string | null>(null)
  const [enviando, definirEnviando] = useState(false)

  function preencher(credencial: (typeof credenciaisDemo)[number]) {
    definirEmail(credencial.email)
    definirSenha(credencial.senha)
    definirErros({})
    definirErroGeral(null)
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    definirErroGeral(null)

    const interpretado = loginSchema.safeParse({ email, senha })
    if (!interpretado.success) {
      const falhas = interpretado.error.flatten().fieldErrors
      definirErros({ email: falhas.email?.[0], senha: falhas.senha?.[0] })
      return
    }

    definirErros({})
    definirEnviando(true)
    try {
      await entrar(interpretado.data)
      navegador.replace('/')
      navegador.refresh()
    } catch (erro) {
      definirErroGeral(mensagemDeErro(erro))
      definirEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={aoEnviar} noValidate className="card flex flex-col gap-4 p-6">
        {erroGeral ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {erroGeral}
          </p>
        ) : null}
        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento) => definirEmail(evento.target.value)}
          erro={erros.email}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => definirSenha(evento.target.value)}
          erro={erros.senha}
        />
        <Botao type="submit" carregando={enviando} tamanho="grande" className="mt-1 w-full">
          Entrar
        </Botao>
      </form>

      <div className="card p-5">
        <p className="etiqueta mb-2">Contas de demonstração</p>
        <ul className="flex flex-col gap-3">
          {credenciaisDemo.map((credencial) => (
            <li key={credencial.email} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{credencial.nome}</p>
                <p className="numero truncate text-xs text-muted">
                  {credencial.email} · {credencial.senha}
                </p>
              </div>
              <Botao variante="secundario" onClick={() => preencher(credencial)}>
                Preencher
              </Botao>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
