import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Tag({
  children,
  onRemove,
  className,
}: {
  children: ReactNode
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-hairline bg-white px-2.5 py-1 text-xs font-medium text-ink-muted',
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="text-ink-faint transition-colors duration-[120ms] ease-out hover:text-danger"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
