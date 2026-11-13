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
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'text-zinc-400 hover:bg-rose-950/30 hover:text-rose-100',
          isActive &&
            'bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 text-white font-semibold shadow-md shadow-rose-950/50 border border-rose-600/30',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{title}</span>
    </NavLink>
  )
}

function Section({
  title,
  items,
  onNavigate,
}: {
  title: string
  items: { title: string; to: string; icon: LucideIcon }[]
  onNavigate?: () => void
}) {
  return (
    <div className="px-3 py-2">
      <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-rose-300/80">{title}</p>
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
    <div className="flex h-full flex-col gap-1 overflow-y-auto custom-scrollbar py-4 bg-[#0a0507]/95 backdrop-blur-xl border-r border-rose-950/40 shadow-2xl">
      <div className="mb-6 px-6">
        <div className="inline-flex items-center rounded-xl bg-white/10 p-2.5 border border-rose-900/30 backdrop-blur-sm shadow-inner">
          <Logo size="md" />
        </div>
      </div>
      {sections.map((section) => (
        <Section key={section.title} {...section} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
