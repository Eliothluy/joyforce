import type { Amostra } from './tipos'

/**
 * Barramento local de amostras no navegador: a fonte (FakeDevice ou
 * DispositivoSerial) publica; os consumidores (gráfico do sinal, calibração,
 * máquina de repetições) assinam. Trocar a fonte não reinscreve ninguém.
 */
export function criarBarramento() {
  const observadores = new Set<(amostra: Amostra) => void>()
  return {
    inscrever(aoReceber: (amostra: Amostra) => void): () => void {
      observadores.add(aoReceber)
      return () => {
        observadores.delete(aoReceber)
      }
    },
    emitir(amostra: Amostra): void {
      for (const observador of observadores) observador(amostra)
    },
  }
}

export type Barramento = ReturnType<typeof criarBarramento>
