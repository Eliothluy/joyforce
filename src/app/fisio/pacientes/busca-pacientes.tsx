'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Busca por nome com recarga via searchParams (router.replace): a lista
 * continua sendo renderizada no servidor e a URL reflete o filtro.
 */
export function BuscaPacientes({ buscaInicial }: { buscaInicial: string }) {
  const navegador = useRouter()
  const [valor, definirValor] = useState(buscaInicial)
  const montado = useRef(false)

  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    const cronometro = setTimeout(() => {
      const termo = valor.trim()
      if (termo === buscaInicial) return
      navegador.replace(termo ? `/fisio/pacientes?q=${encodeURIComponent(termo)}` : '/fisio/pacientes')
    }, 350)
    return () => clearTimeout(cronometro)
  }, [valor, buscaInicial, navegador])

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const termo = valor.trim()
    navegador.replace(termo ? `/fisio/pacientes?q=${encodeURIComponent(termo)}` : '/fisio/pacientes')
  }

  return (
    <form role="search" onSubmit={aoEnviar} className="w-full sm:max-w-xs">
      <label htmlFor="buscar-paciente" className="sr-only">
        Buscar paciente por nome
      </label>
      <input
        id="buscar-paciente"
        type="search"
        placeholder="Buscar por nome…"
        value={valor}
        onChange={(evento) => definirValor(evento.target.value)}
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-brand"
      />
    </form>
  )
}
