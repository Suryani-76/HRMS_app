import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth/auth-context'
import type { RecruiterIncentive, UserProfile, Employee } from '@/lib/database.types'
import { TableSkeleton } from '@/components/shared/skeletons'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Award,
  PlusCircle,
  TrendingUp,
  Gift,
  Coins,
  Briefcase,
  Users,
  Pencil,
  Trash2,
  Calendar,
  Search,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { initials } from '@/lib/utils'
import { toast } from 'sonner'
import { useEmployees } from '@/hooks/use-queries'

interface EnrichedIncentive extends RecruiterIncentive {
  recruiter?: (UserProfile & { employee?: Employee | null }) | null
  employee_snapshot?: Employee | null
}

export default function IncentivesDashboardPage() {
  const { isManager, isAdmin, isHR } = useAuth()
  const canManage = isManager || isAdmin || isHR
  const { data: employees = [], isLoading: employeesLoading } = useEmployees()

  const [incentives, setIncentives] = useState<EnrichedIncentive[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all')

  // Add / Edit Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIncentive, setEditingIncentive] = useState<EnrichedIncentive | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [itHires, setItHires] = useState<number>(0)
  const [nonItHires, setNonItHires] = useState<number>(0)
  const [salaryBonus, setSalaryBonus] = useState<number>(0)
  const [giftPoints, setGiftPoints] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  // Load incentives data
  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('recruiter_incentives')
        .select('*, recruiter:users(*, employee:employees(*))')
        .order('month', { ascending: false })

      if (!error && data) {
        // Enrich any missing employee details from the employees cache
        const enriched: EnrichedIncentive[] = data.map((inc: any) => {
          let emp = inc.recruiter?.employee
          if (!emp && employees.length > 0) {
            emp = employees.find(
              (e) =>
                e.user_id === inc.recruiter_id ||
                e.id === inc.recruiter_id ||
                (inc.recruiter?.email && e.email?.toLowerCase() === inc.recruiter.email.toLowerCase())
            )
          }
          return {
            ...inc,
            employee_snapshot: emp || null,
          }
        })
        setIncentives(enriched)
      }
    } catch (err) {
      console.error('Failed to load incentives:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [employees])

  // Recalculate suggested bonus & points when IT or Non-IT hires change (if not in edit mode with existing custom values)
  const handleItHiresChange = (val: number) => {
    setItHires(val)
    if (!editingIncentive) {
      setSalaryBonus(val * 5000 + nonItHires * 3000)
      setGiftPoints(val * 100 + nonItHires * 50)
    }
  }

  const handleNonItHiresChange = (val: number) => {
    setNonItHires(val)
    if (!editingIncentive) {
      setSalaryBonus(itHires * 5000 + val * 3000)
      setGiftPoints(itHires * 100 + val * 50)
    }
  }

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingIncentive(null)
    setSelectedEmployeeId(employees[0]?.id || '')
    const d = new Date()
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setItHires(0)
    setNonItHires(0)
    setSalaryBonus(0)
    setGiftPoints(0)
    setDialogOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (inc: EnrichedIncentive) => {
    setEditingIncentive(inc)
    const matchingEmp = employees.find(
      (e) =>
        e.user_id === inc.recruiter_id ||
        e.id === inc.recruiter_id ||
        e.email?.toLowerCase() === inc.recruiter?.email?.toLowerCase()
    )
    setSelectedEmployeeId(matchingEmp?.id || inc.recruiter_id)
    setMonth(inc.month || '')
    setItHires(inc.it_hires || 0)
    setNonItHires(inc.non_it_hires || 0)
    setSalaryBonus(Number(inc.salary_bonus) || 0)
    setGiftPoints(inc.gift_points || 0)
    setDialogOpen(true)
  }

  // Delete incentive
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incentive record?')) return
    try {
      const { error } = await supabase.from('recruiter_incentives').delete().eq('id', id)
      if (error) throw error
      toast.success('Incentive record deleted successfully')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete incentive')
    }
  }

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployeeId) {
      toast.error('Please select an employee/recruiter')
      return
    }
    if (!month.trim()) {
      toast.error('Please enter a month (YYYY-MM)')
      return
    }

    setSaving(true)
    try {
      const selectedEmp = employees.find((e) => e.id === selectedEmployeeId)

      // Resolve a valid user_id foreign key for recruiter_incentives
      let targetUserId = selectedEmp?.user_id
      if (!targetUserId && selectedEmp) {
        // Query users table for matching email or id
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedEmp.email.toLowerCase())
          .maybeSingle()
        if (u?.id) {
          targetUserId = u.id
        } else {
          // Fallback: create a user row
          const fallbackId = selectedEmp.id
          await supabase.from('users').upsert(
            {
              id: fallbackId,
              email: selectedEmp.email.toLowerCase(),
              employee_id: selectedEmp.id,
              status: 'Active',
            },
            { onConflict: 'id' }
          )
          targetUserId = fallbackId
        }
      }

      if (!targetUserId) {
        targetUserId = selectedEmployeeId
      }

      const payload: any = {
        recruiter_id: targetUserId,
        month: month.trim(),
        it_hires: Number(itHires) || 0,
        non_it_hires: Number(nonItHires) || 0,
        salary_bonus: Number(salaryBonus) || 0,
        gift_points: Number(giftPoints) || 0,
      }

      if (editingIncentive?.id) {
        payload.id = editingIncentive.id
      }

      const { error } = await supabase
        .from('recruiter_incentives')
        .upsert(payload, { onConflict: editingIncentive ? 'id' : undefined })

      if (error) throw error

      toast.success(editingIncentive ? 'Incentive updated successfully' : 'Incentive created successfully')
      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Save incentive error:', err)
      toast.error(err?.message || 'Failed to save incentive')
    } finally {
      setSaving(false)
    }
  }

  // Unique months for filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    incentives.forEach((inc) => {
      if (inc.month) set.add(inc.month)
    })
    return Array.from(set).sort().reverse()
  }, [incentives])

  // Filtered incentives
  const filteredIncentives = useMemo(() => {
    return incentives.filter((inc) => {
      const matchesMonth = selectedMonthFilter === 'all' || inc.month === selectedMonthFilter
      const emp = inc.employee_snapshot
      const fullName = emp ? `${emp.first_name} ${emp.last_name}` : inc.recruiter?.email || ''
      const code = emp?.employee_code || ''
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        fullName.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        (inc.recruiter?.email || '').toLowerCase().includes(q) ||
        (inc.month || '').toLowerCase().includes(q)
      return matchesMonth && matchesSearch
    })
  }, [incentives, selectedMonthFilter, searchQuery])

  // Summary Metrics
  const summary = useMemo(() => {
    return incentives.reduce(
      (acc, cur) => {
        acc.totalBonus += Number(cur.salary_bonus) || 0
        acc.totalPoints += Number(cur.gift_points) || 0
        acc.totalItHires += Number(cur.it_hires) || 0
        acc.totalNonItHires += Number(cur.non_it_hires) || 0
        return acc
      },
      { totalBonus: 0, totalPoints: 0, totalItHires: 0, totalNonItHires: 0 }
    )
  }, [incentives])

  if (!canManage) {
    return (
      <PageHeader
        title="Incentives"
        description="Only managers and HR administrators can view the incentives dashboard."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Incentive Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Recruiter Incentives"
          description="Track monthly hiring achievements, candidate placements, and bonus incentives."
        />
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Add Incentive
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Bonus Disbursed
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(summary.totalBonus)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-500/20 bg-purple-50/40 dark:bg-purple-950/10 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Points Earned
              </p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {summary.totalPoints.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 flex items-center justify-center">
              <Gift className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/10 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                IT Placements
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {summary.totalItHires}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/10 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Non-IT Placements
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {summary.totalNonItHires}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recruiter or month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Month:
          </Label>
          <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredIncentives.length === 0 ? (
        <EmptyState
          title="No incentives records found"
          description={
            searchQuery || selectedMonthFilter !== 'all'
              ? 'No incentives match the selected filters.'
              : 'Add your first recruiter incentive record to start tracking.'
          }
          icon={Award}
          action={
            <Button onClick={handleOpenCreate} size="sm" className="gap-2 mt-2">
              <PlusCircle className="h-4 w-4" />
              Add Incentive
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3.5">Month</th>
                  <th className="px-4 py-3.5">Recruiter / Employee</th>
                  <th className="px-4 py-3.5 text-center">IT Hires</th>
                  <th className="px-4 py-3.5 text-center">Non-IT Hires</th>
                  <th className="px-4 py-3.5 text-right">Points Earned</th>
                  <th className="px-4 py-3.5 text-right">Salary Bonus</th>
                  <th className="px-4 py-3.5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredIncentives.map((inc) => {
                  const emp = inc.employee_snapshot
                  const displayName = emp
                    ? `${emp.first_name} ${emp.last_name}`
                    : inc.recruiter?.email || 'Recruiter'
                  const code = emp?.employee_code || ''
                  const email = emp?.email || inc.recruiter?.email || ''

                  return (
                    <tr key={inc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted font-mono text-[11px]">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {inc.month}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 text-xs">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                              {emp ? initials(emp.first_name, emp.last_name) : 'RC'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-xs leading-none text-foreground">
                              {displayName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                              {code && <span className="font-mono">{code}</span>}
                              {code && email && <span>•</span>}
                              {email && <span className="truncate max-w-[180px]">{email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className="bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs"
                        >
                          {inc.it_hires} Hires
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className="bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs"
                        >
                          {inc.non_it_hires} Hires
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50 font-bold text-xs">
                          <Gift className="h-3 w-3 text-amber-600" />
                          {inc.gift_points} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          {formatCurrency(inc.salary_bonus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(inc)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit Incentive"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(inc.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Incentive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Incentive Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {editingIncentive ? 'Edit Recruiter Incentive' : 'Add New Recruiter Incentive'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record monthly candidate placements, IT/Non-IT recruitment count, and incentives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Recruiter / Employee Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Recruiter / Employee *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
                disabled={employeesLoading}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.first_name} {emp.last_name}{' '}
                      {emp.employee_code ? `(${emp.employee_code})` : ''} - {emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Incentive Month (YYYY-MM) *</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            {/* IT & Non-IT Hires side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  IT Hires
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={itHires}
                  onChange={(e) => handleItHiresChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-xs h-9 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Non-IT Hires
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={nonItHires}
                  onChange={(e) => handleNonItHiresChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-xs h-9 font-semibold"
                />
              </div>
            </div>

            {/* Salary Bonus & Gift Points */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Salary Bonus (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={salaryBonus}
                  onChange={(e) => setSalaryBonus(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="text-xs h-9 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Gift / Reward Points
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={giftPoints}
                  onChange={(e) => setGiftPoints(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-xs h-9 font-semibold"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {saving ? 'Saving...' : editingIncentive ? 'Update Incentive' : 'Add Incentive'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
