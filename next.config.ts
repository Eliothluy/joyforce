import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // O app é um monólito Next.js: UI e API no mesmo projeto, sem servidor de longa duração.
  // Nada de rewrites/proxies: as rotas de API vivem em src/app/api.
  poweredByHeader: false,
}

export default nextConfig
