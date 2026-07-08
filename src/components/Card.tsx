import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-hairline-subtle bg-surface-card shadow-sm transition-shadow duration-[180ms] ease-out hover:shadow-md',
        className,
      )}
      {...props}
    />
  )
}
