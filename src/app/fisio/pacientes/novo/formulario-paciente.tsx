'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/Botao'
import { Campo } from '@/components/Campo'
import { criarPaciente, mensagemDeErro, camposDeErro } from '@/lib/api-client'
import { pacienteCreateSchema } from '@/lib/domain/contratos'

type ChaveCampo = 'nome' | 'dataNascimento' | 'lesaoDiagnostico' | 'telefone'
type ErrosPorCampo = Partial<Record<ChaveCampo, string>>

const CHAVES: readonly ChaveCampo[] = ['nome', 'dataNascimento', 'lesaoDiagnostico', 'telefone']

/** Máscara leve: só dígitos; o payload vai sem formatação (HU-01). */
function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function FormularioPaciente() {
  const navegador = useRouter()
  const [valores, definirValores] = useState({
    nome: '',
    dataNascimento: '',
    lesaoDiagnostico: '',
    telefone: '',
  })
  const [erros, definirErros] = useState<ErrosPorCampo>({})
  const [erroGeral, definirErroGeral] = useState<string | null>(null)
  const [enviando, definirEnviando] = useState(false)

  function definirCampo(chave: ChaveCampo, valor: string) {
    definirValores((atual) => ({ ...atual, [chave]: valor }))
    definirErros((atual) => ({ ...atual, [chave]: undefined }))
    definirErroGeral(null)
  }

  function validarLocal(): ErrosPorCampo {
    const interpretado = pacienteCreateSchema.safeParse(valores)
    if (interpretado.success) return {}
    const falhas = interpretado.error.flatten().fieldErrors
    const coletados: ErrosPorCampo = {}
    for (const chave of CHAVES) {
      const mensagem = falhas[chave]?.[0]
      if (mensagem) coletados[chave] = mensagem
    }
    return coletados
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    definirErroGeral(null)

    const errosLocais = validarLocal()
    if (Object.keys(errosLocais).length > 0) {
      definirErros(errosLocais)
      return
    }

    definirEnviando(true)
    try {
      const paciente = await criarPaciente({
        nome: valores.nome.trim(),
        dataNascimento: valores.dataNascimento,
        lesaoDiagnostico: valores.lesaoDiagnostico.trim(),
        telefone: somenteDigitos(valores.telefone),
      })
      navegador.push(`/fisio/pacientes/${paciente.id}`)
    } catch (falha) {
      const campos = camposDeErro(falha)
      if (campos) {
        const convertidos: ErrosPorCampo = {}
        for (const chave of CHAVES) {
          const mensagem = campos[chave]
          if (mensagem) convertidos[chave] = mensagem
        }
        definirErros(convertidos)
      }
      definirErroGeral(mensagemDeErro(falha))
      definirEnviando(false)
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="card flex flex-col gap-5 p-6">
      {erroGeral ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {erroGeral}
        </p>
      ) : null}

      <Campo
        id="nome"
        rotulo="Nome completo"
        autoComplete="name"
        placeholder="Ex.: Maria das Graças Silva"
        value={valores.nome}
        onChange={(evento) => definirCampo('nome', evento.target.value)}
        erro={erros.nome}
      />

      <Campo
        id="data-nascimento"
        rotulo="Data de nascimento"
        type="date"
        dica="Formato AAAA-MM-DD."
        value={valores.dataNascimento}
        onChange={(evento) => definirCampo('dataNascimento', evento.target.value)}
        erro={erros.dataNascimento}
      />

      <Campo
        id="lesao"
        rotulo="Lesão / diagnóstico"
        placeholder="Ex.: AVC isquêmico — hemiparesia à direita"
        value={valores.lesaoDiagnostico}
        onChange={(evento) => definirCampo('lesaoDiagnostico', evento.target.value)}
        erro={erros.lesaoDiagnostico}
      />

      <Campo
        id="telefone"
        rotulo="Telefone"
        type="tel"
        inputMode="numeric"
        placeholder="9133224455"
        dica="DDD + número, com exatamente 10 dígitos."
        value={valores.telefone}
        onChange={(evento) => definirCampo('telefone', somenteDigitos(evento.target.value))}
        erro={erros.telefone}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Botao type="submit" carregando={enviando} tamanho="grande">
          Cadastrar paciente
        </Botao>
        <Botao variante="secundario" onClick={() => navegador.back()} disabled={enviando}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}
