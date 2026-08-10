import { NavLink } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminNav, employeeNav } from '@/config/nav'
import { useAuth } from '@/features/auth/auth-context'
import { Logo } from '@/components/ui/logo'

interface SidebarNavProps {
  onNavigate?: () => void
}

function Item({
  title,
  to,
  icon: Icon,
  onNavigate,
}: {
  title: string
  to: string
  icon: LucideIcon
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300',
          'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900',
          isActive && 'bg-primary/10 text-primary hover:bg-primary/15 shadow-sm',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{title}</span>
    </NavLink>
  )
}

function Section({ title, items, onNavigate }: { title: string; items: { title: string; to: string; icon: LucideIcon }[]; onNavigate?: () => void }) {
  return (
    <div className="px-3 py-2">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <Item key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { isManager } = useAuth()
  const sections = isManager ? adminNav : employeeNav

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto py-4 bg-white/40 backdrop-blur-xl border-r border-slate-200/50">
      <div className="mb-6 px-6">
        <Logo size="lg" />
      </div>
      {sections.map((section) => (
        <Section key={section.title} {...section} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
