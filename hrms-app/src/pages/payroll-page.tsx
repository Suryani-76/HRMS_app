import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Banknote, Plus, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { usePayroll, usePayrollProfiles, useGeneratePayroll, useUpdatePayrollStatus } from '@/hooks/use-queries'
import { formatCurrency, currentPayPeriod, monthName } from '@/lib/format'
import type { PayrollProfile } from '@/lib/database.types'

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
    toast.success('Payroll profile updated')
    qc.invalidateQueries({ queryKey: queryKeys.payrollProfiles })
    onOpenChange(false)
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

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
            <div className="space-y-2"><Label>Basic salary</Label><Input type="number" value={form.basic_salary} onChange={set('basic_salary')} /></div>
            <div className="space-y-2"><Label>HRA</Label><Input type="number" value={form.hra} onChange={set('hra')} /></div>
            <div className="space-y-2"><Label>Allowances</Label><Input type="number" value={form.allowances} onChange={set('allowances')} /></div>
            <div className="space-y-2"><Label>Bonus</Label><Input type="number" value={form.bonus} onChange={set('bonus')} /></div>
            <div className="space-y-2"><Label>PF %</Label><Input type="number" value={form.pf_percent} onChange={set('pf_percent')} /></div>
            <div className="space-y-2"><Label>Tax %</Label><Input type="number" value={form.tax_percent} onChange={set('tax_percent')} /></div>
            <div className="space-y-2"><Label>Bank name</Label><Input value={form.bank_name} onChange={set('bank_name')} /></div>
            <div className="space-y-2"><Label>Account no.</Label><Input value={form.bank_account} onChange={set('bank_account')} /></div>
            <div className="space-y-2 col-span-2"><Label>IFSC</Label><Input value={form.ifsc_code} onChange={set('ifsc_code')} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPayPeriod())
  const { data: payroll = [], isLoading, isError, refetch } = usePayroll(period)
  const { data: profiles = [] } = usePayrollProfiles()
  const generate = useGeneratePayroll()
  const updateStatus = useUpdatePayrollStatus()
  const [editing, setEditing] = useState<PayrollProfile | null>(null)
  const [confirmGenerate, setConfirmGenerate] = useState(false)

  const periodPayroll = useMemo(() => payroll.filter((p) => p.pay_period === period), [payroll, period])
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
          <Button onClick={() => setConfirmGenerate(true)} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Generate Payroll
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-44" />
        {profiles.length === 0 && <span className="text-sm text-muted-foreground">No payroll profiles found. Add employees with salary details.</span>}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Gross payroll</p><p className="text-xl font-semibold">{formatCurrency(totals.gross)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total deductions</p><p className="text-xl font-semibold text-destructive">{formatCurrency(totals.deductions)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Net payable</p><p className="text-xl font-semibold text-success">{formatCurrency(totals.net)}</p></CardContent></Card>
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
                {periodPayroll.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{p.employee?.first_name} {p.employee?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{p.employee?.employee_code}</p>
                    </td>
                    <td className="px-4 py-2.5">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.hra)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.allowances)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.bonus)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(p.deductions + p.tax + p.provident_fund)}</td>
                    <td className="px-4 py-2.5 font-semibold">{formatCurrency(p.net_salary)}</td>
                    <td className="px-4 py-2.5">{p.present_days}/{p.total_days}</td>
                    <td className="px-4 py-2.5"><StatusPill status={p.status ?? 'draft'} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {p.status !== 'paid' && (
                          <Button size="sm" variant="success" onClick={() => updateStatus.mutate({ id: p.id, status: 'paid' })} disabled={updateStatus.isPending}>
                            <CheckCircle2 className="h-4 w-4" /> Mark paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Payroll Profiles</h2>
        {profiles.length === 0 ? (
          <EmptyState title="No payroll profiles" description="Profiles are auto-created when employees are added with salary details." />
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
                  {profiles.map((p) => (
                    <tr key={p.employee_id} className="border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{p.employee?.first_name} {p.employee?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.employee?.employee_code}</p>
                      </td>
                      <td className="px-4 py-2.5">{formatCurrency(p.basic_salary)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(p.hra)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(p.allowances)}</td>
                      <td className="px-4 py-2.5">{p.pf_percent ?? 0}%</td>
                      <td className="px-4 py-2.5">{p.tax_percent ?? 0}%</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                          <Plus className="h-4 w-4" /> Edit
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

      <Dialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate payroll for {monthName(period)}?</DialogTitle>
            <DialogDescription>
              This will compute salaries for {profiles.length} employee profile(s) based on attendance and leave for the period. Existing payroll rows will be updated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
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
    </div>
  )
}
