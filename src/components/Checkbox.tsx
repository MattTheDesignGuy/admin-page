import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
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
          type="checkbox"
          className={cn(
            'peer h-4 w-4 appearance-none rounded-sm border border-hairline bg-white transition-colors duration-[120ms] ease-out checked:border-indigo checked:bg-indigo disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <Check
          size={12}
          strokeWidth={3}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      {label}
    </label>
  )
})
