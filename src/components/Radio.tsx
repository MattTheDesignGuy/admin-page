import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, label, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink">
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className={cn(
            'peer h-4 w-4 appearance-none rounded-full border border-hairline bg-white transition-colors duration-[120ms] ease-out checked:border-indigo disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo opacity-0 transition-opacity duration-[120ms] ease-out peer-checked:opacity-100" />
      </span>
      {label}
    </label>
  )
})
