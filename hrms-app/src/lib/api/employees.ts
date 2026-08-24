import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/database.types'

// =============================================================================
// Employee Input Type
// email + phone are MANDATORY — they are unique identifiers.
// employee_code is intentionally OMITTED — the DB trigger auto-generates it
// as OKL-[DEPT]-[YYYY]-[NNN] (e.g. OKL-ENG-2026-042).
// =============================================================================
export interface EmployeeInput {
  first_name: string
  last_name: string
  email: string        // REQUIRED — UNIQUE login key
  phone: string        // REQUIRED — UNIQUE secondary identifier
  gender?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  // Emergency / Guardian Contact
  emergency_contact?: string
  emergency_contact_name?: string
  emergency_contact_relation?: string
  emergency_contact_phone?: string
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  // Current Address
  current_address?: string
  current_city?: string
  current_state?: string
  current_country?: string
  current_postal_code?: string
  // Permanent Address
  permanent_address?: string
  permanent_city?: string
  permanent_state?: string
  permanent_country?: string
  permanent_postal_code?: string
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

// =============================================================================
// FETCH EMPLOYEES
// =============================================================================
export async function fetchEmployees(options?: {
  search?: string
  departmentId?: string
  status?: string
  branch?: string
  roleId?: string
  designationId?: string
  employmentType?: string
}): Promise<Employee[]> {
  try {
    let query = supabase
      .from('employees')
      .select('*, department:departments!department_id(*), designation:designations(*), manager:employees!manager_id(*)')
      .order('created_at', { ascending: false })

    if (options?.departmentId && options.departmentId !== 'all') query = query.eq('department_id', options.departmentId)
    if (options?.status && options.status !== 'all') query = query.eq('status', options.status)
    if (options?.branch && options.branch !== 'all') query = query.ilike('branch', options.branch)
    if (options?.designationId && options.designationId !== 'all') query = query.eq('designation_id', options.designationId)
    if (options?.employmentType && options.employmentType !== 'all') query = query.eq('employment_type', options.employmentType)
    if (options?.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,employee_code.ilike.%${options.search}%,branch.ilike.%${options.search}%`
      )
    }

    let { data, error } = await query

    if (error) {
      // Fallback: drop the manager join if it fails
      const res = await supabase
        .from('employees')
        .select('*, department:departments!department_id(*), designation:designations(*)')
        .order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (error) {
      // Final fallback: plain select
      const res = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    if (!error && data) return data as Employee[]
  } catch (err) {
    console.error('fetchEmployees error:', err)
  }

  return []
}

// =============================================================================
// FETCH SINGLE EMPLOYEE
// =============================================================================
export async function fetchEmployee(id: string): Promise<Employee> {
  let { data, error } = await supabase
    .from('employees')
    .select('*, department:departments!department_id(*), designation:designations(*), manager:employees!manager_id(*)')
    .eq('id', id)
    .single()

  if (error) {
    const res = await supabase.from('employees').select('*').eq('id', id).single()
    data = res.data
    error = res.error
  }

  if (!error && data) return data as Employee
  throw new Error(`Employee with ID ${id} not found in database`)
}

// =============================================================================
// CREATE EMPLOYEE
// employee_code is NOT sent in the payload — the PostgreSQL trigger
// `trg_employees_auto_code` auto-generates it as OKL-[DEPT]-[YYYY]-[NNN].
// Sending a code from the client caused duplicates (count-based generation
// would collide when employees were deleted and re-added at same count).
// =============================================================================
export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  // Build payload — intentionally NO employee_code field.
  // The DB trigger handles it atomically with a sequence (never duplicates).
  const payload: Record<string, unknown> = {
    // Core identity
    first_name:       input.first_name.trim(),
    last_name:        input.last_name.trim(),
    email:            input.email.trim().toLowerCase(),
    phone:            input.phone.trim(),

    // Personal
    gender:           input.gender            || null,
    date_of_birth:    input.date_of_birth     || null,
    marital_status:   input.marital_status    || null,
    blood_group:      input.blood_group       || null,

    // Employment
    joining_date:     input.joining_date || new Date().toISOString().slice(0, 10),
    employment_type:  input.employment_type   || 'Full-time',
    department_id:    input.department_id     || null,
    designation_id:   input.designation_id    || null,
    manager_id:       input.manager_id        || null,
    status:           input.status            || 'Active',
    branch:           input.branch            || 'HQ',

    // Salary
    basic_salary:     input.basic_salary      ?? null,
    hra:              input.hra               ?? null,
    allowances:       input.allowances        ?? null,
    bonus:            input.bonus             ?? null,

    // Addresses
    address:              input.address              || input.current_address       || null,
    city:                 input.city                 || input.current_city          || null,
    state:                input.state                || input.current_state         || null,
    country:              input.country              || input.current_country       || null,
    postal_code:          input.postal_code          || input.current_postal_code   || null,
    current_address:      input.current_address      || input.address               || null,
    current_city:         input.current_city         || input.city                  || null,
    current_state:        input.current_state        || input.state                 || null,
    current_country:      input.current_country      || input.country               || null,
    current_postal_code:  input.current_postal_code  || input.postal_code           || null,
    permanent_address:    input.permanent_address    || input.current_address       || null,
    permanent_city:       input.permanent_city       || input.current_city          || null,
    permanent_state:      input.permanent_state      || input.current_state         || null,
    permanent_country:    input.permanent_country    || input.current_country       || null,
    permanent_postal_code:input.permanent_postal_code|| input.current_postal_code   || null,

    // Emergency / Guardian contact
    emergency_contact:          input.emergency_contact_phone || input.emergency_contact          || null,
    emergency_contact_name:     input.emergency_contact_name  || input.guardian_name              || null,
    emergency_contact_relation: input.emergency_contact_relation || input.guardian_relation       || null,
    emergency_contact_phone:    input.emergency_contact_phone  || input.guardian_phone            || null,
    guardian_name:              input.guardian_name            || input.emergency_contact_name    || null,
    guardian_phone:             input.guardian_phone           || input.emergency_contact_phone   || null,
    guardian_relation:          input.guardian_relation        || input.emergency_contact_relation || null,
  }

  // Attempt 1: Full payload with join select
  const res1 = await supabase
    .from('employees')
    .insert(payload)
    .select('*, department:departments!department_id(*), designation:designations(*)')
    .maybeSingle()

  if (!res1.error && res1.data) return res1.data as Employee

  // Attempt 2: Fallback plain select (no join)
  const res2 = await supabase
    .from('employees')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (!res2.error && res2.data) return res2.data as Employee

  // Attempt 3: If failure was due to missing optional columns (e.g. allowances, basic_salary, branch),
  // strip those optional fields and retry with the base core workforce schema
  const corePayload: Record<string, unknown> = {
    first_name:       input.first_name.trim(),
    last_name:        input.last_name.trim(),
    email:            input.email.trim().toLowerCase(),
    phone:            input.phone.trim(),
    gender:           input.gender || null,
    date_of_birth:    input.date_of_birth || null,
    marital_status:   input.marital_status || null,
    blood_group:      input.blood_group || null,
    address:          input.address || input.current_address || null,
    city:             input.city || input.current_city || null,
    state:            input.state || input.current_state || null,
    country:          input.country || input.current_country || null,
    postal_code:      input.postal_code || input.current_postal_code || null,
    joining_date:     input.joining_date || new Date().toISOString().slice(0, 10),
    employment_type:  input.employment_type || 'Full-time',
    department_id:    input.department_id || null,
    designation_id:   input.designation_id || null,
    manager_id:       input.manager_id || null,
    status:           input.status || 'Active',
  }

  const res3 = await supabase
    .from('employees')
    .insert(corePayload)
    .select('*, department:departments!department_id(*), designation:designations(*)')
    .maybeSingle()

  let createdEmp: Employee | null = null
  if (!res1.error && res1.data) createdEmp = res1.data as Employee
  else if (!res2.error && res2.data) createdEmp = res2.data as Employee
  else if (!res3.error && res3.data) createdEmp = res3.data as Employee

  if (!createdEmp) {
    const err = res3.error || res2.error || res1.error
    console.error('createEmployee failed:', err)
    throw new Error(err?.message || err?.details || 'Failed to create employee. Please ensure email and phone are unique.')
  }

  // Provision Supabase Auth & public.users credentials if password was provided
  if (input.password && input.password.trim()) {
    const pwd = input.password.trim()
    try {
      // 1. Primary: Atomic PostgreSQL RPC provision_employee_login
      const { data: rpcData, error: rpcErr } = await supabase.rpc('provision_employee_login', {
        p_employee_id: createdEmp.id,
        p_email: createdEmp.email,
        p_password: pwd,
        p_role_name: 'Employee',
      })

      if (!rpcErr && rpcData?.success) {
        console.log('Employee portal login successfully provisioned via RPC for:', createdEmp.email)
      } else {
        if (rpcErr) console.warn('provision_employee_login RPC notice:', rpcErr.message)

        // 2. Secondary Fallback: Supabase Auth signUp
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: createdEmp.email,
          password: pwd,
          options: {
            data: {
              name: `${createdEmp.first_name} ${createdEmp.last_name}`,
              employee_id: createdEmp.id,
            },
          },
        })

        if (signUpErr) {
          console.warn('Supabase Auth signUp fallback notice:', signUpErr.message)
        }

        const authUserId = signUpData?.user?.id

        // 3. CRITICAL: Always upsert public.users so login lookup by email works
        // This runs whether or not auth.signUp succeeded.
        const { data: roleData } = await supabase.from('roles').select('id').ilike('name', 'Employee').maybeSingle()
        const empName = `${createdEmp.first_name} ${createdEmp.last_name}`.trim()
        const upsertPayload: Record<string, unknown> = {
          email: createdEmp.email.toLowerCase(),
          role_id: roleData?.id || null,
          employee_id: createdEmp.id,
          status: 'active',
          name: empName,
        }
        if (authUserId) {
          upsertPayload.id = authUserId
          upsertPayload.auth_id = authUserId
          // Link the auth user back to the employee row
          await supabase.from('employees').update({ user_id: authUserId }).eq('id', createdEmp.id)
        }
        const { error: upsertErr } = await supabase.from('users').upsert(upsertPayload, { onConflict: 'email' })
        if (upsertErr) {
          console.warn('public.users upsert notice:', upsertErr.message)
        } else {
          console.log('public.users entry ensured for:', createdEmp.email)
        }
      }
    } catch (authErr) {
      console.error('Failed to provision portal auth user for employee:', authErr)
    }
  }

  return createdEmp
}

// =============================================================================
// UPDATE EMPLOYEE
// =============================================================================
export async function updateEmployee(id: string, patch: Partial<EmployeeInput>): Promise<Employee> {
  const { password, ...dbPatch } = patch
  const { data, error } = await supabase
    .from('employees')
    .update({ ...dbPatch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message || 'Failed to update employee in Supabase')

  const updatedEmp = data as Employee

  if (password && password.trim()) {
    try {
      const { error: rpcErr } = await supabase.rpc('provision_employee_login', {
        p_employee_id: updatedEmp.id,
        p_email: updatedEmp.email,
        p_password: password.trim(),
        p_role_name: 'Employee',
      })
      if (rpcErr) {
        console.warn('Failed to update employee password via RPC:', rpcErr.message)
      }
    } catch (e) {
      console.error('Failed to update employee password:', e)
    }
  }

  return updatedEmp
}

// =============================================================================
// DELETE EMPLOYEE (single by UUID)
// =============================================================================
export async function deleteEmployee(id: string) {
  // Block the linked user account if one exists
  const { data: emp } = await supabase
    .from('employees')
    .select('id, user_id, employee_code, email')
    .eq('id', id)
    .maybeSingle()

  if (emp?.user_id) {
    await supabase.from('users').update({ status: 'Blocked' }).eq('id', emp.user_id)
  }
  if (emp?.email) {
    await supabase.from('users').update({ status: 'Blocked' }).ilike('email', emp.email)
  }

  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) {
    console.error('Supabase employee delete error:', error)
    throw new Error(error.message || 'Failed to delete employee')
  }
}

// =============================================================================
// DELETE EMPLOYEE BY ID OR CODE
// =============================================================================
export async function deleteEmployeeByIdOrCode(idOrCode: string) {
  const queryStr = idOrCode.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryStr)

  let employeeToDelete: {
    id: string
    user_id?: string | null
    first_name: string
    last_name: string
    employee_code?: string | null
    email: string
  } | null = null

  if (isUuid) {
    const { data } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, employee_code, email')
      .eq('id', queryStr)
      .maybeSingle()
    employeeToDelete = data
  } else {
    // Search by employee_code or email (safe string lookup, avoiding invalid UUID syntax error)
    const { data } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, employee_code, email')
      .or(`employee_code.ilike.${queryStr},email.ilike.${queryStr}`)
      .maybeSingle()
    employeeToDelete = data
  }

  if (!employeeToDelete) {
    // Resilient fallback: lookup in list to handle any edge case format
    const { data: all } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, employee_code, email')

    if (all) {
      employeeToDelete =
        all.find(
          (e) =>
            e.id.toLowerCase() === queryStr.toLowerCase() ||
            (e.employee_code && e.employee_code.trim().toLowerCase() === queryStr.toLowerCase()) ||
            (e.email && e.email.trim().toLowerCase() === queryStr.toLowerCase())
        ) || null
    }
  }

  if (!employeeToDelete) {
    throw new Error(`Employee with ID or Code "${queryStr}" not found.`)
  }

  await deleteEmployee(employeeToDelete.id)
  return employeeToDelete
}



