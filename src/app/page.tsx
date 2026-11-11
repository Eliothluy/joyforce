import { redirect } from 'next/navigation'
import { obterUsuarioAtual } from '@/lib/server/auth'

/** Porta de entrada: autenticado vai para a lista de pacientes; senão, para o login. */
export default async function PaginaInicial() {
  const usuario = await obterUsuarioAtual()
  redirect(usuario ? '/fisio/pacientes' : '/login')
}
