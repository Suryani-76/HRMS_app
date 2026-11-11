import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useLeaveRequests,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

const typeColor: Record<string, string> = {
  success: 'bg-success/20 text-success',
  error: 'bg-destructive/20 text-destructive',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-primary/20 text-primary',
}

export function NotificationCenter() {
  const { employee, user } = useAuth()
  const { data: rawNotifications = [], isLoading } = useNotifications()
  const { data: myLeaves = [] } = useLeaveRequests({ employeeId: employee?.id || undefined })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const deleteNotif = useDeleteNotification()

  const currentEmpId = employee?.id ? String(employee.id).toLowerCase() : null
  const currentUserId = user?.id ? String(user.id).toLowerCase() : null

  // Ensure strict personal notification isolation:
  // Employees must ONLY receive leave approval/rejection notifications for leaves THEY personally applied for!
  const notifications = useMemo(() => {
    return rawNotifications.filter((n) => {
      const titleLower = (n.title || '').toLowerCase()
      const msgLower = (n.message || '').toLowerCase()
      const notifEmpId = n.employee_id ? String(n.employee_id).toLowerCase() : null
      const notifUserId = n.user_id ? String(n.user_id).toLowerCase() : null

      const isLeaveStatus =
        titleLower.includes('leave request approved') ||
        titleLower.includes('leave request rejected') ||
        msgLower.includes('your leave request for') ||
        msgLower.includes('leave request for')

      if (isLeaveStatus) {
        const matchesEmp = Boolean(currentEmpId && notifEmpId && notifEmpId === currentEmpId)
        const matchesUser = Boolean(currentUserId && notifUserId && notifUserId === currentUserId)
        if (!matchesEmp && !matchesUser) {
          return false
        }

        // If employee has never applied for leave, or has no leave matching the dates,
        // this notification is an unapplied / orphan notification. Filter it out!
        if (myLeaves.length === 0) {
          return false
        }

        const matchesActualLeave = myLeaves.some(
          (l) => (l.start_date && msgLower.includes(l.start_date)) || (l.end_date && msgLower.includes(l.end_date))
        )
        if (!matchesActualLeave) {
          return false
        }
      }

      if (notifEmpId && currentEmpId && notifEmpId !== currentEmpId) {
        return false
      }

      return true
    })
  }, [rawNotifications, currentEmpId, currentUserId, myLeaves, deleteNotif])

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAll.mutate()}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="p-1.5 divide-y divide-border/40">
              {notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'group flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-accent transition-colors',
                    !n.is_read && 'bg-accent/40'
                  )}
                >
                  <Link
                    to={n.link || '/notifications'}
                    onClick={() => !n.is_read && markRead.mutate(n.id)}
                    className="flex flex-1 gap-2.5 min-w-0"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        typeColor[n.type ?? 'info'] ?? typeColor.info
                      )}
                    >
                      {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.message && <span className="block truncate text-xs text-muted-foreground">{n.message}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                        {format(parseISO(n.created_at), 'MMM d, h:mm a')}
                      </span>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Dismiss"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotif.mutate(n.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs font-medium">
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
