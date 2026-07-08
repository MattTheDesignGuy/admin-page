import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full resize-y rounded-md border bg-white px-3 py-2 text-sm text-ink transition-colors duration-[120ms] ease-out placeholder:text-ink-faint',
        'focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-danger' : 'border-hairline',
        className,
      )}
      {...props}
    />
  )
})
