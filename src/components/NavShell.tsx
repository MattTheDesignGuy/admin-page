import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FilePlus, Receipt, Table2, LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses/new', label: 'Log expense', icon: Receipt },
  { to: '/invoices/new', label: 'New invoice', icon: FilePlus },
  { to: '/ledger', label: 'Ledger', icon: Table2 },
]

export function NavShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-surface-sunken">
      <header className="bg-surface-gradient">
        <div className="tdg-container flex h-16 items-center justify-between">
          <Logo className="h-6 w-auto" />
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-on-dark-muted transition-colors duration-[120ms] ease-out hover:text-white"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
        <div className="border-t border-hairline-on-dark">
          <nav className="tdg-container flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[120ms] ease-out',
                    isActive ? 'bg-white/10 text-white' : 'text-ink-on-dark-muted hover:text-white',
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="tdg-container py-8">{children}</main>
    </div>
  )
}
