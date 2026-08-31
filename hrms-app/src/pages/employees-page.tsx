import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, UserPlus, UserX, Users, Trash2, Loader2,
  AlertTriangle, SlidersHorizontal, RotateCcw, Download,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import {
  useEmployees, useDepartments, useDesignations,
  useDeleteEmployeeByIdOrCode, useDeleteEmployee,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 15

// ISO 3166-1 country list with dial code context — production-grade list
const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'Remote', name: 'Remote / Worldwide', flag: '🌐' },
]

function normalizeEmploymentType(type?: string | null): string {
  if (!type) return 'full_time'
  const clean = type.toLowerCase().replace(/[\s\-_]/g, '')
  if (clean.includes('part')) return 'part_time'
  if (clean.includes('intern')) return 'intern'
  if (clean.includes('contract')) return 'contract'
  if (clean.includes('probation')) return 'probation'
  if (clean.includes('full')) return 'full_time'
  return clean
}

const EMPLOYMENT_TYPES: { value: string; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'probation', label: 'Probation' },
]

const STATUS_OPTIONS = ['Active', 'Inactive', 'On Leave', 'Terminated', 'Probation']

export default function EmployeesPage() {
  const { isManager } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Filter state ─────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('all')
  const [designationId, setDesignationId] = useState('all')
  const [countryCode, setCountryCode] = useState('all')
  const [employmentType, setEmploymentType] = useState('all')
  const [status, setStatus] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  // ── Dialog state ──────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [initialConversionValues, setInitialConversionValues] = useState<Record<string, any> | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeIdInput, setEmployeeIdInput] = useState('')

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      const name = searchParams.get('name') || ''
      const email = searchParams.get('email') || ''
      const phone = searchParams.get('phone') || ''
      const role = searchParams.get('role') || ''
      const dob = searchParams.get('dob') || ''
      const deptId = searchParams.get('deptId') || ''
      const salary = searchParams.get('salary') || ''

      setInitialConversionValues({
        name,
        email,
        phone,
        role,
        dob,
        deptId,
        salary,
      })
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // ── Data ─────────────────────────────────────────────────────
  const { data: departments = [] } = useDepartments()
  const { data: designations = [] } = useDesignations()
  const deleteByIdOrCode = useDeleteEmployeeByIdOrCode()
  const deleteSingle = useDeleteEmployee()

  const { data: employees = [], isLoading, isError, refetch } = useEmployees(
    search || undefined,
    departmentId !== 'all' ? departmentId : undefined,
    status !== 'all' ? status : undefined,
  )

  // ── Client-side secondary filters ─────────────────────────────
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (designationId !== 'all' && e.designation_id !== designationId) return false
      if (employmentType !== 'all') {
        const normEmpType = normalizeEmploymentType(e.employment_type)
        const normFilter = normalizeEmploymentType(employmentType)
        if (normEmpType !== normFilter) return false
      }
      if (countryCode !== 'all') {
        const country = COUNTRIES.find((c) => c.code === countryCode)
        if (!country) return false
        const empCountry = (e.country || e.current_country || '').toLowerCase()
        const match = countryCode === 'Remote'
          ? empCountry.includes('remote') || (e.branch || '').toLowerCase().includes('remote')
          : empCountry.includes(country.name.toLowerCase()) || empCountry === countryCode.toLowerCase()
        if (!match) return false
      }
      return true
    })
  }, [employees, designationId, employmentType, countryCode])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasActiveFilters = !!(
    search || departmentId !== 'all' || designationId !== 'all' ||
    countryCode !== 'all' || employmentType !== 'all' || status !== 'all'
  )

  const activeFilterCount = [search, departmentId !== 'all', designationId !== 'all', countryCode !== 'all', employmentType !== 'all', status !== 'all'].filter(Boolean).length

  const resetFilters = useCallback(() => {
    setSearch(''); setDepartmentId('all'); setDesignationId('all')
    setCountryCode('all'); setEmploymentType('all'); setStatus('all'); setPage(1)
  }, [])

  const handleDeleteById = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeIdInput.trim()) return
    await deleteByIdOrCode.mutateAsync(employeeIdInput.trim())
    setDeleteDialogOpen(false)
    setEmployeeIdInput('')
  }

  // ── CSV Export ────────────────────────────────────────────────
  const downloadCSV = useCallback(() => {
    const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Country', 'Employment Type', 'Status', 'Joining Date']
    const rows = filtered.map((e) => [
      e.employee_code ?? '',
      e.first_name, e.last_name, e.email, e.phone ?? '',
      (e as any).department?.name ?? '',
      (e as any).designation?.name ?? '',
      e.country ?? e.current_country ?? '',
      e.employment_type ?? '',
      e.status ?? '',
      e.joining_date ?? '',
    ])
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  // ── Status badge helper ───────────────────────────────────────
  const statusClass = (s: string | null | undefined) => {
    switch ((s ?? '').toLowerCase()) {
      case 'active':     return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'on leave':   return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'inactive':   return 'bg-slate-100 text-slate-600 border-slate-200'
      case 'terminated': return 'bg-red-50 text-red-700 border-red-200'
      case 'probation':  return 'bg-blue-50 text-blue-700 border-blue-200'
      default:           return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description={filtered.length < employees.length ? `${filtered.length} of ${employees.length} employees in the directory` : `${employees.length} employees in the directory`}
        actions={
          isManager ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filtered.length === 0} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5" onClick={() => setDeleteDialogOpen(true)}>
                <UserX className="h-3.5 w-3.5" /> Delete by ID
              </Button>
              <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> Add Employee
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filtered.length === 0} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )
        }
      />

      {/* ── Search + Filter Toggle Row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="employee-search"
            placeholder="Search by name, email or employee code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Button
          variant={filtersOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltersOpen((p) => !p)}
          className="shrink-0 gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-0.5 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
          {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0 gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {/* ── Expandable Filter Panel ── */}
      {filtersOpen && (
        <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-muted/30 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-dept" className="text-xs font-medium text-muted-foreground">Department</Label>
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1) }}>
                <SelectTrigger id="filter-dept" className="h-9 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation / Role */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-desig" className="text-xs font-medium text-muted-foreground">Designation / Role</Label>
              <Select value={designationId} onValueChange={(v) => { setDesignationId(v); setPage(1) }}>
                <SelectTrigger id="filter-desig" className="h-9 text-sm">
                  <SelectValue placeholder="All Designations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country / Region */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-country" className="text-xs font-medium text-muted-foreground">Country / Region</Label>
              <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); setPage(1) }}>
                <SelectTrigger id="filter-country" className="h-9 text-sm">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌍 All Countries</SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment Type */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-type" className="text-xs font-medium text-muted-foreground">Employment Type</Label>
              <Select value={employmentType} onValueChange={(v) => { setEmploymentType(v); setPage(1) }}>
                <SelectTrigger id="filter-type" className="h-9 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger id="filter-status" className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {search && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Search: "{search}"
                </Badge>
              )}
              {departmentId !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Dept: {departments.find((d) => d.id === departmentId)?.name}
                </Badge>
              )}
              {designationId !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Role: {designations.find((d) => d.id === designationId)?.name}
                </Badge>
              )}
              {countryCode !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {COUNTRIES.find((c) => c.code === countryCode)?.flag}{' '}
                  {COUNTRIES.find((c) => c.code === countryCode)?.name}
                </Badge>
              )}
              {employmentType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {EMPLOYMENT_TYPES.find((t) => t.value === employmentType)?.label}
                </Badge>
              )}
              {status !== 'all' && (
                <Badge variant="secondary" className="text-xs">Status: {status}</Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Employee Table ── */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No employees found" description="Try adjusting your search or filters.">
          {isManager && (
            <Button onClick={() => setFormOpen(true)}>
              <Users className="mr-2 h-4 w-4" /> Add your first employee
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[280px]">Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead className="w-16 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((e) => (
                  <TableRow key={e.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <Link to={`/employees/${e.id}`} className="flex items-center gap-3 group-hover:text-primary transition-colors">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary font-semibold">
                            {initials(e.first_name, e.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.first_name} {e.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {e.employee_code ?? ''} · {e.email}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(e as any).department?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(e as any).designation?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const c = e.country ?? e.current_country
                        if (!c) return <span className="text-muted-foreground">—</span>
                        const match = COUNTRIES.find((x) => x.name.toLowerCase() === c.toLowerCase() || x.code === c.toUpperCase())
                        return match ? `${match.flag} ${match.name}` : c
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {(e.employment_type || 'Full-time').replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(e.joining_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-medium ${statusClass(e.status)}`}>
                        {e.status ?? 'Active'}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                              aria-label={`Delete ${e.first_name} ${e.last_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete employee & block credentials?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{e.first_name} {e.last_name}</strong> ({e.employee_code ?? e.id}) and block their portal login. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSingle.mutate(e.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete & Block Login
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}

      {/* ── Add / Edit Employee Dialog ── */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setInitialConversionValues(null)
        }}
        initialValues={initialConversionValues}
      />

      {/* ── Delete by ID / Code Modal ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Employee & Block Credentials
            </DialogTitle>
            <DialogDescription>
              Enter the Employee Code (e.g. OKL-ENG-2026-001) or UUID. The employee record will be deleted and their portal login permanently blocked.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteById} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-emp-id">Employee Code or UUID *</Label>
              <Input
                id="delete-emp-id"
                required
                placeholder="e.g. OKL-ENG-2026-001 or UUID"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Or pick from list:</p>
              <Select onValueChange={(val) => setEmployeeIdInput(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.employee_code || emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id.slice(0, 8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deleteByIdOrCode.isPending} className="gap-2">
                {deleteByIdOrCode.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete & Block Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

