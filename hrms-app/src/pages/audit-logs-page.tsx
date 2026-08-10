import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { useAuditLogs } from '@/hooks/use-queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

function actionColor(action: string): 'default' | 'secondary' | 'success' | 'destructive' | 'warning' {
  if (action.includes('.create')) return 'success'
  if (action.includes('.delete')) return 'destructive'
  if (action.includes('.update') || action.includes('.review') || action.includes('.status')) return 'warning'
  return 'secondary'
}

export default function AuditLogsPage() {
  const { data: logs = [], isLoading } = useAuditLogs()
  const [page, setPage] = useState(1)
  const paged = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <PageHeader title="Audit Logs" description="A trail of system actions for accountability." />

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs" description="Actions performed in the system will be recorded here." icon={ShieldCheck} />
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={actionColor(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs">
                          {log.entity_type ?? '—'}
                          {log.entity_id && (
                            <span className={cn('ml-1 font-mono text-muted-foreground')}>{log.entity_id.slice(0, 8)}</span>
                          )}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-2.5">
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={logs.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
