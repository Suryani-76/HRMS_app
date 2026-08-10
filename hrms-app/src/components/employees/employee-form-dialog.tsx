import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDepartments, useDesignations, useEmployees, useCreateEmployee, useUpdateEmployee } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import type { Employee } from '@/lib/database.types'
import { toDateInput } from '@/lib/format'

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Probation']
const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const { isAdmin } = useAuth()
  const { data: departments = [] } = useDepartments()
  const { data: designations = [] } = useDesignations()
  const { data: allEmployees = [] } = useEmployees()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee(employee?.id ?? '')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    marital_status: '',
    blood_group: '',
    branch: '',
    joining_date: '',
    employment_type: 'Full-time',
    department_id: '',
    designation_id: '',
    manager_id: '',
    status: 'Active',
    basic_salary: '',
    hra: '',
    allowances: '',
    bonus: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(
        employee
          ? {
              first_name: employee.first_name ?? '',
              last_name: employee.last_name ?? '',
              email: employee.email ?? '',
              phone: employee.phone ?? '',
              gender: employee.gender ?? '',
              date_of_birth: toDateInput(employee.date_of_birth),
              address: employee.address ?? '',
              city: employee.city ?? '',
              state: employee.state ?? '',
              country: employee.country ?? '',
              postal_code: employee.postal_code ?? '',
              branch: employee.branch ?? '',
              marital_status: employee.marital_status ?? '',
              blood_group: employee.blood_group ?? '',
              joining_date: toDateInput(employee.joining_date),
              employment_type: employee.employment_type ?? 'Full-time',
              department_id: employee.department_id ?? '',
              designation_id: employee.designation_id ?? '',
              manager_id: employee.manager_id ?? '',
              status: employee.status ?? 'Active',
              basic_salary: '',
              hra: '',
              allowances: '',
              bonus: '',
              password: '',
            }
          : {
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              gender: '',
              date_of_birth: '',
              address: '',
              city: '',
              state: '',
              country: '',
              postal_code: '',
              branch: '',
              marital_status: '',
              blood_group: '',
              joining_date: new Date().toISOString().slice(0, 10),
              employment_type: 'Full-time',
              department_id: '',
              designation_id: '',
              manager_id: '',
              status: 'Active',
              basic_salary: '',
              hra: '',
              allowances: '',
              bonus: '',
              password: '',
            },
      )
    }
  }, [open, employee])

  const set = <K extends keyof typeof form>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const num = (v: string) => (v ? Number(v) : undefined)

  const submitting = createEmployee.isPending || updateEmployee.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.first_name.trim() || !form.last_name.trim() || !form.joining_date) {
      setError('First name, last name and joining date are required.')
      return
    }
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone || undefined,
      gender: form.gender || undefined,
      date_of_birth: form.date_of_birth || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      postal_code: form.postal_code || undefined,
      branch: form.branch || undefined,
      marital_status: form.marital_status || undefined,
      blood_group: form.blood_group || undefined,
      joining_date: form.joining_date,
      employment_type: form.employment_type || undefined,
      department_id: form.department_id || undefined,
      designation_id: form.designation_id || undefined,
      manager_id: form.manager_id || undefined,
      status: form.status || 'Active',
      basic_salary: num(form.basic_salary),
      hra: num(form.hra),
      allowances: num(form.allowances),
      bonus: num(form.bonus),
      password: form.password || undefined,
    }

    try {
      if (employee) {
        await updateEmployee.mutateAsync(payload)
      } else {
        await createEmployee.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      /* toast handled by hook */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Update the employee record.' : 'Create a new employee record and optionally provision a login.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Personal Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jane" />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane.doe@oklut.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender || undefined} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Marital status</Label>
                <Select value={form.marital_status || undefined} onValueChange={(v) => set('marital_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blood group</Label>
                <Select value={form.blood_group || undefined} onValueChange={(v) => set('blood_group', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Address</h3>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street address" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Main Branch" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Employment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Joining date *</Label>
                <Input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Employment type</Label>
                <Select value={form.employment_type} onValueChange={(v) => set('employment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department_id || undefined} onValueChange={(v) => set('department_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Select value={form.designation_id || undefined} onValueChange={(v) => set('designation_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.department ? ` (${d.department.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={form.manager_id || undefined} onValueChange={(v) => set('manager_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {allEmployees
                      .filter((e) => e.id !== employee?.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.first_name} {e.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Active', 'Inactive', 'On Leave', 'Terminated'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Compensation & Access</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Basic salary</Label>
                  <Input type="number" value={form.basic_salary} onChange={(e) => set('basic_salary', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>HRA</Label>
                  <Input type="number" value={form.hra} onChange={(e) => set('hra', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Allowances</Label>
                  <Input type="number" value={form.allowances} onChange={(e) => set('allowances', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <Input type="number" value={form.bonus} onChange={(e) => set('bonus', e.target.value)} placeholder="0" />
                </div>
                {!employee && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Login password (optional)</Label>
                    <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Set a password to create login access" />
                    <p className="text-xs text-muted-foreground">
                      If left blank, the employee can be given access later. Requires admin privileges.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? 'Save changes' : 'Create employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
