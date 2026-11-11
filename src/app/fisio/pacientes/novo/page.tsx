import { PageHeader } from '@/components/PageHeader'
import { FormularioPaciente } from './formulario-paciente'

export default function PaginaNovoPaciente() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        contexto="Pacientes"
        titulo="Novo paciente"
        descricao="Quatro dados bastam para abrir a ficha. A primeira sessão concluída gerará a avaliação inicial."
      />
      <FormularioPaciente />
    </div>
  )
}
