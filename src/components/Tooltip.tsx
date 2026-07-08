import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
}) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-sm bg-navy px-2 py-1 text-xs font-medium text-white transition-all duration-[120ms] ease-out',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        {content}
      </span>
    </span>
  )
}
