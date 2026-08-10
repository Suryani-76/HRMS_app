import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-queries'
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
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const [page, setPage] = useState(1)

  const unread = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])
  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread notification${unread === 1 ? '' : 's'}`}
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={() => markAll.mutate()}>
              Mark all read
            </Button>
          ) : undefined
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
                <Link
                  key={n.id}
                  to={n.link || '/notifications'}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  className={cn('flex items-start gap-3 p-4 transition-colors hover:bg-accent', !n.is_read && 'bg-accent/40')}
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm', typeColor[n.type ?? 'info'] ?? typeColor.info)}>
                    {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                  </div>
                  {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              ))}
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={notifications.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
