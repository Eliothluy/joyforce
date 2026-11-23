import type { SemanaConstanciaDTO } from '@/lib/server/consultas'
import { Card } from '@/components/Card'

/**
 * Calendário semanal das últimas 8 semanas ISO: mostra constância visual
 * semana a semana em paralelo ao contador de semanas seguidas.
 */
export function CalendarioConstancia({
  semanas,
  semanasConsecutivas,
}: {
  semanas: SemanaConstanciaDTO[]
  semanasConsecutivas: number
}) {
  const semanasAtivas = semanas.filter((s) => s.sessoes > 0).length

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold tracking-tight">Constância semanal</h2>
          <p className="text-xs text-muted">Presença nas últimas {semanas.length} semanas ISO.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="numero rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-muted">
            {semanasAtivas} de {semanas.length} ativas
          </span>
          <span
            className={`numero rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              semanasConsecutivas >= 2
                ? 'bg-brand-soft text-brand-strong'
                : 'border border-line bg-paper text-muted'
            }`}
          >
            {semanasConsecutivas}{' '}
            {semanasConsecutivas === 1 ? 'semana seguida' : 'semanas seguidas'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {semanas.map((semana) => {
          const ativa = semana.sessoes > 0
          return (
            <div
              key={semana.semanaInicio}
              className={`flex flex-col items-center justify-between rounded-xl px-2 py-2.5 text-center ${
                ativa
                  ? 'border border-brand/40 bg-brand-soft text-brand-strong'
                  : 'border border-dashed border-line bg-paper/40 text-muted'
              } ${semana.atual ? 'ring-1 ring-brand ring-offset-1' : ''}`}
            >
              <span className="text-[11px] font-medium leading-tight">{semana.rotulo}</span>
              <span className="numero mt-1.5 text-base font-semibold leading-none">
                {ativa ? semana.sessoes : '—'}
              </span>
              <span className="mt-1 text-[10px] leading-none opacity-80">
                {ativa ? (semana.sessoes === 1 ? 'sessão' : 'sessões') : 'sem reg.'}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
