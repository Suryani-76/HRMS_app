import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2,
  Banknote,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  Eye,
  Search,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import {
  usePayroll,
  usePayrollProfiles,
  useGeneratePayroll,
  useUpdatePayrollStatus,
  useClearPayroll,
  useDeletePayrollRow,
} from '@/hooks/use-queries'
import { formatCurrency, currentPayPeriod, monthName } from '@/lib/format'
import { downloadPayslipPdf } from '@/lib/payslip-pdf'
import { PayslipDocumentSheet } from '@/components/payroll/payslip-document-sheet'
import type { Payroll, PayrollProfile } from '@/lib/database.types'

function ProfileEditor({
  profile,
  open,
  onOpenChange,
}: {
  profile: PayrollProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    basic_salary: String(profile.basic_salary ?? 0),
    hra: String(profile.hra ?? 0),
    allowances: String(profile.allowances ?? 0),
    bonus: String(profile.bonus ?? 0),
    pf_percent: String(profile.pf_percent ?? 12),
    tax_percent: String(profile.tax_percent ?? 10),
    bank_name: profile.bank_name ?? '',
    bank_account: profile.bank_account ?? '',
    ifsc_code: profile.ifsc_code ?? '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('payroll_profiles')
      .upsert({
        employee_id: profile.employee_id,
        basic_salary: Number(form.basic_salary) || 0,
        hra: Number(form.hra) || 0,
        allowances: Number(form.allowances) || 0,
        bonus: Number(form.bonus) || 0,
        pf_percent: Number(form.pf_percent) || 0,
        tax_percent: Number(form.tax_percent) || 0,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        ifsc_code: form.ifsc_code || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    // Mirror to employees table for full schema synchrony (best-effort)
    try {
      await supabase.from('employees').update({
        basic_salary: Number(form.basic_salary) || 0,
        hra: Number(form.hra) || 0,
        allowances: Number(form.allowances) || 0,
        bonus: Number(form.bonus) || 0,
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account || null,
        ifsc_code: form.ifsc_code || null,
      }).eq('id', profile.employee_id)
    } catch {
      // Silently ignore - employees table mirror sync is best-effort
    }

    toast.success('Payroll profile updated successfully')
    qc.invalidateQueries({ queryKey: queryKeys.payrollProfiles })
    qc.invalidateQueries({ queryKey: queryKeys.employees })
    qc.invalidateQueries({ queryKey: queryKeys.payroll })
    onOpenChange(false)
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Payroll Profile</DialogTitle>
          <DialogDescription>
            {profile.employee?.first_name} {profile.employee?.last_name} — {profile.employee?.employee_code}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Basic salary</Label>
              <Input type="number" value={form.basic_salary} onChange={set('basic_salary')} />
            </div>
            <div className="space-y-2">
              <Label>HRA</Label>
              <Input type="number" value={form.hra} onChange={set('hra')} />
            </div>
            <div className="space-y-2">
              <Label>Allowances</Label>
              <Input type="number" value={form.allowances} onChange={set('allowances')} />
            </div>
            <div className="space-y-2">
              <Label>Bonus</Label>
              <Input type="number" value={form.bonus} onChange={set('bonus')} />
            </div>
            <div className="space-y-2">
              <Label>PF %</Label>
              <Input type="number" value={form.pf_percent} onChange={set('pf_percent')} />
            </div>
            <div className="space-y-2">
              <Label>Tax %</Label>
              <Input type="number" value={form.tax_percent} onChange={set('tax_percent')} />
            </div>
            <div className="space-y-2">
              <Label>Bank name</Label>
              <Input value={form.bank_name} onChange={set('bank_name')} />
            </div>
            <div className="space-y-2">
              <Label>Account no.</Label>
              <Input value={form.bank_account} onChange={set('bank_account')} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>IFSC</Label>
              <Input value={form.ifsc_code} onChange={set('ifsc_code')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPayPeriod())
  const [searchQuery, setSearchQuery] = useState('')
  const { data: payroll = [], isLoading, isError, refetch } = usePayroll(period)
  const { data: profiles = [] } = usePayrollProfiles()
  const generate = useGeneratePayroll()
  const updateStatus = useUpdatePayrollStatus()
  const clearPayrollMutation = useClearPayroll()
  const deleteRowMutation = useDeletePayrollRow()

  const [editing, setEditing] = useState<PayrollProfile | null>(null)
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<Payroll | null>(null)

  // Current month's payroll rows
  const periodPayroll = useMemo(() => payroll.filter((p) => p.pay_period === period), [payroll, period])

  // Filtered payroll rows matching the search bar at the top
  const filteredPayroll = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return periodPayroll
    return periodPayroll.filter((p) => {
      const fullName = `${p.employee?.first_name || ''} ${p.employee?.last_name || ''}`.toLowerCase()
      const code = (p.employee?.employee_code || '').toLowerCase()
      const dept = ((p.employee?.department as any)?.name || '').toLowerCase()
      const desig = ((p.employee?.designation as any)?.name || '').toLowerCase()
      return fullName.includes(q) || code.includes(q) || dept.includes(q) || desig.includes(q)
    })
  }, [periodPayroll, searchQuery])

  // Filtered payroll profiles matching the search bar
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => {
      const fullName = `${p.employee?.first_name || ''} ${p.employee?.last_name || ''}`.toLowerCase()
      const code = (p.employee?.employee_code || '').toLowerCase()
      const dept = ((p.employee?.department as any)?.name || '').toLowerCase()
      const desig = ((p.employee?.designation as any)?.name || '').toLowerCase()
      return fullName.includes(q) || code.includes(q) || dept.includes(q) || desig.includes(q)
    })
  }, [profiles, searchQuery])

  const totals = useMemo(() => {
    const gross = periodPayroll.reduce((s, p) => s + p.basic_salary + p.hra + p.allowances + p.bonus, 0)
    const deductions = periodPayroll.reduce((s, p) => s + p.deductions + p.tax + p.provident_fund, 0)
    const net = periodPayroll.reduce((s, p) => s + p.net_salary, 0)
    return { gross, deductions, net, count: periodPayroll.length }
  }, [periodPayroll])

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={`Processing payroll for ${monthName(period)}.`}
        actions={
          <div className="flex items-center gap-2">
            {periodPayroll.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setConfirmClear(true)}
                disabled={clearPayrollMutation.isPending}
                className="gap-1.5"
              >
                {clearPayrollMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clear Payroll
              </Button>
            )}
            <Button onClick={() => setConfirmGenerate(true)} disabled={generate.isPending} className="gap-1.5">
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
          </div>
        }
      />

      {/* Top Search & Filter Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Employee Search Bar at the Top */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search employee by name, code, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="sm:w-44"
          />

          {searchQuery && (
            <Badge variant="outline" className="h-9 px-3 text-xs">
              Showing {filteredPayroll.length} of {periodPayroll.length}
            </Badge>
          )}
        </div>

        {periodPayroll.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmClear(true)}
            disabled={clearPayrollMutation.isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear Month Payroll
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Gross payroll</p>
            <p className="text-xl font-semibold">{formatCurrency(totals.gross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total deductions</p>
            <p className="text-xl font-semibold text-destructive">{formatCurrency(totals.deductions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Net payable</p>
            <p className="text-xl font-semibold text-success">{formatCurrency(totals.net)}</p>
          </CardContent>
        </Card>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : periodPayroll.length === 0 ? (
        <EmptyState
          title={`No payroll for ${monthName(period)}`}
          description="Click 'Generate Payroll' to compute salaries for this period."
          icon={Banknote}
        >
          <Button onClick={() => setConfirmGenerate(true)} disabled={generate.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" /> Generate now
          </Button>
        </EmptyState>
      ) : filteredPayroll.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No employees found matching "{searchQuery}"</p>
          <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="mt-2">
            Clear search filter
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Basic</th>
                  <th className="px-4 py-3">HRA</th>
                  <th className="px-4 py-3">Allow.</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net salary</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">
                        {p.employee?.first_name} {p.employee?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.employee?.employee_code}</p>
                    </td>
                    <td className="px-4 py-2.5">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.hra)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.allowances)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.bonus)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.deductions + p.tax + p.provident_fund)}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatCurrency(p.net_salary)}</td>
                    <td className="px-4 py-2.5">
                      {p.present_days}/{p.total_days}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={p.status ?? 'draft'} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="View Official Payslip"
                          onClick={() => setSelectedPayslip(p)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700"
                          title="Download PDF Payslip"
                          onClick={() => downloadPayslipPdf(p)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {p.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => updateStatus.mutate({ id: p.id, status: 'paid' })}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Mark paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete this payroll record"
                          onClick={() => {
                            if (confirm(`Delete payroll record for ${p.employee?.first_name} ${p.employee?.last_name}?`)) {
                              deleteRowMutation.mutate(p.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PayslipDocumentSheet
        payroll={selectedPayslip}
        open={!!selectedPayslip}
        onOpenChange={(o) => !o && setSelectedPayslip(null)}
      />

      {/* Payroll Profiles Management Section */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Payroll Profiles ({filteredProfiles.length})</h2>
          {searchQuery && (
            <span className="text-xs text-muted-foreground">Filtered by: "{searchQuery}"</span>
          )}
        </div>
        {profiles.length === 0 ? (
          <EmptyState
            title="No payroll profiles"
            description="Profiles are auto-created when employees are added with salary details."
          />
        ) : filteredProfiles.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No payroll profiles match "{searchQuery}"
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Basic</th>
                    <th className="px-4 py-3">HRA</th>
                    <th className="px-4 py-3">Allowances</th>
                    <th className="px-4 py-3">PF %</th>
                    <th className="px-4 py-3">Tax %</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((p) => (
                    <tr key={p.employee_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">
                          {p.employee?.first_name} {p.employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.employee?.employee_code}</p>
                      </td>
                      <td className="px-4 py-2.5">{formatCurrency(p.basic_salary)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(p.hra)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(p.allowances)}</td>
                      <td className="px-4 py-2.5">{p.pf_percent ?? 0}%</td>
                      <td className="px-4 py-2.5">{p.tax_percent ?? 0}%</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                          <Plus className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editing && <ProfileEditor profile={editing} open onOpenChange={(o) => !o && setEditing(null)} />}

      {/* Confirmation Dialog: Generate Payroll */}
      <Dialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate payroll for {monthName(period)}?</DialogTitle>
            <DialogDescription>
              This will compute salaries for {profiles.length} employee profile(s) based on attendance and leave for
              the period. Existing payroll rows will be updated with calculated figures.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmGenerate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmGenerate(false)
                generate.mutate(period)
              }}
              disabled={generate.isPending}
            >
              {generate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Clear Payroll */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="h-5 w-5" />
              <span>Clear Generated Payroll</span>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to clear the generated payroll? This will remove all calculated payroll records
              from the database so you can start fresh and recalculate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 border-destructive/40"
              onClick={() => {
                setConfirmClear(false)
                clearPayrollMutation.mutate(undefined)
              }}
              disabled={clearPayrollMutation.isPending}
            >
              Clear All Months
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmClear(false)
                clearPayrollMutation.mutate(period)
              }}
              disabled={clearPayrollMutation.isPending}
            >
              {clearPayrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Clear {monthName(period)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
