import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'ghost' | 'solid'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = 'ghost', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all duration-[120ms] ease-out active:scale-[0.98]',
        variant === 'ghost' && 'text-ink-muted hover:bg-neutral-50 hover:text-ink',
        variant === 'solid' && 'bg-navy text-white hover:bg-neutral-800',
        className,
      )}
      {...props}
    />
  )
})
