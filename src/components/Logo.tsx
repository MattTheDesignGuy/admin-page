import logoUrl from '@/assets/logos/white-v2-logo.svg'

export function Logo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="The Design Guy" className={className} />
}
