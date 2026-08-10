import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mail, Phone, MapPin, Cake, CalendarDays, Building2, Briefcase, BadgeCheck, Pencil, Trash2, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { TableSkeleton } from '@/components/shared/skeletons'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import { StatusPill } from '@/components/shared/status-pill'
import {
  useEmployee,
  useDeleteEmployee,
  useAttendanceMonth,
  usePayroll,
  useDocuments,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate, formatCurrency, formatHours, currentPayPeriod, monthName } from '@/lib/format'

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isManager } = useAuth()
  const { data: employee, isLoading, isError } = useEmployee(id)
  const deleteEmployee = useDeleteEmployee()
  const [editOpen, setEditOpen] = useState(false)
  const [month, setMonth] = useState(currentPayPeriod())

  const { data: attendance = [], isLoading: attendanceLoading } = useAttendanceMonth(id ?? '', month)
  const { data: payroll = [] } = usePayroll()
  const { data: documents = [] } = useDocuments(id)
  const employeePayroll = payroll.filter((p) => p.employee_id === id)
  const employeeDocs = documents.filter((d) => d.employee_id === id)

  const present = useMemo(() => attendance.filter((a) => a.status === 'present' || a.status === 'late').length, [attendance])
  const late = useMemo(() => attendance.filter((a) => a.status === 'late').length, [attendance])
  const totalHours = useMemo(() => attendance.reduce((s, a) => s + (a.working_hours ?? 0), 0), [attendance])

  if (isError) {
    return (
      <div>
        <PageHeader title="Employee not found" backTo="/employees" />
        <Button onClick={() => navigate('/employees')}>Back to employees</Button>
      </div>
    )
  }

  if (isLoading || !employee) {
    return <TableSkeleton rows={8} />
  }

  const handleDelete = async () => {
    await deleteEmployee.mutateAsync(employee.id)
    navigate('/employees')
  }

  const infoItems = [
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Phone', value: employee.phone || '—' },
    { icon: Building2, label: 'Department', value: employee.department?.name || '—' },
    { icon: Briefcase, label: 'Designation', value: employee.designation?.name || '—' },
    { icon: Cake, label: 'Date of birth', value: formatDate(employee.date_of_birth) },
    { icon: CalendarDays, label: 'Joined', value: formatDate(employee.joining_date) },
    { icon: BadgeCheck, label: 'Employment type', value: employee.employment_type || '—' },
    { icon: MapPin, label: 'Location', value: [employee.city, employee.state, employee.country].filter(Boolean).join(', ') || '—' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={employee.employee_code ?? 'No employee code'}
        backTo="/employees"
        crumbs={[{ label: 'Employees', to: '/employees' }, { label: employee.employee_code ?? 'Employee' }]}
        actions={
          isManager ? (
            <>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteEmployee.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete employee?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {employee.first_name} {employee.last_name} and related records. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      {deleteEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="mb-3 h-20 w-20">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {initials(employee.first_name, employee.last_name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">{employee.designation?.name ?? 'Employee'}</p>
            <div className="mt-3 flex items-center gap-2">
              <StatusPill status={employee.status ?? 'Active'} />
              <Badge variant="secondary">{employee.employment_type ?? 'Full-time'}</Badge>
            </div>
            {employee.manager && (
              <p className="mt-4 text-xs text-muted-foreground">
                Reports to: <span className="font-medium text-foreground">{employee.manager.first_name} {employee.manager.last_name}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contact & Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="documents">Documents ({employeeDocs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-success">{present}</p>
                <p className="text-xs text-muted-foreground">Days present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-warning">{late}</p>
                <p className="text-xs text-muted-foreground">Late arrivals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
                <p className="text-xs text-muted-foreground">Total hours</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {attendanceLoading ? (
                <TableSkeleton rows={5} />
              ) : attendance.length === 0 ? (
                <EmptyState title="No attendance records" description={`No records for ${monthName(month)}.`} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Hours</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a) => (
                        <tr key={a.id} className="border-b">
                          <td className="px-4 py-2.5">{formatDate(a.date)}</td>
                          <td className="px-4 py-2.5">{a.check_in ? formatDate(a.check_in).split(',')[0] + ' ' + new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-4 py-2.5">{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-4 py-2.5">{formatHours(a.working_hours)}</td>
                          <td className="px-4 py-2.5"><StatusPill status={a.status ?? 'absent'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {employeePayroll.length === 0 ? (
                <EmptyState title="No payroll records" description="Generate payroll for this employee to see payslips." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Gross</th>
                        <th className="px-4 py-3">Deductions</th>
                        <th className="px-4 py-3">Net</th>
                        <th className="px-4 py-3">Days</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePayroll.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="px-4 py-2.5">{monthName(p.pay_period)}</td>
                          <td className="px-4 py-2.5">{formatCurrency(p.basic_salary + p.hra + p.allowances + p.bonus)}</td>
                          <td className="px-4 py-2.5">{formatCurrency(p.deductions + p.tax + p.provident_fund)}</td>
                          <td className="px-4 py-2.5 font-semibold">{formatCurrency(p.net_salary)}</td>
                          <td className="px-4 py-2.5">{p.present_days}/{p.total_days}</td>
                          <td className="px-4 py-2.5"><StatusPill status={p.status ?? 'draft'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {employeeDocs.length === 0 ? (
                <EmptyState title="No documents" description="No documents uploaded for this employee." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {employeeDocs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.doc_type ?? 'Document'} · {d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ''}
                        </p>
                      </div>
                      {d.file_url && (
                        <Button asChild variant="ghost" size="icon">
                          <a href={d.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
    </div>
  )
}
