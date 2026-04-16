export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-6">
        <div className="mb-2 h-4 w-32 rounded bg-zinc-200" />
        <div className="h-8 w-64 rounded bg-zinc-200" />
      </div>
      <div className="space-y-3">
        <div className="h-10 rounded-xl bg-zinc-100" />
        <div className="h-10 rounded-xl bg-zinc-100" />
        <div className="h-10 rounded-xl bg-zinc-100" />
        <div className="h-10 rounded-xl bg-zinc-100" />
        <div className="h-10 rounded-xl bg-zinc-100" />
      </div>
    </div>
  )
}