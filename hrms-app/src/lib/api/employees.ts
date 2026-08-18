import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/database.types'
import { INITIAL_EMPLOYEES, INITIAL_DEPARTMENTS, INITIAL_DESIGNATIONS } from '@/lib/seed-data'

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

const EMP_KEY = 'hrms_local_employees'

function getLocalEmployees(): Employee[] {
  try {
    const saved = localStorage.getItem(EMP_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return INITIAL_EMPLOYEES
}

function saveLocalEmployees(emps: Employee[]) {
  try {
    localStorage.setItem(EMP_KEY, JSON.stringify(emps))
  } catch {}
}

export async function fetchEmployees(options?: { search?: string; departmentId?: string; status?: string }): Promise<Employee[]> {
  let employees: Employee[] = []

  try {
    let query = supabase
      .from('employees')
      .select('*, department:departments(*), designation:designations(*), manager:employees(*)')
      .order('created_at', { ascending: false })

    if (options?.departmentId && options.departmentId !== 'all') query = query.eq('department_id', options.departmentId)
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)
    if (options?.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,employee_code.ilike.%${options.search}%`
      )
    }

    let { data, error } = await query

    if (error) {
      const res = await supabase.from('employees').select('*, department:departments(*), designation:designations(*)').order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (error) {
      const res = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (!error && data && data.length > 0) {
      employees = data as Employee[]
      saveLocalEmployees(employees)
      return employees
    }
  } catch (err) {
    console.warn('fetchEmployees fallback to local/seed:', err)
  }

  // Fallback to local/seed
  employees = getLocalEmployees()

  if (options?.departmentId && options.departmentId !== 'all') {
    employees = employees.filter((e) => e.department_id === options.departmentId)
  }
  if (options?.status && options.status !== 'all') {
    employees = employees.filter((e) => (e.status ?? 'Active').toLowerCase() === options.status?.toLowerCase())
  }
  if (options?.search) {
    const s = options.search.toLowerCase()
    employees = employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(s) ||
        e.last_name.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(s))
    )
  }

  return employees
}

export async function fetchEmployee(id: string): Promise<Employee> {
  try {
    let { data, error } = await supabase
      .from('employees')
      .select('*, department:departments(*), designation:designations(*), manager:employees(*)')
      .eq('id', id)
      .single()

    if (error) {
      const res = await supabase
        .from('employees')
        .select('*, department:departments(*), designation:designations(*)')
        .eq('id', id)
        .single()
      data = res.data
      error = res.error
    }

    if (error) {
      const res = await supabase.from('employees').select('*').eq('id', id).single()
      data = res.data
      error = res.error
    }

    if (!error && data) return data as Employee
  } catch {}

  const found = getLocalEmployees().find((e) => e.id === id)
  if (found) return found
  throw new Error(`Employee with ID ${id} not found`)
}

async function nextEmployeeCode(input: EmployeeInput): Promise<string> {
  const dept = INITIAL_DEPARTMENTS.find((d) => d.id === input.department_id)
  const deptCode = dept?.code ?? 'ENG'
  const count = getLocalEmployees().length + 1
  return `IND-DL-DEL-HQ-${deptCode}-${String(count).padStart(3, '0')}`
}

function officialEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@oklut.com`
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const code = await nextEmployeeCode(input)
  const email = input.email || officialEmail(input.first_name, input.last_name)

  const payload: Record<string, unknown> = {
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
    branch: input.branch ?? 'HQ',
  }

  let createdEmployee: Employee | null = null

  try {
    let { data, error } = await supabase.from('employees').insert(payload).select().single()
    if (!error && data) {
      createdEmployee = data as Employee
    }
  } catch (err) {
    console.warn('Supabase createEmployee insert skipped/failed:', err)
  }

  if (!createdEmployee) {
    const dept = INITIAL_DEPARTMENTS.find((d) => d.id === input.department_id) ?? null
    const desig = INITIAL_DESIGNATIONS.find((d) => d.id === input.designation_id) ?? null
    createdEmployee = {
      ...payload,
      id: 'emp-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      department: dept,
      designation: desig,
    } as Employee
  }

  const current = getLocalEmployees()
  saveLocalEmployees([createdEmployee, ...current])
  return createdEmployee
}

export async function updateEmployee(id: string, patch: Partial<EmployeeInput>): Promise<Employee> {
  try {
    const { data, error } = await supabase.from('employees').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (!error && data) {
      const current = getLocalEmployees().map((e) => (e.id === id ? { ...e, ...data } : e))
      saveLocalEmployees(current)
      return data as Employee
    }
  } catch {}

  const current = getLocalEmployees().map((e) => (e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e))
  saveLocalEmployees(current)
  return current.find((e) => e.id === id)!
}

export async function deleteEmployee(id: string) {
  try {
    await supabase.from('employees').delete().eq('id', id)
  } catch {}
  const current = getLocalEmployees().filter((e) => e.id !== id)
  saveLocalEmployees(current)
}

export async function deleteEmployeeByIdOrCode(idOrCode: string) {
  const queryStr = idOrCode.trim()
  const current = getLocalEmployees()
  const found = current.find((e) => e.id === queryStr || e.employee_code === queryStr)
  if (!found) {
    throw new Error(`Employee with ID or Code "${queryStr}" not found.`)
  }
  await deleteEmployee(found.id)
  return found
}
