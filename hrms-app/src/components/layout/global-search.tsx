import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Building2, Briefcase, FolderOpen, Star, CalendarClock } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useEmployees } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'

const staticResults = [
  { label: 'Employees', to: '/employees', icon: Users },
  { label: 'Departments', to: '/departments', icon: Building2 },
  { label: 'Recruitment', to: '/recruitment', icon: Briefcase },
  { label: 'Attendance', to: '/attendance', icon: CalendarClock },
  { label: 'Leave', to: '/leave', icon: FolderOpen },
  { label: 'Performance', to: '/performance', icon: Star },
]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { isManager } = useAuth()
  const { data: employees } = useEmployees(query || undefined)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filteredStatic = useMemo(
    () => (query ? staticResults.filter((r) => r.label.toLowerCase().includes(query.toLowerCase())) : []),
    [query],
  )

  const go = (to: string) => {
    setOpen(false)
    setQuery('')
    navigate(to)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden rounded border bg-background px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] max-w-xl translate-y-0 sm:top-[20%]">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <Input
            autoFocus
            placeholder="Search employees, modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 text-base"
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {query && filteredStatic.length > 0 && (
              <div>
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Modules</p>
                {filteredStatic.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => go(r.to)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    <r.icon className="h-4 w-4 text-muted-foreground" />
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            {employees && employees.length > 0 && (
              <div>
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Employees</p>
                {employees.slice(0, 6).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => go(`/employees/${e.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {e.first_name[0]}
                      {e.last_name[0]}
                    </div>
                    <span>
                      {e.first_name} {e.last_name}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{e.employee_code}</span>
                  </button>
                ))}
              </div>
            )}
            {isManager && query && (!employees || employees.length === 0) && filteredStatic.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
