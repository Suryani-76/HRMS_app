import { useMemo, useState } from 'react'
import { CalendarClock, Loader2, Check, X, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusPill } from '@/components/shared/status-pill'
import {
  useLeaveRequests,
  useLeaveTypes,
  useLeaveBalances,
  useApplyLeave,
  useReviewLeave,
  useCancelLeave,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, formatDateTime, daysBetween } from '@/lib/format'

const PAGE_SIZE = 12

function LeaveBalances({ employeeId }: { employeeId: string }) {
  const { data: balances = [] } = useLeaveBalances(employeeId, new Date().getFullYear())
  if (balances.length === 0) return <EmptyState title="No balances yet" description="Balances appear after account setup." />
  return (
    <div className="space-y-3">
      {balances.map((b) => {
        const remaining = Math.max(0, b.allocated - b.used)
        const pct = b.allocated > 0 ? Math.min(100, (remaining / b.allocated) * 100) : 0
        return (
          <div key={b.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{b.leave_type?.name}</p>
                <p className="text-xs text-muted-foreground">{b.leave_type?.is_paid ? 'Paid' : 'Unpaid'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{remaining}<span className="text-xs text-muted-foreground">/{b.allocated}</span></p>
                <p className="text-xs text-muted-foreground">{b.used} used</p>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ManagerLeave() {
  const [status, setStatus] = useState('all')
  const { data: requests = [], isLoading, isError, refetch } = useLeaveRequests({ status: status !== 'all' ? status : undefined })
  const review = useReviewLeave()
  const [page, setPage] = useState(1)

  const paged = useMemo(() => requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [requests, page])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : paged.length === 0 ? (
        <EmptyState title="No leave requests" description="There are no leave requests matching this filter." />
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{r.employee?.first_name} {r.employee?.last_name}</td>
                      <td className="px-4 py-2.5">{r.leave_type?.name}</td>
                      <td className="px-4 py-2.5">{formatDate(r.start_date)} → {formatDate(r.end_date)}</td>
                      <td className="px-4 py-2.5">{r.days}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(r.applied_at)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.status ?? 'pending'} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          {r.status === 'pending' ? (
                            <>
                              <Button size="sm" variant="success" onClick={() => review.mutate({ id: r.id, status: 'approved' })} disabled={review.isPending}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: r.id, status: 'rejected' })} disabled={review.isPending}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : r.status === 'cancelled' ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{r.admin_comment ? 'See comment' : '—'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={requests.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

function EmployeeLeave() {
  const { employee } = useAuth()
  const { data: types = [] } = useLeaveTypes()
  const { data: requests = [], isLoading } = useLeaveRequests({ employeeId: employee?.id })
  const apply = useApplyLeave()
  const cancel = useCancelLeave()

  const [dialog, setDialog] = useState(false)
  const [typeId, setTypeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')

  if (!employee) return null

  const days = start && end ? daysBetween(start, end) : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typeId || !start || !end) return
    await apply.mutateAsync({ employee_id: employee.id, leave_type_id: typeId, start_date: start, end_date: end, days, reason })
    setDialog(false)
    setTypeId(''); setStart(''); setEnd(''); setReason('')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">My Leave Requests</CardTitle>
              <Button onClick={() => setDialog(true)}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Apply Leave
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton rows={4} />
              ) : requests.length === 0 ? (
                <EmptyState title="No leave requests" description="Apply for leave using the button above." icon={CalendarClock} />
              ) : (
                <div className="divide-y">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{r.leave_type?.name} · {r.days} day{r.days > 1 ? 's' : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.start_date)} → {formatDate(r.end_date)}
                        </p>
                        {r.reason && <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={r.status ?? 'pending'} />
                        {r.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => cancel.mutate(r.id)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Leave Balances</CardTitle></CardHeader>
          <CardContent><LeaveBalances employeeId={employee.id} /></CardContent>
        </Card>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Choose a leave type and dates.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Leave type *</Label>
              <Select value={typeId || undefined} onValueChange={setTypeId}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}{t.is_paid ? ' (Paid)' : ' (Unpaid)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date *</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>End date *</Label>
                <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
            {days > 0 && <p className="text-xs text-muted-foreground">{days} day{days > 1 ? 's' : ''} will be requested.</p>}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={apply.isPending}>
                {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LeavePage() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader title="Leave Management" description={isManager ? 'Review and manage leave requests.' : 'Apply for leave and track your balances.'} />
      {isManager ? (
        <Tabs defaultValue="requests">
          <TabsList><TabsTrigger value="requests">Requests</TabsTrigger></TabsList>
          <TabsContent value="requests" className="mt-4"><ManagerLeave /></TabsContent>
        </Tabs>
      ) : (
        <EmployeeLeave />
      )}
    </div>
  )
}
