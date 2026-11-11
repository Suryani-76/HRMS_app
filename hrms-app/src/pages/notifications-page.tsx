import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Trash2, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
  useLeaveRequests,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const typeColor: Record<string, string> = {
  success: 'bg-success/20 text-success',
  error: 'bg-destructive/20 text-destructive',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-primary/20 text-primary',
}

export default function NotificationsPage() {
  const { employee, user } = useAuth()
  const { data: rawNotifications = [], isLoading } = useNotifications()
  const { data: myLeaves = [] } = useLeaveRequests({ employeeId: employee?.id || undefined })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const deleteNotif = useDeleteNotification()
  const clearAll = useClearAllNotifications()
  const [page, setPage] = useState(1)

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

  const unread = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])
  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread notification${unread === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
                <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Clear all
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." icon={Bell} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="divide-y">
              {paged.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'group flex items-start gap-3 p-4 transition-colors hover:bg-accent/50',
                    !n.is_read && 'bg-accent/40'
                  )}
                >
                  <Link
                    to={n.link || '/notifications'}
                    onClick={() => !n.is_read && markRead.mutate(n.id)}
                    className="flex flex-1 items-start gap-3 min-w-0"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        typeColor[n.type ?? 'info'] ?? typeColor.info
                      )}
                    >
                      {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100 transition-opacity"
                      title="Dismiss notification"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotif.mutate(n.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={notifications.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
