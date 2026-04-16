'use client'

interface DataFilterProps {
  dataSelecionada: string
  hoje: string
  materiaId: string | undefined
}

export function DataFilter({ dataSelecionada, hoje, materiaId }: DataFilterProps) {
  return (
    <form method="GET">
      {materiaId && <input type="hidden" name="materiaId" value={materiaId} />}
      <input
        type="date"
        name="data"
        defaultValue={dataSelecionada}
        max={hoje}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
      />
    </form>
  )
}
