import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconClassName?: string
  subtitle?: string
  loading?: boolean
}

export function StatCard({ title, value, icon: Icon, iconClassName, subtitle, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary', iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-1 h-6 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="truncate text-xl font-semibold">{value}</p>
          )}
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
