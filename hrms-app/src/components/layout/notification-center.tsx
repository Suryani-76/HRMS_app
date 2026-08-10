import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/use-queries'
import { cn } from '@/lib/utils'

const typeColor: Record<string, string> = {
  success: 'bg-success/20 text-success',
  error: 'bg-destructive/20 text-destructive',
  warning: 'bg-warning/20 text-warning',
  info: 'bg-primary/20 text-primary',
}

export function NotificationCenter() {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
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
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
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
            <div className="p-1.5">
              {notifications.slice(0, 10).map((n) => (
                <Link
                  key={n.id}
                  to={n.link || '/notifications'}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  className={cn('flex gap-3 rounded-lg px-3 py-2.5 hover:bg-accent', !n.is_read && 'bg-accent/40')}
                >
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs', typeColor[n.type ?? 'info'] ?? typeColor.info)}>
                    {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.message && <span className="block truncate text-xs text-muted-foreground">{n.message}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                      {format(parseISO(n.created_at), 'MMM d, h:mm a')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
