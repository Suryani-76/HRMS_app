import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Search, Users, RotateCcw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { useEmployees, useDepartments, useDesignations } from '@/hooks/use-queries'
import { initials } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 15

const BRANCHES = ['HQ', 'North', 'South', 'East', 'West', 'Remote', 'International']
const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]
const STATUS_OPTIONS = ['Active', 'Inactive', 'On Leave', 'Terminated']

export default function EmployeeFilterPage() {
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('all')
  const [designationId, setDesignationId] = useState('all')
  const [branch, setBranch] = useState('all')
  const [employmentType, setEmploymentType] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const { data: departments = [] } = useDepartments()
  const { data: designations = [] } = useDesignations()
  const { data: employees = [], isLoading } = useEmployees(
    search || undefined,
    departmentId !== 'all' ? departmentId : undefined,
    status !== 'all' ? status : undefined,
  )

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (branch !== 'all' && !(e.branch || '').toLowerCase().includes(branch.toLowerCase())) return false
      if (designationId !== 'all' && e.designation_id !== designationId) return false
      if (employmentType !== 'all' && (e.employment_type || '') !== employmentType) return false
      return true
    })
  }, [employees, branch, designationId, employmentType])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => {
    setSearch(''); setDepartmentId('all'); setDesignationId('all')
    setBranch('all'); setEmploymentType('all'); setStatus('all'); setPage(1)
  }

  const hasActiveFilters = !!(search || departmentId !== 'all' || designationId !== 'all' || branch !== 'all' || employmentType !== 'all' || status !== 'all')

  const downloadCSV = () => {
    const headers = ['Employee Code', 'Name', 'Email', 'Department', 'Designation', 'Branch', 'Employment Type', 'Status', 'Joining Date']
    const rows = filtered.map((e) => [
      e.employee_code || '', `${e.first_name} ${e.last_name}`, e.email,
      (e as any).department?.name || '', (e as any).designation?.name || '',
      e.branch || 'HQ', e.employment_type || '', e.status || '', e.joining_date || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `employees-filter-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filter Employees"
        description={`${filtered.length} employee${filtered.length !== 1 ? 's' : ''} matching current filters`}
        actions={
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5" disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Panel */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-slate-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <SlidersHorizontal className="h-4 w-4 text-indigo-500" /> Filter Options
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs text-slate-600">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input id="filter-search" placeholder="Name, email, code..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Department</Label>
            <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1) }}>
              <SelectTrigger id="filter-department" className="text-sm"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Designation / Role</Label>
            <Select value={designationId} onValueChange={(v) => { setDesignationId(v); setPage(1) }}>
              <SelectTrigger id="filter-designation" className="text-sm"><SelectValue placeholder="All Designations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Branch / Region</Label>
            <Select value={branch} onValueChange={(v) => { setBranch(v); setPage(1) }}>
              <SelectTrigger id="filter-branch" className="text-sm"><SelectValue placeholder="All Regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Employment Type</Label>
            <Select value={employmentType} onValueChange={(v) => { setEmploymentType(v); setPage(1) }}>
              <SelectTrigger id="filter-employment-type" className="text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger id="filter-status" className="text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search && <Badge variant="secondary" className="text-xs">Search: {search}</Badge>}
            {departmentId !== 'all' && <Badge variant="secondary" className="text-xs">Dept: {departments.find(d => d.id === departmentId)?.name}</Badge>}
            {designationId !== 'all' && <Badge variant="secondary" className="text-xs">Role: {designations.find(d => d.id === designationId)?.name}</Badge>}
            {branch !== 'all' && <Badge variant="secondary" className="text-xs">Branch: {branch}</Badge>}
            {employmentType !== 'all' && <Badge variant="secondary" className="text-xs">Type: {EMPLOYMENT_TYPES.find(t => t.value === employmentType)?.label}</Badge>}
            {status !== 'all' && <Badge variant="secondary" className="text-xs">Status: {status}</Badge>}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" description="Try adjusting your filter criteria." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead>Employee</TableHead><TableHead>Code</TableHead>
                  <TableHead>Department</TableHead><TableHead>Designation</TableHead>
                  <TableHead>Branch / Region</TableHead><TableHead>Type</TableHead>
                  <TableHead>Status</TableHead><TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((e) => (
                  <TableRow key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {initials(e.first_name, e.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link to={`/employees/${e.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                            {e.first_name} {e.last_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{e.employee_code || '—'}</TableCell>
                    <TableCell className="text-sm">{(e as any).department?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{(e as any).designation?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">{e.branch || 'HQ'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 capitalize">{(e.employment_type || 'full_time').replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        (e.status || '').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : (e.status || '').toLowerCase() === 'terminated' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(e.joining_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
