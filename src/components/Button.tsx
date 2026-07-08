import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-action-gradient text-white font-bold',
  secondary:
    'bg-white text-ink border border-hairline hover:bg-neutral-50 active:scale-[0.98]',
  ghost: 'bg-transparent text-ink-muted hover:bg-neutral-50 hover:text-ink active:scale-[0.98]',
  danger:
    'bg-white text-danger border border-danger/30 hover:bg-danger-bg active:scale-[0.98]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all duration-[180ms] ease-out disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
})
