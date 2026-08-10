import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/database.types'

export interface EmployeeInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  gender?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  marital_status?: string
  blood_group?: string
  joining_date: string
  employment_type?: string
  department_id?: string
  designation_id?: string
  manager_id?: string
  status?: string
  basic_salary?: number
  hra?: number
  allowances?: number
  bonus?: number
  password?: string
  branch?: string
}

export async function fetchEmployees(options?: { search?: string; departmentId?: string; status?: string }) {
  let query = supabase
    .from('employees')
    .select('*, department:departments(*), designation:designations(*), manager:employees(*)')
    .order('created_at', { ascending: false })

  if (options?.departmentId) query = query.eq('department_id', options.departmentId)
  if (options?.status) query = query.eq('status', options.status)
  if (options?.search) {
    query = query.or(
      `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,employee_code.ilike.%${options.search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Employee[]
}

export async function fetchEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments(*), designation:designations(*), manager:employees(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Employee
}

async function nextEmployeeCode(input: EmployeeInput): Promise<string> {
  let deptName = 'XX'
  if (input.department_id) {
    const { data } = await supabase.from('departments').select('name').eq('id', input.department_id).single()
    if (data) deptName = data.name.substring(0,2).toUpperCase()
  }
  
  const c = input.country ? input.country.substring(0,3).toUpperCase() : 'XXX'
  const s = input.state ? input.state.substring(0,2).toUpperCase() : 'XX'
  const city = input.city ? input.city.substring(0,3).toUpperCase() : 'XXX'
  const br = input.branch ? input.branch.substring(0,3).toUpperCase() : 'BR1'
  
  const prefix = `${c}-${s}-${city}-${br}-${deptName}-`
  
  const { data, error } = await supabase.from('employees').select('employee_code').like('employee_code', `${prefix}%`)
  if (error) throw error
  const max = (data ?? [])
    .map((r) => {
      const parts = String(r.employee_code ?? '').split('-')
      const n = parseInt(parts[parts.length - 1], 10)
      return Number.isNaN(n) ? 0 : n
    })
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

function officialEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@oklut.com`
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const code = await nextEmployeeCode(input)
  const email = input.email || officialEmail(input.first_name, input.last_name)

  const { data, error } = await supabase
    .from('employees')
    .insert({
      employee_code: code,
      first_name: input.first_name,
      last_name: input.last_name,
      email,
      phone: input.phone ?? null,
      gender: input.gender ?? null,
      date_of_birth: input.date_of_birth ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      postal_code: input.postal_code ?? null,
      marital_status: input.marital_status ?? null,
      blood_group: input.blood_group ?? null,
      joining_date: input.joining_date,
      employment_type: input.employment_type ?? 'Full-time',
      department_id: input.department_id ?? null,
      designation_id: input.designation_id ?? null,
      manager_id: input.manager_id ?? null,
      status: input.status ?? 'Active',
      branch: input.branch ?? null,
    })
    .select()
    .single()

  if (error) throw error
  const employee = data as Employee

  // Payroll profile
  await supabase.from('payroll_profiles').upsert({
    employee_id: employee.id,
    basic_salary: input.basic_salary ?? 0,
    hra: input.hra ?? 0,
    allowances: input.allowances ?? 0,
    bonus: input.bonus ?? 0,
  })

  // Provision auth login (works with service role; skipped gracefully otherwise)
  let userId: string | null = null
  if (input.password) {
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: `${input.first_name} ${input.last_name}` },
    })
    if (!authErr && created?.user) {
      userId = created.user.id
      await supabase.from('employees').update({ user_id: userId }).eq('id', employee.id)
      await supabase.from('users').insert({
        id: userId,
        email,
        role_id: (await defaultEmployeeRoleId()) as string,
        employee_id: employee.id,
        status: 'Active',
      })
    }
  }

  await logAudit('employee.create', 'employees', employee.id, { name: `${input.first_name} ${input.last_name}` })
  return employee
}

export async function updateEmployee(id: string, patch: Partial<EmployeeInput>) {
  const { data, error } = await supabase
    .from('employees')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  await logAudit('employee.update', 'employees', id, patch)
  return data as Employee
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
  await logAudit('employee.delete', 'employees', id, {})
}

async function defaultEmployeeRoleId(): Promise<string | null> {
  const { data } = await supabase.from('roles').select('id').eq('name', 'Employee').single()
  return data?.id ?? null
}

export async function logAudit(action: string, entityType: string, entityId: string, details?: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession()
  await supabase.from('audit_logs').insert({
    user_id: session.session?.user.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  })
}
