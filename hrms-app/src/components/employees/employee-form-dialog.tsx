import { useEffect, useState } from 'react'
import { Loader2, User, PhoneCall, Home, MapPin, Briefcase, DollarSign, CheckSquare, Square } from 'lucide-react'
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
  initialValues?: Record<string, any> | null
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Probation']
const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Guardian', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend', 'Other']

export function EmployeeFormDialog({ open, onOpenChange, employee, initialValues }: EmployeeFormDialogProps) {
  const { isAdmin } = useAuth()
  const { data: departments = [] } = useDepartments()
  const { data: designations = [] } = useDesignations()
  const { data: allEmployees = [] } = useEmployees()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee(employee?.id ?? '')

  const [sameAsCurrent, setSameAsCurrent] = useState(false)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    blood_group: '',
    // Guardian / Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    // Current Address
    current_address: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    current_postal_code: '',
    // Permanent Address
    permanent_address: '',
    permanent_city: '',
    permanent_state: '',
    permanent_country: 'India',
    permanent_postal_code: '',
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
      if (employee) {
        const curAddr = employee.current_address || employee.address || ''
        const curCity = employee.current_city || employee.city || ''
        const curState = employee.current_state || employee.state || ''
        const curCountry = employee.current_country || employee.country || 'India'
        const curZip = employee.current_postal_code || employee.postal_code || ''

        const permAddr = employee.permanent_address || curAddr
        const permCity = employee.permanent_city || curCity
        const permState = employee.permanent_state || curState
        const permCountry = employee.permanent_country || curCountry
        const permZip = employee.permanent_postal_code || curZip

        const isSame =
          curAddr !== '' &&
          curAddr === permAddr &&
          curCity === permCity &&
          curState === permState &&
          curZip === permZip

        setSameAsCurrent(isSame)

        setForm({
          first_name: employee.first_name ?? '',
          last_name: employee.last_name ?? '',
          email: employee.email ?? '',
          phone: employee.phone ?? '',
          gender: employee.gender ?? '',
          date_of_birth: toDateInput(employee.date_of_birth),
          marital_status: employee.marital_status ?? '',
          blood_group: employee.blood_group ?? '',
          // Emergency contact
          emergency_contact_name: employee.emergency_contact_name || employee.guardian_name || '',
          emergency_contact_relation: employee.emergency_contact_relation || employee.guardian_relation || '',
          emergency_contact_phone: employee.emergency_contact_phone || employee.emergency_contact || employee.guardian_phone || '',
          // Current address
          current_address: curAddr,
          current_city: curCity,
          current_state: curState,
          current_country: curCountry,
          current_postal_code: curZip,
          // Permanent address
          permanent_address: permAddr,
          permanent_city: permCity,
          permanent_state: permState,
          permanent_country: permCountry,
          permanent_postal_code: permZip,
          branch: employee.branch ?? '',
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
        })
      } else if (initialValues) {
        setSameAsCurrent(false)
        const nameParts = (initialValues.name || '').trim().split(/\s+/)
        const fName = initialValues.first_name || nameParts[0] || ''
        const lName = initialValues.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')

        // Auto-match designation or department if available
        let matchedDesigId = initialValues.designation_id || ''
        if (!matchedDesigId && initialValues.role) {
          const matched = designations.find((d) => d.name?.toLowerCase() === initialValues.role?.toLowerCase())
          if (matched) matchedDesigId = matched.id
        }

        setForm({
          first_name: fName,
          last_name: lName,
          email: initialValues.email || '',
          phone: initialValues.phone || '',
          gender: initialValues.gender || '',
          date_of_birth: toDateInput(initialValues.date_of_birth || initialValues.dob) || '',
          marital_status: '',
          blood_group: '',
          emergency_contact_name: '',
          emergency_contact_relation: '',
          emergency_contact_phone: '',
          current_address: '',
          current_city: '',
          current_state: '',
          current_country: 'India',
          current_postal_code: '',
          permanent_address: '',
          permanent_city: '',
          permanent_state: '',
          permanent_country: 'India',
          permanent_postal_code: '',
          branch: '',
          joining_date: toDateInput(initialValues.joining_date) || new Date().toISOString().slice(0, 10),
          employment_type: initialValues.employment_type || 'Full-time',
          department_id: initialValues.department_id || initialValues.deptId || '',
          designation_id: matchedDesigId,
          manager_id: '',
          status: 'Active',
          basic_salary: initialValues.basic_salary || initialValues.salary || '',
          hra: '',
          allowances: '',
          bonus: '',
          password: '',
        })
      } else {
        setSameAsCurrent(false)
        setForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          gender: '',
          date_of_birth: '',
          marital_status: '',
          blood_group: '',
          emergency_contact_name: '',
          emergency_contact_relation: '',
          emergency_contact_phone: '',
          current_address: '',
          current_city: '',
          current_state: '',
          current_country: 'India',
          current_postal_code: '',
          permanent_address: '',
          permanent_city: '',
          permanent_state: '',
          permanent_country: 'India',
          permanent_postal_code: '',
          branch: '',
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
        })
      }
    }
  }, [open, employee, initialValues, designations])

  const set = <K extends keyof typeof form>(key: K, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (sameAsCurrent) {
        if (key === 'current_address') next.permanent_address = value
        if (key === 'current_city') next.permanent_city = value
        if (key === 'current_state') next.permanent_state = value
        if (key === 'current_country') next.permanent_country = value
        if (key === 'current_postal_code') next.permanent_postal_code = value
      }
      return next
    })
  }

  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsCurrent(checked)
    if (checked) {
      setForm((f) => ({
        ...f,
        permanent_address: f.current_address,
        permanent_city: f.current_city,
        permanent_state: f.current_state,
        permanent_country: f.current_country,
        permanent_postal_code: f.current_postal_code,
      }))
    }
  }

  const num = (v: string) => (v ? Number(v) : undefined)

  const submitting = createEmployee.isPending || updateEmployee.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Mandatory field validation
    if (!form.first_name.trim() || !form.last_name.trim() || !form.joining_date) {
      setError('First name, last name and joining date are required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email address is required. It is used as a unique login key for this employee.')
      return
    }
    if (!form.phone.trim()) {
      setError('Phone number is required. It serves as a secondary unique identifier to distinguish employees with the same name.')
      return
    }
    // Basic email format check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    // Basic phone format check (at least 7 digits)
    if (!/^[+\d][\d\s\-().]{6,}$/.test(form.phone.trim())) {
      setError('Please enter a valid phone number (e.g. +91 98765 43210).')
      return
    }

    // Password validation (MANDATORY for new employees)
    if (!employee && !form.password.trim()) {
      setError('Login password is required to generate the employee portal credentials.')
      return
    }
    if (form.password.trim() && form.password.trim().length < 6) {
      setError('Login password must be at least 6 characters long.')
      return
    }
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone ?? '',
      gender: form.gender || undefined,
      date_of_birth: form.date_of_birth || undefined,
      marital_status: form.marital_status || undefined,
      blood_group: form.blood_group || undefined,
      // Guardian / Emergency contact
      emergency_contact_name: form.emergency_contact_name || undefined,
      emergency_contact_relation: form.emergency_contact_relation || undefined,
      emergency_contact_phone: form.emergency_contact_phone || undefined,
      emergency_contact: form.emergency_contact_phone || undefined,
      guardian_name: form.emergency_contact_name || undefined,
      guardian_relation: form.emergency_contact_relation || undefined,
      guardian_phone: form.emergency_contact_phone || undefined,
      // Current address
      current_address: form.current_address || undefined,
      current_city: form.current_city || undefined,
      current_state: form.current_state || undefined,
      current_country: form.current_country || undefined,
      current_postal_code: form.current_postal_code || undefined,
      // Fallback address fields for backward compatibility
      address: form.current_address || undefined,
      city: form.current_city || undefined,
      state: form.current_state || undefined,
      country: form.current_country || undefined,
      postal_code: form.current_postal_code || undefined,
      // Permanent address
      permanent_address: (sameAsCurrent ? form.current_address : form.permanent_address) || undefined,
      permanent_city: (sameAsCurrent ? form.current_city : form.permanent_city) || undefined,
      permanent_state: (sameAsCurrent ? form.current_state : form.permanent_state) || undefined,
      permanent_country: (sameAsCurrent ? form.current_country : form.permanent_country) || undefined,
      permanent_postal_code: (sameAsCurrent ? form.current_postal_code : form.permanent_postal_code) || undefined,
      branch: form.branch || undefined,
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
            {employee
              ? 'Update the employee record, emergency contact, and address details.'
              : 'Fill in the details below. An Employee ID (e.g. OKL-ENG-2026-001) will be auto-generated based on the department selected. Email and Phone are mandatory unique identifiers — they distinguish employees with the same name.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 1. Personal Details */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <User className="h-4 w-4 text-indigo-600" /> Personal Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jane" required />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Email address <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="jane.doe@oklut.com"
                  required
                />
                <p className="text-xs text-muted-foreground">Must be unique — used as the login key.</p>
              </div>
              <div className="space-y-2">
                <Label>Personal Phone <span className="text-destructive">*</span></Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
                <p className="text-xs text-muted-foreground">Must be unique — distinguishes employees with identical names.</p>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender || undefined} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. Guardian & Emergency Contact */}
          <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/30 p-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-900">
                <PhoneCall className="h-4 w-4 text-amber-600" /> Guardian / Emergency Contact Details
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Primary contact person in case of medical or workplace emergencies.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ec_name">Guardian / Contact Name</Label>
                <Input
                  id="ec_name"
                  value={form.emergency_contact_name}
                  onChange={(e) => set('emergency_contact_name', e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec_relation">Relationship</Label>
                <Select
                  value={form.emergency_contact_relation || undefined}
                  onValueChange={(v) => set('emergency_contact_relation', v)}
                >
                  <SelectTrigger id="ec_relation">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((rel) => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec_phone">Emergency Contact Number *</Label>
                <Input
                  id="ec_phone"
                  value={form.emergency_contact_phone}
                  onChange={(e) => set('emergency_contact_phone', e.target.value)}
                  placeholder="+91 98765 00000"
                />
              </div>
            </div>
          </div>

          {/* 3. Current Address */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Home className="h-4 w-4 text-blue-600" /> Current Address
            </h3>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Textarea
                value={form.current_address}
                onChange={(e) => set('current_address', e.target.value)}
                placeholder="House/Flat No., Building, Street, Area"
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.current_city} onChange={(e) => set('current_city', e.target.value)} placeholder="e.g. Noida" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.current_state} onChange={(e) => set('current_state', e.target.value)} placeholder="e.g. Uttar Pradesh" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.current_country} onChange={(e) => set('current_country', e.target.value)} placeholder="India" />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input value={form.current_postal_code} onChange={(e) => set('current_postal_code', e.target.value)} placeholder="201301" />
              </div>
            </div>
          </div>

          {/* 4. Permanent Address */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <MapPin className="h-4 w-4 text-emerald-600" /> Permanent Address
              </h3>
              <button
                type="button"
                onClick={() => handleToggleSameAddress(!sameAsCurrent)}
                className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {sameAsCurrent ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                Same as Current Address
              </button>
            </div>

            <div className="space-y-2">
              <Label>Street Address</Label>
              <Textarea
                value={form.permanent_address}
                onChange={(e) => set('permanent_address', e.target.value)}
                placeholder="House/Flat No., Building, Street, Area"
                rows={2}
                disabled={sameAsCurrent}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.permanent_city}
                  onChange={(e) => set('permanent_city', e.target.value)}
                  placeholder="e.g. Jaipur"
                  disabled={sameAsCurrent}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={form.permanent_state}
                  onChange={(e) => set('permanent_state', e.target.value)}
                  placeholder="e.g. Rajasthan"
                  disabled={sameAsCurrent}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={form.permanent_country}
                  onChange={(e) => set('permanent_country', e.target.value)}
                  placeholder="India"
                  disabled={sameAsCurrent}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input
                  value={form.permanent_postal_code}
                  onChange={(e) => set('permanent_postal_code', e.target.value)}
                  placeholder="302006"
                  disabled={sameAsCurrent}
                />
              </div>
            </div>
          </div>

          {/* 5. Employment & Branch */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Briefcase className="h-4 w-4 text-indigo-600" /> Employment & Organization
            </h3>
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Branch / Office Location</Label>
                <Input value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Main Branch (HQ)" />
              </div>
            </div>
          </div>

          {/* 6. Compensation (Admin only) */}
          {isAdmin && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Compensation Details
              </h3>
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
              </div>
            </div>
          )}

          {/* 7. Portal Login Credentials (Mandatory for new employee) */}
          <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-indigo-950">
              <User className="h-4 w-4 text-indigo-600" /> Portal Login Credentials
            </h3>
            <div className="space-y-2">
              <Label htmlFor="emp_password">
                {employee ? 'Reset Portal Password (optional)' : 'Portal Login Password'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emp_password"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={employee ? 'Leave blank to keep existing password' : 'Enter portal login password (min. 6 characters, e.g. Krishna8*)'}
                required={!employee}
              />
              <p className="text-xs text-muted-foreground">
                {employee
                  ? 'Enter a new password if you wish to reset this employee’s portal login credentials.'
                  : 'Mandatory: The employee will use their email address and this password to log into the HRMS portal.'}
              </p>
            </div>
          </div>

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

