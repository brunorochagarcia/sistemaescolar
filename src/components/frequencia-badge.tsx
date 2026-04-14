interface FrequenciaBadgeProps {
  percentual: number
}

export function FrequenciaBadge({ percentual }: FrequenciaBadgeProps) {
  const { label, className } =
    percentual >= 75
      ? { label: `${percentual.toFixed(0)}%`, className: 'bg-green-100 text-green-700' }
      : percentual >= 50
        ? { label: `${percentual.toFixed(0)}%`, className: 'bg-amber-100 text-amber-700' }
        : { label: `${percentual.toFixed(0)}%`, className: 'bg-red-100 text-red-600' }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
