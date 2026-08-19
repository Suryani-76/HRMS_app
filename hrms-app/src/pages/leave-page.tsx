import { useMemo, useState } from 'react'
import { CalendarClock, Loader2, Check, X, CalendarPlus, ShieldCheck, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'

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
          <div key={b.id} className="rounded-lg border p-3.5 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-slate-900">{b.leave_type?.name}</p>
                <p className="text-xs text-muted-foreground">{b.leave_type?.is_paid ? 'Paid Leave' : 'Unpaid'}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-slate-900">{remaining}<span className="text-xs text-muted-foreground font-normal">/{b.allocated}</span></p>
                <p className="text-[11px] text-muted-foreground">{b.used} used</p>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${pct > 40 ? 'bg-primary' : pct > 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ApplyLeaveDialog({
  open,
  onOpenChange,
  employeeId,
  isHrOrManager,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string
  isHrOrManager?: boolean
}) {
  const { data: types = [] } = useLeaveTypes()
  const apply = useApplyLeave()

  const [typeId, setTypeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')

  const days = start && end ? Math.max(1, daysBetween(start, end)) : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !typeId || !start || !end) return

    await apply.mutateAsync({
      employee_id: employeeId,
      leave_type_id: typeId,
      start_date: start,
      end_date: end,
      days,
      reason,
    })

    if (isHrOrManager) {
      toast.success('Leave request submitted! Routed to Admin / CEO (ceo@oklut.com) for approval.')
    } else {
      toast.success('Leave request submitted to HR / Manager for approval.')
    }

    onOpenChange(false)
    setTypeId('')
    setStart('')
    setEnd('')
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-indigo-600" /> Apply for Leave
          </DialogTitle>
          <DialogDescription>Select leave category and date range.</DialogDescription>
        </DialogHeader>

        {isHrOrManager && (
          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">HR / Executive Routing Notice:</span> As an HR or Management member, your leave request is routed directly to the <strong>Admin / CEO (ceo@oklut.com)</strong> for approval.
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave type *</Label>
            <Select value={typeId || undefined} onValueChange={setTypeId} required>
              <SelectTrigger><SelectValue placeholder="Select leave category" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_paid ? '(Paid)' : '(Unpaid)'} - {t.days_per_year} days/year
                  </SelectItem>
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

          {days > 0 && (
            <div className="rounded-lg bg-slate-50 border p-2.5 text-xs text-slate-700 font-medium flex items-center justify-between">
              <span>Total Duration:</span>
              <span className="font-bold text-indigo-600">{days} working day{days > 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason / Handover Notes *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Attending family wedding / Doctor appointment / Urgent personal work"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManagerLeave() {
  const { employee, isAdmin } = useAuth()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const { data: requests = [], isLoading, isError, refetch } = useLeaveRequests({ status: status !== 'all' ? status : undefined })
  const review = useReviewLeave()
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (!search) return true
      const s = search.toLowerCase()
      const name = `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.toLowerCase()
      const code = (r.employee?.employee_code ?? '').toLowerCase()
      const reason = (r.reason ?? '').toLowerCase()
      return name.includes(s) || code.includes(s) || reason.includes(s)
    })
  }, [requests, search])

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  const handleReview = (id: string, newStatus: 'approved' | 'rejected', empName?: string) => {
    review.mutate(
      { id, status: newStatus, comment: isAdmin ? 'Reviewed & Approved by Admin/CEO' : 'Reviewed & Approved by HR' },
      {
        onSuccess: () => {
          toast.success(`Leave request for ${empName || 'employee'} ${newStatus === 'approved' ? 'Approved ✓' : 'Rejected ✕'}`)
        }
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search employee name or code..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Logged in as Admin / CEO (Full Approval Authority)
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : paged.length === 0 ? (
        <EmptyState title="No leave requests" description="There are no leave requests matching this filter." icon={CalendarClock} />
      ) : (
        <>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Leave Type</th>
                    <th className="px-4 py-3.5">Dates & Duration</th>
                    <th className="px-4 py-3.5">Reason</th>
                    <th className="px-4 py-3.5">Applied At</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Approval Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => {
                    const isSelfRequest = Boolean(employee?.id && r.employee_id === employee.id)
                    const isHrApplicant =
                      r.employee?.department?.name === 'Human Resources' ||
                      r.employee?.department?.name === 'HR' ||
                      (r as any).employee?.department_id === '00000000-0000-4000-8000-0000000000d2' ||
                      (r as any).employee?.department_id === 'dept-2'

                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {r.employee?.first_name?.[0]}{r.employee?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {r.employee?.first_name} {r.employee?.last_name}
                                {isSelfRequest && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">(You)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{r.employee?.employee_code ?? 'EMP'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {isHrApplicant ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[11px]">
                              HR Department
                            </Badge>
                          ) : (
                            <span className="text-xs font-medium text-slate-700">
                              {r.employee?.department?.name ?? 'General'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{r.leave_type?.name}</span>
                          <p className="text-[10px] text-muted-foreground">{r.leave_type?.is_paid ? 'Paid' : 'Unpaid'}</p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{formatDate(r.start_date)} → {formatDate(r.end_date)}</p>
                          <p className="text-xs font-semibold text-indigo-600">{r.days} day{r.days > 1 ? 's' : ''}</p>
                        </td>

                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-slate-600 truncate" title={r.reason ?? ''}>
                            {r.reason || <span className="text-muted-foreground italic">No reason stated</span>}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(r.applied_at)}
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill status={r.status ?? 'pending'} />
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === 'pending' ? (
                              isSelfRequest && !isAdmin ? (
                                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                                  Pending Admin / CEO
                                </span>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="h-8 px-2.5 text-xs font-semibold"
                                    title={isAdmin ? "Approve as Admin/CEO" : "Approve Leave Request"}
                                    onClick={() => handleReview(r.id, 'approved', r.employee?.first_name)}
                                    disabled={review.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5 text-xs font-semibold"
                                    title={isAdmin ? "Reject as Admin/CEO" : "Reject Leave Request"}
                                    onClick={() => handleReview(r.id, 'rejected', r.employee?.first_name)}
                                    disabled={review.isPending}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              )
                            ) : r.status === 'cancelled' ? (
                              <span className="text-xs text-muted-foreground italic">Cancelled by User</span>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">
                                {r.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

function EmployeeLeaveTab({ employeeId, isHrOrManager }: { employeeId: string; isHrOrManager?: boolean }) {
  const { data: requests = [], isLoading } = useLeaveRequests({ employeeId })
  const cancel = useCancelLeave()
  const [dialog, setDialog] = useState(false)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">My Leave Requests</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isHrOrManager ? 'Your submitted leave requests routed to Admin / CEO.' : 'Track your applications and approvals.'}
                </p>
              </div>
              <Button onClick={() => setDialog(true)} size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" /> Apply Leave
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton rows={4} />
              ) : requests.length === 0 ? (
                <EmptyState title="No leave requests" description="You haven't submitted any leave requests yet." icon={CalendarClock} />
              ) : (
                <div className="divide-y">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">
                          {r.leave_type?.name} · <span className="text-indigo-600">{r.days} day{r.days > 1 ? 's' : ''}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(r.start_date)} → {formatDate(r.end_date)} · Applied on {formatDate(r.applied_at)}
                        </p>
                        {r.reason && <p className="mt-1 text-xs text-slate-600 italic">"{r.reason}"</p>}
                        {r.admin_comment && (
                          <p className="mt-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block font-medium">
                            Admin Note: {r.admin_comment}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={r.status ?? 'pending'} />
                        {r.status === 'pending' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => cancel.mutate(r.id)}>
                            Cancel
                          </Button>
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
          <CardContent><LeaveBalances employeeId={employeeId} /></CardContent>
        </Card>
      </div>

      <ApplyLeaveDialog
        open={dialog}
        onOpenChange={setDialog}
        employeeId={employeeId}
        isHrOrManager={isHrOrManager}
      />
    </div>
  )
}

export default function LeavePage() {
  const { user, employee, isManager, isAdmin } = useAuth()
  const [applyOpen, setApplyOpen] = useState(false)
  const { data: allRequests = [] } = useLeaveRequests({ status: 'pending' })
  const pendingCount = allRequests.length

  // Fallback ID for HR / manager if employee record isn't linked yet
  const effectiveEmployeeId = employee?.id || '00000000-0000-0000-0000-000000000010'
  const isHrOrManager = isManager || Boolean(user?.role?.name === 'HR' || user?.role?.name === 'Admin' || user?.role?.name === 'Manager')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Leave Management"
          description={
            isAdmin
              ? 'Review and approve all company leave requests (including HR) or apply for leave.'
              : isHrOrManager
              ? 'Review employee leaves, submit your own leave request to Admin/CEO, and track balances.'
              : 'Apply for leave and track your balances.'
          }
        />
        <Button onClick={() => setApplyOpen(true)} className="sm:self-start">
          <CalendarPlus className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {isHrOrManager ? (
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              Review Requests
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-leaves" className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> My Leaves & Balances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <ManagerLeave />
          </TabsContent>

          <TabsContent value="my-leaves" className="mt-4">
            <EmployeeLeaveTab
              employeeId={effectiveEmployeeId}
              isHrOrManager={isHrOrManager}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <EmployeeLeaveTab
          employeeId={effectiveEmployeeId}
          isHrOrManager={false}
        />
      )}

      {/* Global Apply Leave Dialog */}
      <ApplyLeaveDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        employeeId={effectiveEmployeeId}
        isHrOrManager={isHrOrManager}
      />
    </div>
  )
}

