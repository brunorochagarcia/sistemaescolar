'use client'

interface MesFilterProps {
  mes: string
  status: string
}

export function MesFilter({ mes, status }: MesFilterProps) {
  return (
    <form method="GET" className="flex items-center gap-1">
      {status && <input type="hidden" name="status" value={status} />}
      <input
        type="month"
        name="mes"
        defaultValue={mes}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
      />
    </form>
  )
}
