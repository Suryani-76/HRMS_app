import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, UserX, Users, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import { useEmployees, useDepartments, useDeleteEmployeeByIdOrCode, useDeleteEmployee } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 12

export default function EmployeesPage() {
  const { isManager } = useAuth()
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeIdInput, setEmployeeIdInput] = useState('')

  const { data: departments = [] } = useDepartments()
  const deleteByIdOrCode = useDeleteEmployeeByIdOrCode()
  const deleteSingle = useDeleteEmployee()

  const {
    data: employees = [],
    isLoading,
    isError,
    refetch,
  } = useEmployees(search || undefined, departmentId !== 'all' ? departmentId : undefined, status !== 'all' ? status : undefined)

  const filtered = useMemo(() => employees, [employees])
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDeleteById = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeIdInput.trim()) return
    await deleteByIdOrCode.mutateAsync(employeeIdInput.trim())
    setDeleteDialogOpen(false)
    setEmployeeIdInput('')
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${employees.length} employee${employees.length === 1 ? '' : 's'} in the directory`}
        actions={
          isManager ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                <UserX className="mr-2 h-4 w-4" /> Delete Employee by ID
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or employee code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1) }}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link to={`/employees/${e.id}`} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(e.first_name, e.last_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {e.first_name} {e.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{e.employee_code ?? ''} · {e.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{e.department?.name ?? '—'}</TableCell>
                    <TableCell>{e.designation?.name ?? '—'}</TableCell>
                    <TableCell>{formatDate(e.joining_date)}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === 'Active' ? 'success' : e.status === 'On Leave' ? 'warning' : 'secondary'}>
                        {e.status ?? 'Active'}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete employee & block credentials?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {e.first_name} {e.last_name} ({e.employee_code ?? e.id})? Their account credentials will be blocked from logging into the portal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSingle.mutate(e.id)} className="bg-destructive text-destructive-foreground">
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

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} />

      {/* Delete Employee by ID / Code Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Employee & Block Credentials
            </DialogTitle>
            <DialogDescription>
              Enter the Employee ID or Employee Code below. The employee will be deleted and their login credentials will be permanently blocked.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteById} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee ID or Code *</Label>
              <Input
                required
                placeholder="e.g. IND-HQ-0001 or UUID"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Quick Select:
              </p>
              <Select onValueChange={(val) => setEmployeeIdInput(val)}>
                <SelectTrigger><SelectValue placeholder="Or pick from list..." /></SelectTrigger>
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
              <Button type="submit" variant="destructive" disabled={deleteByIdOrCode.isPending}>
                {deleteByIdOrCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete & Block Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
